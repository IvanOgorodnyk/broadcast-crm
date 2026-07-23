"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ASSIGNMENT_ROLE_LABEL } from "@/lib/labels";
import type { PayPerson, PayTournament } from "@/types";

export const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Small labelled money delta, hidden when zero. */
function Part({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  const positive = value > 0;
  return (
    <span className={`text-xs ${positive ? "text-gray-500" : "text-brand"}`}>
      {label} {positive ? "+" : "−"}
      {money(Math.abs(value)).slice(1)}
    </span>
  );
}

function TournamentCard({ t, open }: { t: PayTournament; open: boolean }) {
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
          <span className="text-xs text-gray-400">
            {t.disciplineName} · {t.maps} {t.maps === 1 ? "map" : "maps"}
          </span>
        </span>
        <span className="shrink-0 font-bold text-emerald-700">{money(t.total)}</span>
        <span className="shrink-0 text-gray-400">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <table className="w-full border-t border-gray-100 text-sm">
          <tbody>
            {t.lines.map((l, i) => (
              <tr key={`${l.eventId}-${l.role}-${i}`} className="border-t border-gray-50 first:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                  {format(new Date(l.startsAt), "d MMM")}
                </td>
                <td className="px-2 py-2">
                  <div className="text-gray-800">
                    {l.teams.length ? l.teams.join(" vs ") : <span className="text-gray-400">—</span>}
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                      {ASSIGNMENT_ROLE_LABEL[l.role]}
                    </span>
                    <span className="ml-1 text-xs text-gray-400">
                      {l.maps} {l.maps === 1 ? "map" : "maps"}
                      {l.matchFormat ? ` · ${l.matchFormat}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <Part label="base" value={l.base} />
                    <Part label="workload" value={l.workload} />
                    <Part label="substitute" value={l.substitution} />
                    <Part label={l.note ? `adj (${l.note})` : "adj"} value={l.adjustment} />
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-gray-800">
                  {money(l.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Full earnings breakdown for one person. */
export default function PayBreakdown({
  person,
  openFirst = false,
}: {
  person: PayPerson;
  openFirst?: boolean;
}) {
  if (person.tournaments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
        No earnings yet.
      </p>
    );
  }
  const { base, workload, substitution, adjustment } = person.totals;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white">
          {money(person.total)}
        </span>
        <span className="text-sm text-gray-500">
          {person.maps} {person.maps === 1 ? "map" : "maps"}
        </span>
        <span className="flex flex-wrap gap-x-3">
          <Part label="base" value={base} />
          <Part label="workload" value={workload} />
          <Part label="substitute" value={substitution} />
          <Part label="adjustments" value={adjustment} />
        </span>
      </div>
      <div className="space-y-2">
        {person.tournaments.map((t, i) => (
          <TournamentCard key={t.title} t={t} open={openFirst && i === 0} />
        ))}
      </div>
    </div>
  );
}
