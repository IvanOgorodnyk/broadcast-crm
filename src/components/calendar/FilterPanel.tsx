"use client";

import MultiSelect from "./MultiSelect";
import { displayName } from "@/lib/utils";
import { SETUP_LABEL, SETUP_TYPES } from "@/lib/labels";
import type { Meta } from "@/types";

export type Filters = {
  disciplineId: string[];
  studioId: string[];
  channelId: string[];
  discordChannelId: string[];
  streamChannelId: string[];
  setupType: string[];
  casterId: string[];
  analystId: string[];
  staffId: string[];
  participantId: string[];
};

export const emptyFilters: Filters = {
  disciplineId: [],
  studioId: [],
  channelId: [],
  discordChannelId: [],
  streamChannelId: [],
  setupType: [],
  casterId: [],
  analystId: [],
  staffId: [],
  participantId: [],
};

export default function FilterPanel({
  meta,
  filters,
  onChange,
  onClear,
}: {
  meta: Meta | null;
  filters: Filters;
  onChange: (next: Filters) => void;
  onClear: () => void;
}) {
  if (!meta) return <div className="p-4 text-sm text-gray-400">Loading filters…</div>;

  const userOpts = meta.users.map((u) => ({ value: u.id, label: displayName(u) }));
  const set = (key: keyof Filters) => (values: string[]) => onChange({ ...filters, [key]: values });

  const activeCount = Object.values(filters).reduce((n, arr) => n + arr.length, 0);

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 font-semibold text-brand">⛃ Filter</span>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-xs font-medium text-brand hover:underline">
            ⟳ Clear
          </button>
        )}
      </div>

      <MultiSelect
        label="Discipline"
        options={meta.disciplines.map((d) => ({ value: d.id, label: d.name }))}
        selected={filters.disciplineId}
        onChange={set("disciplineId")}
      />
      <MultiSelect
        label="Studio"
        options={meta.studios.map((s) => ({ value: s.id, label: s.name }))}
        selected={filters.studioId}
        onChange={set("studioId")}
      />
      <MultiSelect
        label="Setup"
        options={SETUP_TYPES.map((s) => ({ value: s, label: SETUP_LABEL[s] }))}
        selected={filters.setupType}
        onChange={set("setupType")}
      />
      <MultiSelect
        label="Broadcast channel"
        options={meta.channels.map((c) => ({ value: c.id, label: c.name }))}
        selected={filters.channelId}
        onChange={set("channelId")}
      />
      <MultiSelect
        label="Discord channel"
        options={meta.discordChannels.map((c) => ({ value: c.id, label: c.name }))}
        selected={filters.discordChannelId}
        onChange={set("discordChannelId")}
      />
      <MultiSelect
        label="Streaming channel"
        options={meta.streamChannels.map((c) => ({ value: c.id, label: c.name }))}
        selected={filters.streamChannelId}
        onChange={set("streamChannelId")}
      />
      <MultiSelect
        label="Media Representatives"
        options={meta.participants.media.map((p) => ({ value: p.id, label: p.name }))}
        selected={filters.participantId}
        onChange={set("participantId")}
      />
      <MultiSelect label="Casters" options={userOpts} selected={filters.casterId} onChange={set("casterId")} />
      <MultiSelect label="Analysts" options={userOpts} selected={filters.analystId} onChange={set("analystId")} />
      <MultiSelect label="Staff" options={userOpts} selected={filters.staffId} onChange={set("staffId")} />
    </aside>
  );
}
