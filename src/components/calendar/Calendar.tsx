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
import EventRow from "./EventRow";
import EventModal from "./EventModal";
import DatePicker from "./DatePicker";
import type { CalendarEvent, CalendarView, Meta } from "@/types";

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [date, setDate] = useState<Date>(() => startOfDay(new Date()));
  const [view, setView] = useState<CalendarView>("day");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<CalendarEvent | "new" | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // [from, to) window for the active view.
  const window = useMemo(() => {
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
    params.set("from", window.from.toISOString());
    params.set("to", window.to.toISOString());
    (Object.keys(filters) as (keyof Filters)[]).forEach((key) => {
      filters[key].forEach((v) => params.append(key, v));
    });
    const res = await fetch(`/api/events?${params.toString()}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }, [window, filters]);

  useEffect(() => {
    load();
  }, [load]);

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

  const step = (dir: number) => {
    if (view === "month") setDate((d) => addMonths(d, dir));
    else if (view === "week") setDate((d) => addDays(d, dir * 7));
    else setDate((d) => addDays(d, dir));
  };

  return (
    <div className="flex">
      <FilterPanel
        meta={meta}
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(emptyFilters)}
      />

      <div className="min-w-0 flex-1 p-4">
        {/* Navigation bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
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

        {/* Column header (day view) */}
        {view === "day" && events.length > 0 && (
          <div className="mb-1 grid grid-cols-[120px_1.6fr_90px_1.4fr_110px_1.6fr_1.4fr_100px_1.2fr] gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <span>Discipline</span>
            <span>Event</span>
            <span>Time</span>
            <span>Segment</span>
            <span>Studio</span>
            <span>Casters & Analysts</span>
            <span>Staff</span>
            <span>Channel</span>
            <span>Main & Media</span>
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

        {/* Day view: flat list. Week/Month: grouped by day. */}
        {!loading && view === "day" && (
          <div className="space-y-1.5">
            {events.map((e) => (
              <EventRow key={e.id} event={e} onClick={() => setModal(e)} />
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
                <div className="space-y-1.5">
                  {dayEvents.map((e) => (
                    <EventRow key={e.id} event={e} onClick={() => setModal(e)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && meta && (
        <EventModal
          event={modal}
          meta={meta}
          canEdit={canEdit}
          defaultDate={date}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
