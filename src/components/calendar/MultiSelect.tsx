"use client";

import { useState, useRef, useEffect } from "react";

type Option = { value: string; label: string };

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div ref={ref} className="relative border-b border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50"
      >
        <span className="text-gray-700">
          {label}
          {selected.length > 0 && (
            <span className="ml-2 rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
              {selected.length}
            </span>
          )}
        </span>
        <span className="text-gray-400">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="max-h-56 overflow-auto px-2 pb-2 scroll-thin">
          {options.length === 0 && <p className="px-2 py-1 text-xs text-gray-400">No options</p>}
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="accent-brand"
              />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
