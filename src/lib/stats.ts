import type { Prisma, AssignmentRole } from "@prisma/client";
import { prisma } from "./prisma";
import { ANALYST_ROLES, CASTER_ROLES, DIRECTOR_ROLES, SMM_ROLES } from "./labels";
import type { WorkBucket, WorkPerson, WorkGame } from "@/types";

/** Buckets shown in the work-tracking UI (the roles the user asked to track). */
export const TRACKED_BUCKETS: WorkBucket[] = ["CASTER", "ANALYST", "DIRECTOR", "SMM"];

export const BUCKET_LABEL: Record<WorkBucket, string> = {
  CASTER: "Commentator",
  ANALYST: "Analyst",
  DIRECTOR: "Director",
  SMM: "SMM",
};

const ALL_TRACKED_ROLES: AssignmentRole[] = [
  ...CASTER_ROLES,
  ...ANALYST_ROLES,
  ...DIRECTOR_ROLES,
  ...SMM_ROLES,
];

function bucketOf(role: AssignmentRole): WorkBucket | null {
  if (CASTER_ROLES.includes(role)) return "CASTER";
  if (ANALYST_ROLES.includes(role)) return "ANALYST";
  if (DIRECTOR_ROLES.includes(role)) return "DIRECTOR";
  if (SMM_ROLES.includes(role)) return "SMM";
  return null;
}

const emptyByBucket = (): Record<WorkBucket, number> => ({
  CASTER: 0,
  ANALYST: 0,
  DIRECTOR: 0,
  SMM: 0,
});

export type StatsFilter = {
  userIds?: string[];
  from?: Date;
  to?: Date;
  title?: string;
};

/**
 * Aggregate assignments into per-person work stats: for each person, how many
 * games they worked, broken down by role bucket and grouped by tournament
 * (events sharing a title), with the individual games listed.
 */
export async function computeWorkStats(filter: StatsFilter): Promise<WorkPerson[]> {
  const eventWhere: Prisma.EventWhereInput = {};
  if (filter.title) eventWhere.title = filter.title;
  if (filter.from || filter.to) {
    eventWhere.startsAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lt: filter.to } : {}),
    };
  }

  const where: Prisma.AssignmentWhereInput = {
    role: { in: ALL_TRACKED_ROLES },
    user: { active: true },
    ...(Object.keys(eventWhere).length ? { event: eventWhere } : {}),
  };
  if (filter.userIds) where.userId = { in: filter.userIds };

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      user: { select: { id: true, username: true, name: true, surname: true, avatarUrl: true } },
      event: {
        include: {
          discipline: true,
          participants: { include: { participant: true } },
        },
      },
    },
    orderBy: { event: { startsAt: "desc" } },
  });

  // person id -> aggregation
  const people = new Map<
    string,
    {
      user: WorkPerson["user"];
      games: Set<string>;
      byBucket: Record<WorkBucket, number>;
      bucketGames: Record<WorkBucket, Set<string>>;
      tournaments: Map<
        string,
        {
          title: string;
          disciplineName: string;
          disciplineColor: string;
          lastAt: string;
          byBucket: Record<WorkBucket, number>;
          bucketGames: Record<WorkBucket, Set<string>>;
          games: Map<string, WorkGame>;
        }
      >;
    }
  >();

  for (const a of assignments) {
    const bucket = bucketOf(a.role);
    if (!bucket) continue;
    const e = a.event;

    let p = people.get(a.userId);
    if (!p) {
      p = {
        user: a.user,
        games: new Set(),
        byBucket: emptyByBucket(),
        bucketGames: { CASTER: new Set(), ANALYST: new Set(), DIRECTOR: new Set(), SMM: new Set() },
        tournaments: new Map(),
      };
      people.set(a.userId, p);
    }

    p.games.add(e.id);
    if (!p.bucketGames[bucket].has(e.id)) {
      p.bucketGames[bucket].add(e.id);
      p.byBucket[bucket] += 1;
    }

    let t = p.tournaments.get(e.title);
    if (!t) {
      t = {
        title: e.title,
        disciplineName: e.discipline.name,
        disciplineColor: e.discipline.color,
        lastAt: e.startsAt.toISOString(),
        byBucket: emptyByBucket(),
        bucketGames: { CASTER: new Set(), ANALYST: new Set(), DIRECTOR: new Set(), SMM: new Set() },
        games: new Map(),
      };
      p.tournaments.set(e.title, t);
    }
    if (e.startsAt.toISOString() > t.lastAt) t.lastAt = e.startsAt.toISOString();
    if (!t.bucketGames[bucket].has(e.id)) {
      t.bucketGames[bucket].add(e.id);
      t.byBucket[bucket] += 1;
    }

    let g = t.games.get(e.id);
    if (!g) {
      g = {
        id: e.id,
        startsAt: e.startsAt.toISOString(),
        title: e.title,
        disciplineName: e.discipline.name,
        disciplineColor: e.discipline.color,
        teams: e.participants
          .filter((pp) => pp.participant.type === "MAIN")
          .map((pp) => pp.participant.name),
        matchFormat: e.matchFormat,
        buckets: [],
      };
      t.games.set(e.id, g);
    }
    if (!g.buckets.includes(bucket)) g.buckets.push(bucket);
  }

  const result: WorkPerson[] = [...people.values()].map((p) => ({
    user: p.user,
    totalGames: p.games.size,
    byBucket: p.byBucket,
    tournaments: [...p.tournaments.values()]
      .map((t) => ({
        title: t.title,
        disciplineName: t.disciplineName,
        disciplineColor: t.disciplineColor,
        games: new Set([...t.games.keys()]).size,
        byBucket: t.byBucket,
        lastAt: t.lastAt,
        games_list: [...t.games.values()].sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
      }))
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
  }));

  // Most active first.
  result.sort((a, b) => b.totalGames - a.totalGames || a.user.username.localeCompare(b.user.username));
  return result;
}
