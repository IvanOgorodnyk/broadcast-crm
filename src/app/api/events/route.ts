import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { eventInclude, serializeEvent, eventInputSchema, type EventWithRelations } from "@/lib/events";
import { notify } from "@/lib/notifications";
import { syncEventToGoogle } from "@/lib/integrations/google";

/**
 * GET /api/events?from=ISO&to=ISO&disciplineId=...&studioId=...&channelId=...
 *   &casterId=...&analystId=...&staffId=...&participantId=...
 * Returns events overlapping the [from,to) window, filtered.
 */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const getAll = (k: string) => url.searchParams.getAll(k).filter(Boolean);

  const where: Prisma.EventWhereInput = {};

  if (from && to) {
    // Overlap: event starts before window end AND ends after window start.
    where.startsAt = { lt: new Date(to) };
    where.endsAt = { gt: new Date(from) };
  } else if (from) {
    where.startsAt = { gte: new Date(from) };
  }

  const disciplineIds = getAll("disciplineId");
  if (disciplineIds.length) where.disciplineId = { in: disciplineIds };

  const studioIds = getAll("studioId");
  if (studioIds.length) where.studioId = { in: studioIds };

  const channelIds = getAll("channelId");
  if (channelIds.length) where.channelId = { in: channelIds };

  const setupTypes = getAll("setupType");
  if (setupTypes.length) where.setupType = { in: setupTypes as never };

  // Assignment-based filters (caster/analyst/staff) — match any listed user/role.
  const assignmentFilters: Prisma.EventWhereInput[] = [];
  const casterIds = getAll("casterId");
  if (casterIds.length)
    assignmentFilters.push({ assignments: { some: { role: "CASTER", userId: { in: casterIds } } } });
  const analystIds = getAll("analystId");
  if (analystIds.length)
    assignmentFilters.push({ assignments: { some: { role: "ANALYST", userId: { in: analystIds } } } });
  const staffIds = getAll("staffId");
  if (staffIds.length) assignmentFilters.push({ assignments: { some: { userId: { in: staffIds } } } });
  const mediaIds = getAll("mediaId");
  if (mediaIds.length)
    assignmentFilters.push({
      assignments: { some: { role: "MEDIA_REPRESENTATIVE", userId: { in: mediaIds } } },
    });

  const participantIds = getAll("participantId");
  if (participantIds.length)
    assignmentFilters.push({ participants: { some: { participantId: { in: participantIds } } } });

  if (assignmentFilters.length) where.AND = assignmentFilters;

  const events = await prisma.event.findMany({
    where,
    include: eventInclude,
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ events: events.map(serializeEvent) });
}

/** POST /api/events — create an event (admin/producer only). */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can create events" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = eventInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const event = await prisma.event.create({
    data: {
      title: data.title,
      segment: data.segment || null,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      status: data.status,
      setupType: data.setupType,
      countryTag: data.countryTag || null,
      streamLinks: data.streamLinks || null,
      notes: data.notes || null,
      internalComment: data.internalComment || null,
      color: data.color || null,
      disciplineId: data.disciplineId,
      studioId: data.studioId || null,
      channelId: data.channelId || null,
      createdById: auth.user.id,
      assignments: { create: data.assignments.map((a) => ({ userId: a.userId, role: a.role })) },
      participants: { create: data.participantIds.map((id) => ({ participantId: id })) },
    },
    include: eventInclude,
  });

  // Notify everyone assigned that they're on a new broadcast.
  const recipientIds = event.assignments.map((a) => a.userId);
  await notify({
    recipientIds,
    actorId: auth.user.id,
    eventId: event.id,
    type: "ASSIGNED",
    message: `${auth.user.username} assigned you to "${event.title}"`,
    telegramText: assignedTelegramText(event),
  });

  // Best-effort Google Calendar sync per assignee.
  await syncGoogleForAssignees(event);

  return NextResponse.json({ event: serializeEvent(event) }, { status: 201 });
}

function assignedTelegramText(event: EventWithRelations) {
  return [
    "<b>You have been assigned to a broadcast</b>",
    `Event: ${event.title}`,
    event.segment ? `Segment: ${event.segment}` : null,
    `Time: ${event.startsAt.toISOString()} – ${event.endsAt.toISOString()}`,
    event.studio ? `Studio: ${event.studio.name}` : null,
    event.channel ? `Channel: ${event.channel.name}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function syncGoogleForAssignees(event: EventWithRelations) {
  const userIds = event.assignments.map((a) => a.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, googleRefreshToken: { not: null } },
    select: { id: true, googleRefreshToken: true },
  });
  const tokenByUser = new Map(users.map((u) => [u.id, u.googleRefreshToken!]));
  await Promise.allSettled(
    event.assignments
      .filter((a) => tokenByUser.has(a.userId))
      .map((a) =>
        syncEventToGoogle({ refreshToken: tokenByUser.get(a.userId)!, event, role: a.role })
      )
  );
}
