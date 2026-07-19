import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { eventInclude, serializeEvent } from "@/lib/events";
import { notify } from "@/lib/notifications";
import { syncEventToGoogle, deleteEventFromGoogle } from "@/lib/integrations/google";
import type { AssignmentRole } from "@prisma/client";

const SELF_ASSIGNABLE: AssignmentRole[] = ["CASTER", "ANALYST", "DIRECTOR", "SMM"];

const postSchema = z.object({
  role: z.enum(["CASTER", "ANALYST", "DIRECTOR", "SMM"]),
});

/** POST — the current staff member assigns themselves to the event. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role === "VIEWER") {
    return NextResponse.json({ error: "Viewers cannot join events" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const role = parsed.data.role;

  const me = await prisma.user.findUnique({ where: { id: auth.user.id } });
  if (!me || !me.active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Staff may only join in a position they registered as; admins are unrestricted.
  if (me.role !== "ADMIN" && !me.positions.includes(role)) {
    return NextResponse.json(
      { error: "You can only join in one of your registered positions" },
      { status: 403 }
    );
  }

  const event = await prisma.event.findUnique({ where: { id: params.id }, include: eventInclude });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const already = event.assignments.some((a) => a.userId === me.id && a.role === role);
  if (already) {
    return NextResponse.json({ error: "You are already assigned in this role" }, { status: 409 });
  }

  await prisma.assignment.create({
    data: { eventId: event.id, userId: me.id, role },
  });
  const updated = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
    include: eventInclude,
  });

  await notify({
    recipientIds: [event.createdById],
    actorId: me.id,
    eventId: event.id,
    type: "STAFF_CHANGED",
    message: `${me.username} joined "${event.title}" as ${role.toLowerCase()}`,
  });

  // Sync to the joining user's Google calendar if connected (best-effort).
  if (me.googleRefreshToken) {
    await Promise.allSettled([
      syncEventToGoogle({ refreshToken: me.googleRefreshToken, event: updated, role }),
    ]);
  }

  return NextResponse.json({ event: serializeEvent(updated) });
}

/**
 * DELETE — the current staff member removes themselves from the event.
 * Optional ?role=CASTER removes just that role; otherwise all own assignments.
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const roleParam = new URL(req.url).searchParams.get("role");
  if (roleParam && !SELF_ASSIGNABLE.includes(roleParam as AssignmentRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: params.id }, include: eventInclude });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mine = event.assignments.filter(
    (a) => a.userId === auth.user.id && (!roleParam || a.role === roleParam)
  );
  if (mine.length === 0) {
    return NextResponse.json({ error: "You are not assigned to this event" }, { status: 409 });
  }

  await prisma.assignment.deleteMany({
    where: { id: { in: mine.map((a) => a.id) } },
  });
  const updated = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
    include: eventInclude,
  });

  await notify({
    recipientIds: [event.createdById],
    actorId: auth.user.id,
    eventId: event.id,
    type: "STAFF_CHANGED",
    message: `${auth.user.username} left "${event.title}"`,
  });

  // If they no longer hold any role on this event, drop it from their Google calendar.
  const stillAssigned = updated.assignments.some((a) => a.userId === auth.user.id);
  if (!stillAssigned) {
    const me = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { googleRefreshToken: true },
    });
    if (me?.googleRefreshToken) {
      await Promise.allSettled([deleteEventFromGoogle(me.googleRefreshToken, event.id)]);
    }
  }

  return NextResponse.json({ event: serializeEvent(updated) });
}
