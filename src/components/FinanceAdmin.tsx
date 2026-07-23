"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "./Avatar";
import PayBreakdown, { money } from "./PayBreakdown";
import { displayName } from "@/lib/utils";
import type { PayPerson } from "@/types";

const inputCls =
  "rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-brand";

/** Admin payroll dashboard: everyone's earnings, filterable by event / dates. */
export default function FinanceAdmin() {
  const [people, setPeople] = useState<PayPerson[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
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
      end.setDate(end.getDate() + 1);
      params.set("to", end.toISOString());
    }
    const res = await fetch(`/api/admin/finance?${params.toString()}`);
    const data = await res.json();
    setPeople(data.people ?? []);
    setTitles(data.titles ?? []);
    setGrandTotal(data.grandTotal ?? 0);
    setLoading(false);
  }, [title, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilter = Boolean(title || from || to);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-sm text-gray-500">
          Payroll per map. Emergency cast+direction is the sum of both roles; daily workload
          and late-substitute bonuses are applied automatically.
        </p>
      </div>

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
        <div className="ml-auto text-right">
          <div className="text-xs uppercase tracking-wide text-gray-400">Total payout</div>
          <div className="text-xl font-bold text-emerald-700">{money(grandTotal)}</div>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : people.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-400">
          No earnings for this filter.
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
                      {p.maps} {p.maps === 1 ? "map" : "maps"} ·{" "}
                      {p.tournaments.length} {p.tournaments.length === 1 ? "event" : "events"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white">
                    {money(p.total)}
                  </span>
                  <span className="shrink-0 text-gray-400">{isOpen ? "▾" : "▸"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/60 p-4">
                    <PayBreakdown person={p} openFirst />
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
