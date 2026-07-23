"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { WorkBucket, WorkPerson, WorkTournament } from "@/types";

export const BUCKET_LABEL: Record<WorkBucket, string> = {
  CASTER: "Commentator",
  ANALYST: "Analyst",
  DIRECTOR: "Director",
  SMM: "SMM",
};

const BUCKET_COLOR: Record<WorkBucket, string> = {
  CASTER: "#2563eb",
  ANALYST: "#7c3aed",
  DIRECTOR: "#0d9488",
  SMM: "#db2777",
};

const ORDER: WorkBucket[] = ["CASTER", "ANALYST", "DIRECTOR", "SMM"];

/** Row of "N Commentator · M Analyst …" counters, hiding empty buckets. */
export function BucketChips({
  byBucket,
  size = "md",
}: {
  byBucket: Record<WorkBucket, number>;
  size?: "sm" | "md";
}) {
  const active = ORDER.filter((b) => byBucket[b] > 0);
  if (active.length === 0) return <span className="text-sm text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map((b) => (
        <span
          key={b}
          className={`inline-flex items-center gap-1 rounded-full font-medium text-white ${
            size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
          }`}
          style={{ background: BUCKET_COLOR[b] }}
        >
          <span className="font-bold">{byBucket[b]}</span>
          {BUCKET_LABEL[b]}
        </span>
      ))}
    </div>
  );
}

function TournamentCard({ t, open }: { t: WorkTournament; open: boolean }) {
  const [expanded, setExpanded] = useState(open);
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: t.disciplineColor }}
          title={t.disciplineName}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-gray-800">{t.title}</span>
          <span className="text-xs text-gray-400">{t.disciplineName}</span>
        </span>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
          {t.games} {t.games === 1 ? "game" : "games"}
        </span>
        <span className="hidden shrink-0 sm:block">
          <BucketChips byBucket={t.byBucket} size="sm" />
        </span>
        <span className="shrink-0 text-gray-400">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="sm:hidden px-4 pt-2">
            <BucketChips byBucket={t.byBucket} size="sm" />
          </div>
          <table className="w-full text-sm">
            <tbody>
              {t.games_list.map((g) => (
                <tr key={g.id} className="border-t border-gray-50 first:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                    {format(new Date(g.startsAt), "d MMM, HH:mm")}
                  </td>
                  <td className="px-2 py-2 text-gray-800">
                    {g.teams.length ? g.teams.join(" vs ") : <span className="text-gray-400">—</span>}
                    {g.matchFormat && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                        {g.matchFormat}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="inline-flex flex-wrap justify-end gap-1">
                      {g.buckets.map((b) => (
                        <span
                          key={b}
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          style={{ background: BUCKET_COLOR[b] }}
                        >
                          {BUCKET_LABEL[b]}
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Full breakdown for one person: totals + per-tournament game lists. */
export default function WorkBreakdown({
  person,
  openFirst = false,
}: {
  person: WorkPerson;
  openFirst?: boolean;
}) {
  if (person.totalGames === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
        No games worked yet.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-bold text-white">
          {person.totalGames} {person.totalGames === 1 ? "game" : "games"} total
        </span>
        <BucketChips byBucket={person.byBucket} />
      </div>
      <div className="space-y-2">
        {person.tournaments.map((t, i) => (
          <TournamentCard key={t.title} t={t} open={openFirst && i === 0} />
        ))}
      </div>
    </div>
  );
}
