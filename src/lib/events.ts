import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const eventInclude = {
  discipline: true,
  studio: true,
  channel: true,
  discordChannel: true,
  createdBy: { select: { id: true, username: true } },
  assignments: {
    include: {
      user: {
        select: { id: true, username: true, name: true, surname: true, avatarUrl: true },
      },
    },
  },
  participants: { include: { participant: true } },
  streamChannels: { include: { streamChannel: true } },
} as const;

export type EventWithRelations = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

/** Flatten a Prisma event into the shape the UI consumes. */
export function serializeEvent(e: EventWithRelations) {
  return {
    id: e.id,
    title: e.title,
    segment: e.segment,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    status: e.status,
    setupType: e.setupType,
    countryTag: e.countryTag,
    streamLinks: e.streamLinks,
    notes: e.notes,
    internalComment: e.internalComment,
    color: e.color ?? e.discipline.color,
    discipline: { id: e.discipline.id, name: e.discipline.name, color: e.discipline.color },
    studio: e.studio ? { id: e.studio.id, name: e.studio.name } : null,
    channel: e.channel ? { id: e.channel.id, name: e.channel.name } : null,
    discordChannel: e.discordChannel
      ? { id: e.discordChannel.id, name: e.discordChannel.name }
      : null,
    streamChannels: e.streamChannels.map((s) => ({
      id: s.streamChannel.id,
      name: s.streamChannel.name,
    })),
    createdBy: e.createdBy,
    assignments: e.assignments.map((a) => ({
      id: a.id,
      role: a.role,
      user: a.user,
    })),
    participants: e.participants.map((p) => ({
      id: p.participant.id,
      name: p.participant.name,
      type: p.participant.type,
    })),
  };
}

export type SerializedEvent = ReturnType<typeof serializeEvent>;

export const assignmentSchema = z.object({
  userId: z.string().min(1),
  role: z.enum([
    "CASTER",
    "ANALYST",
    "DIRECTOR",
    "PRODUCER",
    "OBSERVER",
    "REPLAY_OPERATOR",
    "TECHNICAL_STAFF",
    "MEDIA_REPRESENTATIVE",
    "HOST",
    "GUEST",
    "SMM",
  ]),
});

export const eventInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  segment: z.string().optional().nullable(),
  startsAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  endsAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  status: z.enum(["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "CHANGED"]),
  setupType: z.enum(["STUDIO", "REMOTE", "ON_SITE", "HYBRID"]),
  countryTag: z.string().optional().nullable(),
  streamLinks: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalComment: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  disciplineId: z.string().min(1, "Discipline is required"),
  studioId: z.string().optional().nullable(),
  channelId: z.string().optional().nullable(),
  discordChannelId: z.string().optional().nullable(),
  assignments: z.array(assignmentSchema).default([]),
  participantIds: z.array(z.string()).default([]),
  streamChannelIds: z.array(z.string()).default([]),
});

export type EventInput = z.infer<typeof eventInputSchema>;
