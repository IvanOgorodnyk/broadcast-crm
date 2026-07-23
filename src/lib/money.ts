import type { Prisma, AssignmentRole, MatchFormat } from "@prisma/client";
import { prisma } from "./prisma";
import type { PayPerson, PayLine } from "@/types";

/**
 * Payroll rules (confirmed with production):
 *  - Base pay is per MAP: caster $4, director $3, analyst $1.50, guest $2.
 *  - The "emergency" caster+director combo is just the sum of both role rates
 *    ($4 + $3/map) — it falls out of paying each role, no special case.
 *  - Late substitute (<3h before start): +$0.50/map for that person.
 *  - Daily workload bonus, per qualifying format's maps only:
 *      casters:   3+ BO1/day → +$0.25/map,  3+ BO3/day → +$1.00/map
 *      directors: 3+ BO1/day → +$0.25/map,  3+ BO3/day → +$0.50/map
 *  - payAdjustment is a manual $ delta (e.g. deduction from a replaced person).
 */

export const MAP_RATE: Partial<Record<AssignmentRole, number>> = {
  CASTER: 4,
  DIRECTOR: 3,
  ANALYST: 1.5,
  GUEST: 2,
};

/** Roles that draw a base rate — the ones surfaced in the finance UI. */
export const PAID_ROLES = Object.keys(MAP_RATE) as AssignmentRole[];

const SUBSTITUTE_BONUS = 0.5;

// Per-map workload bonus by role → format, once the daily match threshold is hit.
const WORKLOAD: Partial<Record<AssignmentRole, Partial<Record<MatchFormat, number>>>> = {
  CASTER: { BO1: 0.25, BO3: 1 },
  DIRECTOR: { BO1: 0.25, BO3: 0.5 },
};
const WORKLOAD_THRESHOLD = 3;

export function formatMaxMaps(format: MatchFormat | null): number {
  if (format === "BO5") return 5;
  if (format === "BO3") return 3;
  return 1; // BO1 or unspecified
}

export function mapsFor(event: { mapsPlayed: number | null; matchFormat: MatchFormat | null }) {
  return event.mapsPlayed ?? formatMaxMaps(event.matchFormat);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const KYIV_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Kyiv",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type PayFilter = {
  userIds?: string[];
  from?: Date;
  to?: Date;
  title?: string;
};

/** Compute per-person payroll broken down by tournament and game. */
export async function computePayStats(filter: PayFilter): Promise<PayPerson[]> {
  const eventWhere: Prisma.EventWhereInput = {};
  if (filter.title) eventWhere.title = filter.title;
  if (filter.from || filter.to) {
    eventWhere.startsAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lt: filter.to } : {}),
    };
  }

  const where: Prisma.AssignmentWhereInput = {
    role: { in: PAID_ROLES },
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

  // Daily match counts for the workload thresholds: userId|day|role|format → count.
  const dayCounts = new Map<string, number>();
  for (const a of assignments) {
    if (!a.event.matchFormat) continue;
    const day = KYIV_DAY.format(a.event.startsAt);
    const key = `${a.userId}|${day}|${a.role}|${a.event.matchFormat}`;
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const workloadPerMap = (a: (typeof assignments)[number]) => {
    const fmt = a.event.matchFormat;
    if (!fmt) return 0;
    const rate = WORKLOAD[a.role]?.[fmt];
    if (!rate) return 0;
    const day = KYIV_DAY.format(a.event.startsAt);
    const count = dayCounts.get(`${a.userId}|${day}|${a.role}|${fmt}`) ?? 0;
    return count >= WORKLOAD_THRESHOLD ? rate : 0;
  };

  const people = new Map<
    string,
    {
      user: PayPerson["user"];
      totals: PayPerson["totals"];
      tournaments: Map<
        string,
        {
          title: string;
          disciplineName: string;
          disciplineColor: string;
          lastAt: string;
          lines: PayLine[];
        }
      >;
    }
  >();

  for (const a of assignments) {
    const e = a.event;
    const maps = mapsFor(e);
    const base = round2((MAP_RATE[a.role] ?? 0) * maps);
    const workload = round2(workloadPerMap(a) * maps);
    const substitution = a.lateSubstitute ? round2(SUBSTITUTE_BONUS * maps) : 0;
    const adjustment = round2(a.payAdjustment ?? 0);
    const total = round2(base + workload + substitution + adjustment);

    let p = people.get(a.userId);
    if (!p) {
      p = {
        user: a.user,
        totals: { base: 0, workload: 0, substitution: 0, adjustment: 0 },
        tournaments: new Map(),
      };
      people.set(a.userId, p);
    }
    p.totals.base = round2(p.totals.base + base);
    p.totals.workload = round2(p.totals.workload + workload);
    p.totals.substitution = round2(p.totals.substitution + substitution);
    p.totals.adjustment = round2(p.totals.adjustment + adjustment);

    let t = p.tournaments.get(e.title);
    if (!t) {
      t = {
        title: e.title,
        disciplineName: e.discipline.name,
        disciplineColor: e.discipline.color,
        lastAt: e.startsAt.toISOString(),
        lines: [],
      };
      p.tournaments.set(e.title, t);
    }
    if (e.startsAt.toISOString() > t.lastAt) t.lastAt = e.startsAt.toISOString();
    t.lines.push({
      eventId: e.id,
      startsAt: e.startsAt.toISOString(),
      title: e.title,
      disciplineName: e.discipline.name,
      disciplineColor: e.discipline.color,
      teams: e.participants
        .filter((pp) => pp.participant.type === "MAIN")
        .map((pp) => pp.participant.name),
      matchFormat: e.matchFormat,
      maps,
      role: a.role,
      base,
      workload,
      substitution,
      adjustment,
      note: a.payNote ?? null,
      total,
    });
  }

  const result: PayPerson[] = [...people.values()].map((p) => {
    const tournaments = [...p.tournaments.values()]
      .map((t) => ({
        title: t.title,
        disciplineName: t.disciplineName,
        disciplineColor: t.disciplineColor,
        maps: t.lines.reduce((n, l) => n + l.maps, 0),
        total: round2(t.lines.reduce((n, l) => n + l.total, 0)),
        lastAt: t.lastAt,
        lines: t.lines.sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
      }))
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    const total = round2(
      p.totals.base + p.totals.workload + p.totals.substitution + p.totals.adjustment
    );
    return {
      user: p.user,
      total,
      maps: tournaments.reduce((n, t) => n + t.maps, 0),
      totals: p.totals,
      tournaments,
    };
  });

  result.sort((a, b) => b.total - a.total || a.user.username.localeCompare(b.user.username));
  return result;
}
