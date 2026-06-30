"use client";

import { useEffect, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export default function DatePicker({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const [cursor, setCursor] = useState(startOfMonth(value));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-40 mt-1 w-72 rounded-lg border border-gray-100 bg-white p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold">{format(cursor, "MMMM yyyy")}</span>
        <div className="flex gap-1">
          <button onClick={() => setCursor((c) => addMonths(c, -1))} className="px-2 text-brand">↑</button>
          <button onClick={() => setCursor((c) => addMonths(c, 1))} className="px-2 text-brand">↓</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d} className="py-1">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {days.map((d) => {
          const selected = isSameDay(d, value);
          const muted = !isSameMonth(d, cursor);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onChange(d)}
              className={`rounded-full py-1.5 ${
                selected
                  ? "bg-brand font-bold text-white"
                  : muted
                  ? "text-gray-300 hover:bg-gray-50"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onChange(new Date())}
        className="mt-2 w-full rounded-md border border-gray-200 py-1.5 text-sm font-medium hover:bg-gray-50"
      >
        Today
      </button>
    </div>
  );
}
