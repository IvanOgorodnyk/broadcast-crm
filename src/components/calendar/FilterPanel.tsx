"use client";

import MultiSelect from "./MultiSelect";
import { displayName } from "@/lib/utils";
import { LANGUAGES, SETUP_LABEL, SETUP_TYPES } from "@/lib/labels";
import type { Meta } from "@/types";

/** Filter keys map 1:1 to /api/events query params and the calendar columns. */
export type Filters = {
  disciplineId: string[];
  title: string[];
  setupType: string[];
  language: string[];
  streamChannelId: string[];
  casterId: string[];
  analystId: string[];
  directorId: string[];
  smmId: string[];
};

export const emptyFilters: Filters = {
  disciplineId: [],
  title: [],
  setupType: [],
  language: [],
  streamChannelId: [],
  casterId: [],
  analystId: [],
  directorId: [],
  smmId: [],
};

export default function FilterPanel({
  meta,
  filters,
  onChange,
  onClear,
  onCollapse,
}: {
  meta: Meta | null;
  filters: Filters;
  onChange: (next: Filters) => void;
  onClear: () => void;
  onCollapse: () => void;
}) {
  if (!meta) return <div className="w-56 shrink-0 p-4 text-sm text-gray-400">Loading filters…</div>;

  const userOpts = meta.users.map((u) => ({ value: u.id, label: displayName(u) }));
  const set = (key: keyof Filters) => (values: string[]) => onChange({ ...filters, [key]: values });

  const activeCount = Object.values(filters).reduce((n, arr) => n + arr.length, 0);

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="flex items-center gap-2 font-semibold text-brand">⛃ Filter</span>
        {activeCount > 0 && (
          <button onClick={onClear} className="ml-auto text-xs font-medium text-brand hover:underline">
            ⟳ Clear
          </button>
        )}
        <button
          onClick={onCollapse}
          title="Hide filters"
          className={`text-lg leading-none text-gray-400 hover:text-brand ${activeCount > 0 ? "" : "ml-auto"}`}
        >
          «
        </button>
      </div>

      <MultiSelect
        label="Discipline"
        options={meta.disciplines.map((d) => ({ value: d.id, label: d.name }))}
        selected={filters.disciplineId}
        onChange={set("disciplineId")}
      />
      <MultiSelect
        label="Event"
        options={meta.eventTitles.map((t) => ({ value: t, label: t }))}
        selected={filters.title}
        onChange={set("title")}
      />
      <MultiSelect
        label="Setup"
        options={SETUP_TYPES.map((s) => ({ value: s, label: SETUP_LABEL[s] }))}
        selected={filters.setupType}
        onChange={set("setupType")}
      />
      <MultiSelect
        label="Language"
        options={LANGUAGES.map((l) => ({ value: l, label: l }))}
        selected={filters.language}
        onChange={set("language")}
      />
      <MultiSelect
        label="Streaming channel"
        options={meta.streamChannels.map((c) => ({ value: c.id, label: c.name }))}
        selected={filters.streamChannelId}
        onChange={set("streamChannelId")}
      />
      <MultiSelect label="Casters" options={userOpts} selected={filters.casterId} onChange={set("casterId")} />
      <MultiSelect label="Analysts" options={userOpts} selected={filters.analystId} onChange={set("analystId")} />
      <MultiSelect label="Directors" options={userOpts} selected={filters.directorId} onChange={set("directorId")} />
      <MultiSelect label="SMM" options={userOpts} selected={filters.smmId} onChange={set("smmId")} />
    </aside>
  );
}
