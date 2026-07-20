import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { eventInclude, serializeEvent, eventInputSchema, type EventWithRelations } from "@/lib/events";
import { notify } from "@/lib/notifications";
import {
  syncEventToGoogle,
  deleteEventFromGoogle,
  syncEventWithInvites,
  cancelEventInvites,
} from "@/lib/integrations/google";
import { buildCastMessage } from "@/lib/integrations/telegram";
import type { NotificationType } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: eventInclude,
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ event: serializeEvent(event) });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can edit events" }, { status: 403 });
  }

  const existing = await prisma.event.findUnique({
    where: { id: params.id },
    include: eventInclude,
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = eventInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Replace assignments and participants wholesale (simplest correct approach).
  const updated = await prisma.event.update({
    where: { id: params.id },
    data: {
      title: data.title,
      segment: data.segment || null,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      status: data.status,
      setupType: data.setupType,
      matchFormat: data.matchFormat || null,
      countryTag: data.countryTag || null,
      streamLinks: data.streamLinks || null,
      notes: data.notes || null,
      internalComment: data.internalComment || null,
      color: data.color || null,
      disciplineId: data.disciplineId,
      studioId: data.studioId || null,
      channelId: data.channelId || null,
      discordChannelId: data.discordChannelId || null,
      assignments: {
        deleteMany: {},
        create: data.assignments.map((a) => ({ userId: a.userId, role: a.role })),
      },
      participants: {
        deleteMany: {},
        create: data.participantIds.map((id) => ({ participantId: id })),
      },
      streamChannels: {
        deleteMany: {},
        create: data.streamChannelIds.map((id) => ({ streamChannelId: id })),
      },
    },
    include: eventInclude,
  });

  // ---- Compute what changed for targeted notifications ----
  const oldUsers = new Set(existing.assignments.map((a) => a.userId));
  const newUsers = new Set(updated.assignments.map((a) => a.userId));
  const addedUsers = [...newUsers].filter((u) => !oldUsers.has(u));
  const keptUsers = [...newUsers].filter((u) => oldUsers.has(u));
  const removedUsers = [...oldUsers].filter((u) => !newUsers.has(u));

  const timeChanged =
    existing.startsAt.getTime() !== updated.startsAt.getTime() ||
    existing.endsAt.getTime() !== updated.endsAt.getTime();
  const studioChanged = existing.studioId !== updated.studioId;
  const statusChanged = existing.status !== updated.status;
  const staffChanged = addedUsers.length > 0 || removedUsers.length > 0;

  // Newly added people get an "assigned" notification.
  if (addedUsers.length) {
    await notify({
      recipientIds: addedUsers,
      actorId: auth.user.id,
      eventId: updated.id,
      type: "ASSIGNED",
      message: `${auth.user.username} assigned you to "${updated.title}"`,
      telegramText: buildCastMessage(updated, "📌 <b>You've been assigned to a cast</b>"),
    });
  }

  // Existing assignees get a specific change notification.
  let type: NotificationType = "EVENT_UPDATED";
  let detail = "updated";
  if (timeChanged) {
    type = "TIME_CHANGED";
    detail = "changed the time of";
  } else if (studioChanged) {
    type = "STUDIO_CHANGED";
    detail = "changed the studio for";
  } else if (statusChanged) {
    type = "STATUS_CHANGED";
    detail = `set status to ${updated.status} for`;
  } else if (staffChanged) {
    type = "STAFF_CHANGED";
    detail = "updated the staff on";
  }
  if (keptUsers.length) {
    await notify({
      recipientIds: keptUsers,
      actorId: auth.user.id,
      eventId: updated.id,
      type,
      message: `${auth.user.username} ${detail} "${updated.title}"`,
    });
  }

  // Tell removed users they were taken off.
  if (removedUsers.length) {
    await notify({
      recipientIds: removedUsers,
      actorId: auth.user.id,
      eventId: updated.id,
      type: "STAFF_CHANGED",
      message: `${auth.user.username} removed you from "${updated.title}"`,
    });
  }

  // Google Calendar: update the organizer-calendar event (attendees added or
  // removed get emailed); fall back to silent per-user sync if unavailable.
  const invited = await syncEventWithInvites(updated);
  if (!invited) await syncGoogle(updated, removedUsers);

  return NextResponse.json({ event: serializeEvent(updated) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can delete events" }, { status: 403 });
  }

  const existing = await prisma.event.findUnique({
    where: { id: params.id },
    include: eventInclude,
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recipientIds = existing.assignments.map((a) => a.userId);

  // Google Calendar: cancel the organizer event (attendees get a cancellation
  // email); fall back to removing it from each connected user's own calendar.
  const cancelled = await cancelEventInvites(existing);
  if (!cancelled) {
    const users = await prisma.user.findMany({
      where: { id: { in: recipientIds }, googleRefreshToken: { not: null } },
      select: { googleRefreshToken: true },
    });
    await Promise.allSettled(
      users.map((u) => deleteEventFromGoogle(u.googleRefreshToken!, existing.id))
    );
  }

  await prisma.event.delete({ where: { id: params.id } });

  await notify({
    recipientIds,
    actorId: auth.user.id,
    eventId: null,
    type: "EVENT_DELETED",
    message: `${auth.user.username} deleted event "${existing.title}"`,
  });

  return NextResponse.json({ ok: true });
}

async function syncGoogle(event: EventWithRelations, removedUserIds: string[]) {
  const assigneeIds = event.assignments.map((a) => a.userId);
  const allIds = [...new Set([...assigneeIds, ...removedUserIds])];
  const users = await prisma.user.findMany({
    where: { id: { in: allIds }, googleRefreshToken: { not: null } },
    select: { id: true, googleRefreshToken: true },
  });
  const tokenByUser = new Map(users.map((u) => [u.id, u.googleRefreshToken!]));

  await Promise.allSettled([
    ...event.assignments
      .filter((a) => tokenByUser.has(a.userId))
      .map((a) =>
        syncEventToGoogle({ refreshToken: tokenByUser.get(a.userId)!, event, role: a.role })
      ),
    ...removedUserIds
      .filter((id) => tokenByUser.has(id))
      .map((id) => deleteEventFromGoogle(tokenByUser.get(id)!, event.id)),
  ]);
}
