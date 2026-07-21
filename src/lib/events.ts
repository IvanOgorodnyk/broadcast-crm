import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

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
    matchFormat: e.matchFormat,
    countryTag: e.countryTag,
    streamLinks: e.streamLinks,
    cleanFeedYoutube: e.cleanFeedYoutube,
    cleanFeedRtmp: e.cleanFeedRtmp,
    graphicsUrl: e.graphicsUrl,
    notes: e.notes,
    internalComment: e.internalComment,
    color: e.color ?? e.discipline.color,
    discipline: {
      id: e.discipline.id,
      name: e.discipline.name,
      color: e.discipline.color,
      logoUrl: e.discipline.logoUrl,
    },
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
  setupType: z.enum([
    "STUDIO",
    "REMOTE",
    "ON_SITE",
    "HYBRID",
    "PC_DIRECTORS",
    "SERVER_OSTAP",
    "AIRGPU",
  ]),
  matchFormat: z.enum(["BO1", "BO3", "BO5"]).optional().nullable(),
  countryTag: z.string().optional().nullable(),
  streamLinks: z.string().optional().nullable(),
  cleanFeedYoutube: z.string().optional().nullable(),
  cleanFeedRtmp: z.string().optional().nullable(),
  graphicsUrl: z.string().optional().nullable(),
  // Match teams by name; upserted as MAIN participants server-side.
  teams: z.array(z.string().trim().max(120)).max(2).default([]),
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

/** Upsert MAIN participants for the given team names and return their ids. */
export async function resolveTeamIds(teams: string[]): Promise<string[]> {
  const names = teams.map((t) => t.trim()).filter(Boolean);
  const ids: string[] = [];
  for (const name of names) {
    const p = await prisma.participant.upsert({
      where: { name_type: { name, type: "MAIN" } },
      create: { name, type: "MAIN" },
      update: {},
    });
    ids.push(p.id);
  }
  return ids;
}
