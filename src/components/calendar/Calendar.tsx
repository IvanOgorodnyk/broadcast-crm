"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import FilterPanel, { emptyFilters, type Filters } from "./FilterPanel";
import EventRow, { GAME_COLS, DISCIPLINE_COL, EVENT_COL } from "./EventRow";
import EventModal from "./EventModal";
import DatePicker from "./DatePicker";
import type { CalendarEvent, CalendarView, Meta, Viewer } from "@/types";

export default function Calendar({ canEdit, viewer }: { canEdit: boolean; viewer: Viewer }) {
  const [date, setDate] = useState<Date>(() => startOfDay(new Date()));
  const [view, setView] = useState<CalendarView>("day");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<CalendarEvent | "new" | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  // Filters are collapsible so the wide grid gets the full window on laptops.
  const [showFilters, setShowFilters] = useState(true);

  // [from, to) window for the active view.
  const range = useMemo(() => {
    if (view === "day") return { from: startOfDay(date), to: addDays(startOfDay(date), 1) };
    if (view === "week") {
      const from = startOfWeek(date, { weekStartsOn: 1 });
      return { from, to: addDays(from, 7) };
    }
    return { from: startOfMonth(date), to: addDays(endOfMonth(date), 1) };
  }, [date, view]);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  // Deep link from notifications: /calendar?event=<id> opens that event.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("event");
    if (!id) return;
    fetch(`/api/events/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.event) {
          setDate(startOfDay(new Date(data.event.startsAt)));
          setModal(data.event);
        }
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
    (Object.keys(filters) as (keyof Filters)[]).forEach((key) => {
      filters[key].forEach((v) => params.append(key, v));
    });
    const res = await fetch(`/api/events?${params.toString()}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }, [range, filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Group same-tournament games (same title + discipline) into one visual row.
  const byTournament = useCallback((list: CalendarEvent[]) => {
    const groups: CalendarEvent[][] = [];
    const index = new Map<string, number>();
    for (const e of list) {
      const key = `${e.title}|${e.discipline.id}`;
      const i = index.get(key);
      if (i === undefined) {
        index.set(key, groups.length);
        groups.push([e]);
      } else {
        groups[i].push(e);
      }
    }
    return groups;
  }, []);

  // Group events by calendar day (for week/month agenda views).
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = format(new Date(e.startsAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).reduce((n, arr) => n + arr.length, 0),
    [filters]
  );

  const step = (dir: number) => {
    if (view === "month") setDate((d) => addMonths(d, dir));
    else if (view === "week") setDate((d) => addDays(d, dir * 7));
    else setDate((d) => addDays(d, dir));
  };

  return (
    <div className="flex">
      {showFilters && (
        <FilterPanel
          meta={meta}
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(emptyFilters)}
          onCollapse={() => setShowFilters(false)}
        />
      )}

      <div className="min-w-0 flex-1 p-4">
        {/* Navigation bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {!showFilters && (
            <button
              onClick={() => setShowFilters(true)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-brand hover:bg-gray-50"
              title="Show filters"
            >
              ⛃ Filters
              {activeFilterCount > 0 && (
                <span className="ml-1.5 rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setDate(startOfDay(new Date()))}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            Today
          </button>
          <button onClick={() => step(-1)} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-brand hover:bg-gray-50">
            ←
          </button>
          <button onClick={() => step(1)} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-brand hover:bg-gray-50">
            →
          </button>

          <div className="relative">
            <button
              onClick={() => setShowPicker((s) => !s)}
              className="rounded-md border border-brand bg-red-50 px-3 py-1.5 text-sm font-semibold text-brand"
            >
              {format(date, view === "month" ? "MMMM yyyy" : "d MMMM yyyy")} ▾
            </button>
            {showPicker && (
              <DatePicker
                value={date}
                onChange={(d) => {
                  setDate(startOfDay(d));
                  setShowPicker(false);
                }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-md border border-gray-200 bg-white p-0.5">
            {(["day", "week", "month"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-3 py-1 text-sm font-medium capitalize ${
                  view === v ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {canEdit && (
            <button
              onClick={() => setModal("new")}
              className="rounded-md bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              + New event
            </button>
          )}
        </div>

        {/* Wide grid scrolls horizontally only on genuinely narrow screens. */}
        <div className="overflow-x-auto scroll-thin">
        <div className="min-w-[920px]">

        {/* Column header (day view) */}
        {view === "day" && events.length > 0 && (
          <div className="mb-1 flex gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <span className={`${DISCIPLINE_COL} shrink-0 px-1`}>Discipline</span>
            <span className={`${EVENT_COL} shrink-0 px-1`}>Event</span>
            <div className={`grid ${GAME_COLS} min-w-0 flex-1 gap-1.5`}>
              <span className="pl-1">Time</span>
              <span>Games</span>
              <span>Setup</span>
              <span>Casters & Analysts</span>
              <span>Directors</span>
              <span>SMM</span>
              <span>Channels</span>
            </div>
          </div>
        )}

        {loading && <p className="px-3 py-6 text-sm text-gray-400">Loading events…</p>}

        {!loading && events.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-400">
            No events for this {view}.
            {canEdit && (
              <button onClick={() => setModal("new")} className="ml-1 font-medium text-brand hover:underline">
                Create one
              </button>
            )}
          </div>
        )}

        {/* Day view: tournament groups. Week/Month: grouped by day, then tournament. */}
        {!loading && view === "day" && (
          <div className="space-y-2">
            {byTournament(events).map((group) => (
              <EventRow key={group[0].id} events={group} onOpen={setModal} />
            ))}
          </div>
        )}

        {!loading && view !== "day" && (
          <div className="space-y-5">
            {grouped.map(([day, dayEvents]) => (
              <div key={day}>
                <h3 className="mb-1.5 text-sm font-bold text-gray-700">
                  {format(new Date(day), "EEEE, d MMMM")}
                </h3>
                <div className="space-y-2">
                  {byTournament(dayEvents).map((group) => (
                    <EventRow key={group[0].id} events={group} onOpen={setModal} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        </div>
        </div>
      </div>

      {modal && meta && (
        <EventModal
          event={modal}
          meta={meta}
          canEdit={canEdit}
          viewer={viewer}
          defaultDate={date}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
