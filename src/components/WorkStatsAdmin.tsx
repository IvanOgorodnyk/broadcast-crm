"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "./Avatar";
import WorkBreakdown, { BucketChips } from "./WorkBreakdown";
import { displayName } from "@/lib/utils";
import type { WorkPerson } from "@/types";

const inputCls =
  "rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-brand";

/** Admin work-tracking dashboard: every staffer's games, filterable. */
export default function WorkStatsAdmin() {
  const [people, setPeople] = useState<WorkPerson[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) {
      const end = new Date(to);
      end.setDate(end.getDate() + 1); // inclusive day
      params.set("to", end.toISOString());
    }
    const res = await fetch(`/api/admin/stats?${params.toString()}`);
    const data = await res.json();
    setPeople(data.people ?? []);
    setTitles(data.titles ?? []);
    setLoading(false);
  }, [title, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const games = people.reduce((n, p) => n + p.totalGames, 0);
    return { staff: people.length, games };
  }, [people]);

  const hasFilter = Boolean(title || from || to);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Work tracking</h1>
        <p className="text-sm text-gray-500">
          How many games each person worked, by role and tournament.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Event</span>
          <select className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)}>
            <option value="">All events</option>
            {titles.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">From</span>
          <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">To</span>
          <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {hasFilter && (
          <button
            onClick={() => {
              setTitle("");
              setFrom("");
              setTo("");
            }}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/5"
          >
            Clear
          </button>
        )}
        <div className="ml-auto flex gap-4 text-sm">
          <span>
            <span className="font-bold">{totals.staff}</span>{" "}
            <span className="text-gray-500">people</span>
          </span>
          <span>
            <span className="font-bold">{totals.games}</span>{" "}
            <span className="text-gray-500">game slots</span>
          </span>
        </div>
      </div>

      {/* People */}
      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : people.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-400">
          No work recorded for this filter.
        </p>
      ) : (
        <div className="space-y-2">
          {people.map((p) => {
            const isOpen = open === p.user.id;
            return (
              <div key={p.user.id} className="rounded-lg border border-gray-200 bg-white">
                <button
                  onClick={() => setOpen(isOpen ? null : p.user.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <Avatar
                    name={p.user.name}
                    surname={p.user.surname}
                    username={p.user.username}
                    avatarUrl={p.user.avatarUrl}
                    size={36}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-gray-800">
                      {displayName(p.user)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {p.tournaments.length} {p.tournaments.length === 1 ? "event" : "events"}
                    </span>
                  </span>
                  <span className="hidden shrink-0 md:block">
                    <BucketChips byBucket={p.byBucket} size="sm" />
                  </span>
                  <span className="shrink-0 rounded-lg bg-gray-900 px-3 py-1 text-sm font-bold text-white">
                    {p.totalGames}
                  </span>
                  <span className="shrink-0 text-gray-400">{isOpen ? "▾" : "▸"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/60 p-4">
                    <WorkBreakdown person={p} openFirst />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
