"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { displayName, hhmm } from "@/lib/utils";
import {
  ASSIGNMENT_ROLES,
  ASSIGNMENT_ROLE_LABEL,
  BLOCK_COLORS,
  LANGUAGES,
  SETUP_LABEL,
  SETUP_TYPES,
  STAFF_POSITION_LABEL,
} from "@/lib/labels";
import type { CalendarEvent, Meta, MetaUser, Viewer } from "@/types";
import type { AssignmentRole } from "@prisma/client";

type Draft = {
  id?: string;
  title: string;
  segment: string;
  teamA: string;
  teamB: string;
  startsAt: string; // datetime-local value
  endsAt: string;
  status: string;
  setupType: string;
  matchFormat: string;
  countryTag: string;
  disciplineId: string;
  studioId: string;
  channelId: string;
  discordChannelId: string;
  streamLinks: string;
  cleanFeedYoutube: string;
  cleanFeedRtmp: string;
  graphicsUrl: string;
  notes: string;
  internalComment: string;
  color: string;
  assignments: { userId: string; role: AssignmentRole }[];
  participantIds: string[];
  streamChannelIds: string[];
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function emptyDraft(meta: Meta, defaultDate: Date): Draft {
  const start = new Date(defaultDate);
  start.setHours(19, 0, 0, 0);
  const end = new Date(defaultDate);
  end.setHours(22, 0, 0, 0);
  return {
    title: "",
    segment: "",
    teamA: "",
    teamB: "",
    startsAt: toLocalInput(start.toISOString()),
    endsAt: toLocalInput(end.toISOString()),
    status: "CONFIRMED",
    setupType: "PC_DIRECTORS",
    matchFormat: "",
    countryTag: "",
    disciplineId: meta.disciplines[0]?.id ?? "",
    studioId: "",
    channelId: "",
    discordChannelId: "",
    streamLinks: "",
    cleanFeedYoutube: "",
    cleanFeedRtmp: "",
    graphicsUrl: "",
    notes: "",
    internalComment: "",
    color: "",
    assignments: [],
    participantIds: [],
    streamChannelIds: [],
  };
}

function fromEvent(e: CalendarEvent): Draft {
  const teams = e.participants.filter((p) => p.type === "MAIN");
  return {
    id: e.id,
    title: e.title,
    segment: e.segment ?? "",
    teamA: teams[0]?.name ?? "",
    teamB: teams[1]?.name ?? "",
    startsAt: toLocalInput(e.startsAt),
    endsAt: toLocalInput(e.endsAt),
    status: e.status,
    setupType: e.setupType,
    matchFormat: e.matchFormat ?? "",
    countryTag: e.countryTag ?? "",
    disciplineId: e.discipline.id,
    studioId: e.studio?.id ?? "",
    channelId: e.channel?.id ?? "",
    discordChannelId: e.discordChannel?.id ?? "",
    streamLinks: e.streamLinks ?? "",
    cleanFeedYoutube: e.cleanFeedYoutube ?? "",
    cleanFeedRtmp: e.cleanFeedRtmp ?? "",
    graphicsUrl: e.graphicsUrl ?? "",
    notes: e.notes ?? "",
    internalComment: e.internalComment ?? "",
    color: e.color ?? "",
    assignments: e.assignments.map((a) => ({ userId: a.user.id, role: a.role })),
    // Media participants ride along untouched; MAIN teams are edited via teamA/teamB.
    participantIds: e.participants.filter((p) => p.type === "MEDIA").map((p) => p.id),
    streamChannelIds: e.streamChannels.map((s) => s.id),
  };
}

export default function EventModal({
  event,
  meta,
  canEdit,
  viewer,
  defaultDate,
  onClose,
  onSaved,
}: {
  event: CalendarEvent | "new";
  meta: Meta;
  canEdit: boolean;
  viewer: Viewer;
  defaultDate: Date;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = event === "new";
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState<Draft>(
    isNew ? emptyDraft(meta, defaultDate) : fromEvent(event)
  );
  // Live copy of the event for the read view (updated after join/leave).
  const [current, setCurrent] = useState<CalendarEvent | null>(isNew ? null : event);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      title: draft.title,
      segment: draft.segment,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      status: draft.status,
      setupType: draft.setupType,
      matchFormat: draft.matchFormat || null,
      countryTag: draft.countryTag,
      disciplineId: draft.disciplineId,
      studioId: draft.studioId || null,
      channelId: draft.channelId || null,
      discordChannelId: draft.discordChannelId || null,
      streamLinks: draft.streamLinks,
      cleanFeedYoutube: draft.cleanFeedYoutube,
      cleanFeedRtmp: draft.cleanFeedRtmp,
      graphicsUrl: draft.graphicsUrl,
      notes: draft.notes,
      internalComment: draft.internalComment,
      color: draft.color || null,
      assignments: draft.assignments.filter((a) => a.userId),
      participantIds: draft.participantIds,
      teams: [draft.teamA, draft.teamB].map((t) => t.trim()).filter(Boolean),
      streamChannelIds: draft.streamChannelIds,
    };
    const url = draft.id ? `/api/events/${draft.id}` : "/api/events";
    const res = await fetch(url, {
      method: draft.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
    }
  }

  async function remove() {
    if (!draft.id) return;
    if (!confirm("Delete this event? Assigned staff will be notified.")) return;
    setSaving(true);
    const res = await fetch(`/api/events/${draft.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setError("Failed to delete");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-bold">
            {isNew ? "New event" : editing ? "Edit event" : "Event details"}
          </h2>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-200"
              >
                Edit
              </button>
            )}
            <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>
        </div>

        {editing ? (
          <EditForm
            draft={draft}
            meta={meta}
            set={set}
            error={error}
          />
        ) : (
          current && (
            <ReadView
              event={current}
              viewer={viewer}
              canEdit={canEdit}
              onChanged={(e) => {
                setCurrent(e);
                onSaved();
              }}
            />
          )
        )}

        {editing && (
          <div className="flex items-center justify-between border-t px-5 py-3">
            {draft.id ? (
              <button
                onClick={remove}
                disabled={saving}
                className="text-sm font-medium text-brand hover:underline"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                onClick={isNew ? onClose : () => setEditing(false)}
                className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !draft.title}
                className="rounded bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand";

function EditForm({
  draft,
  meta,
  set,
  error,
}: {
  draft: Draft;
  meta: Meta;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  error: string | null;
}) {
  function addAssignment() {
    set("assignments", [...draft.assignments, { userId: "", role: "CASTER" }]);
  }
  function updateAssignment(i: number, patch: Partial<{ userId: string; role: AssignmentRole }>) {
    set(
      "assignments",
      draft.assignments.map((a, idx) => (idx === i ? { ...a, ...patch } : a))
    );
  }
  function removeAssignment(i: number) {
    set("assignments", draft.assignments.filter((_, idx) => idx !== i));
  }

  return (
    <div className="max-h-[70vh] space-y-4 overflow-auto px-5 py-4 scroll-thin">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-brand">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Event title">
          <input
            className={inputCls}
            list="event-titles"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Select or type a new one"
          />
          <datalist id="event-titles">
            {meta.eventTitles.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <Field label="Discipline">
          <select className={inputCls} value={draft.disciplineId} onChange={(e) => set("disciplineId", e.target.value)}>
            {meta.disciplines.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Match (Team vs Team)">
        <div className="flex items-center gap-2">
          <input className={inputCls} value={draft.teamA} onChange={(e) => set("teamA", e.target.value)} placeholder="Team A" />
          <span className="shrink-0 text-sm font-semibold text-gray-400">vs</span>
          <input className={inputCls} value={draft.teamB} onChange={(e) => set("teamB", e.target.value)} placeholder="Team B" />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start">
          <input type="datetime-local" className={inputCls} value={draft.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </Field>
        <Field label="End">
          <input type="datetime-local" className={inputCls} value={draft.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Setup">
          <select className={inputCls} value={draft.setupType} onChange={(e) => set("setupType", e.target.value)}>
            {SETUP_TYPES.map((s) => (
              <option key={s} value={s}>{SETUP_LABEL[s]}</option>
            ))}
            {!SETUP_TYPES.includes(draft.setupType as (typeof SETUP_TYPES)[number]) && (
              <option value={draft.setupType}>
                {SETUP_LABEL[draft.setupType as keyof typeof SETUP_LABEL] ?? draft.setupType}
              </option>
            )}
          </select>
        </Field>
        <Field label="Match format">
          <select className={inputCls} value={draft.matchFormat} onChange={(e) => set("matchFormat", e.target.value)}>
            <option value="">—</option>
            {["BO1", "BO3", "BO5"].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <select className={inputCls} value={draft.countryTag} onChange={(e) => set("countryTag", e.target.value)}>
            <option value="">—</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Streaming channels">
        <div className="flex flex-wrap gap-2 pt-1">
          {meta.streamChannels.length === 0 && <span className="text-sm text-gray-400">None configured</span>}
          {meta.streamChannels.map((c) => {
            const on = draft.streamChannelIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  set(
                    "streamChannelIds",
                    on
                      ? draft.streamChannelIds.filter((id) => id !== c.id)
                      : [...draft.streamChannelIds, c.id]
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs ${
                  on ? "border-brand bg-brand text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Color of blocks">
        <div className="flex flex-wrap items-center gap-2">
          {BLOCK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set("color", c)}
              aria-label={c}
              className={`h-7 w-7 rounded-full ring-2 ring-offset-2 transition ${
                draft.color.toLowerCase() === c.toLowerCase() ? "ring-gray-700" : "ring-transparent hover:ring-gray-300"
              }`}
              style={{ background: c }}
            />
          ))}
          <label className="ml-1 flex items-center gap-1.5 text-xs text-gray-500">
            Custom
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(draft.color) ? draft.color : "#16a3e0"}
              onChange={(e) => set("color", e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
            />
          </label>
          {draft.color && (
            <button type="button" onClick={() => set("color", "")} className="text-xs text-gray-400 hover:text-brand">
              Reset
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-400">Defaults to the discipline color when empty.</p>
      </Field>

      {/* Assignments */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Staff assignment</span>
          <button onClick={addAssignment} className="text-xs font-medium text-brand hover:underline">
            + Add person
          </button>
        </div>
        <div className="space-y-2">
          {draft.assignments.length === 0 && (
            <p className="text-sm text-gray-400">No one assigned yet.</p>
          )}
          {draft.assignments.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <UserSelect
                  users={meta.users}
                  value={a.userId}
                  onChange={(id) => updateAssignment(i, { userId: id })}
                />
              </div>
              <select
                className={inputCls + " w-48 shrink-0"}
                value={a.role}
                onChange={(e) => updateAssignment(i, { role: e.target.value as AssignmentRole })}
              >
                {ASSIGNMENT_ROLES.map((r) => (
                  <option key={r} value={r}>{ASSIGNMENT_ROLE_LABEL[r]}</option>
                ))}
              </select>
              <button
                onClick={() => removeAssignment(i)}
                className="px-2 text-lg leading-none text-gray-400 hover:text-brand"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Clean feed for the director */}
      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Clean feed link (for the director)
        </span>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-gray-500">YouTube</span>
            <input className={inputCls} value={draft.cleanFeedYoutube} onChange={(e) => set("cleanFeedYoutube", e.target.value)} placeholder="https://youtube.com/…" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-gray-500">RTMP</span>
            <input className={inputCls} value={draft.cleanFeedRtmp} onChange={(e) => set("cleanFeedRtmp", e.target.value)} placeholder="rtmp://…" />
          </div>
        </div>
      </div>

      <Field label="Graphics (Google Drive folder)">
        <input className={inputCls} value={draft.graphicsUrl} onChange={(e) => set("graphicsUrl", e.target.value)} placeholder="https://drive.google.com/…" />
      </Field>

      <Field label="Notes">
        <textarea className={inputCls} rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <Field label="Internal comment">
        <textarea className={inputCls} rows={2} value={draft.internalComment} onChange={(e) => set("internalComment", e.target.value)} />
      </Field>
    </div>
  );
}

/** Person picker with avatars in the dropdown (replaces a plain <select>). */
function UserSelect({
  users,
  value,
  onChange,
}: {
  users: MetaUser[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = users.find((u) => u.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={inputCls + " flex items-center gap-2 text-left"}
      >
        {selected ? (
          <>
            <Avatar name={selected.name} surname={selected.surname} username={selected.username} avatarUrl={selected.avatarUrl} size={24} />
            <span className="truncate">{displayName(selected)}</span>
          </>
        ) : (
          <span className="text-gray-400">Select a person…</span>
        )}
        <span className="ml-auto shrink-0 text-gray-400">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg scroll-thin">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onChange(u.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  u.id === value ? "bg-brand/5" : ""
                }`}
              >
                <Avatar name={u.name} surname={u.surname} username={u.username} avatarUrl={u.avatarUrl} size={28} />
                <span className="truncate">{displayName(u)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReadView({
  event,
  viewer,
  canEdit,
  onChanged,
}: {
  event: CalendarEvent;
  viewer: Viewer;
  canEdit: boolean;
  onChanged: (e: CalendarEvent) => void;
}) {
  return (
    <div className="max-h-[70vh] space-y-4 overflow-auto px-5 py-4 scroll-thin">
      <div className="flex items-center gap-2">
        <span className="rounded px-2 py-0.5 text-sm font-bold text-white" style={{ background: event.color }}>
          {event.discipline.name}
        </span>
        {event.matchFormat && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
            {event.matchFormat}
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold">{event.title}</h3>
      {(() => {
        const teams = event.participants.filter((p) => p.type === "MAIN").map((p) => p.name);
        return teams.length > 0 ? (
          <p className="text-gray-600">{teams.join(" vs ")}</p>
        ) : event.segment ? (
          <p className="text-gray-600">{event.segment}</p>
        ) : null;
      })()}

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Time" value={`${hhmm(event.startsAt)} – ${hhmm(event.endsAt)}`} />
        <Info label="Setup" value={SETUP_LABEL[event.setupType]} />
        <Info label="Language" value={event.countryTag ?? "—"} />
        <Info
          label="Streaming"
          value={event.streamChannels.length ? event.streamChannels.map((s) => s.name).join(", ") : "—"}
        />
      </dl>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Assigned staff</p>
        <div className="space-y-1">
          {event.assignments.length === 0 && <p className="text-sm text-gray-400">No one assigned.</p>}
          {event.assignments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <Avatar name={a.user.name} surname={a.user.surname} username={a.user.username} avatarUrl={a.user.avatarUrl} size={24} />
              <span className="font-medium">{displayName(a.user)}</span>
              <span className="text-gray-400">— {ASSIGNMENT_ROLE_LABEL[a.role]}</span>
              {a.user.id === viewer.id && <span className="text-xs text-brand">(you)</span>}
            </div>
          ))}
        </div>
      </div>

      {!canEdit && viewer.role === "STAFF" && (
        <SelfAssign event={event} viewer={viewer} onChanged={onChanged} />
      )}

      {(event.cleanFeedYoutube || event.cleanFeedRtmp) && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Clean feed (for the director)</p>
          <div className="space-y-1.5">
            {event.cleanFeedYoutube && <CopyRow label="YouTube" value={event.cleanFeedYoutube} />}
            {event.cleanFeedRtmp && <CopyRow label="RTMP" value={event.cleanFeedRtmp} />}
          </div>
        </div>
      )}
      {event.graphicsUrl && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Graphics</p>
          <a href={event.graphicsUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
            Open Google Drive folder ↗
          </a>
        </div>
      )}
      {event.notes && <Info label="Notes" value={event.notes} />}
      {event.internalComment && <Info label="Internal comment" value={event.internalComment} />}
    </div>
  );
}

/** Staff self-assignment: join the event in one of your positions, or leave it. */
function SelfAssign({
  event,
  viewer,
  onChanged,
}: {
  event: CalendarEvent;
  viewer: Viewer;
  onChanged: (e: CalendarEvent) => void;
}) {
  const mine = event.assignments.filter((a) => a.user.id === viewer.id);
  const availableRoles = viewer.positions.filter(
    (p) => !mine.some((a) => a.role === p)
  );
  const [role, setRole] = useState<AssignmentRole | "">(availableRoles[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (!role) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}/self-assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      onChanged(data.event);
      const left = viewer.positions.filter(
        (p) => p !== role && !mine.some((a) => a.role === p)
      );
      setRole(left[0] ?? "");
    } else {
      setError(data.error ?? "Failed to join");
    }
  }

  async function leave(r: AssignmentRole) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}/self-assign?role=${r}`, {
      method: "DELETE",
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      onChanged(data.event);
      if (!role) setRole(r);
    } else {
      setError(data.error ?? "Failed to leave");
    }
  }

  if (viewer.positions.length === 0) return null;

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase text-gray-500">My participation</p>

      {mine.length > 0 && (
        <div className="mb-2 space-y-1">
          {mine.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span>
                You are on this event as{" "}
                <span className="font-medium">{ASSIGNMENT_ROLE_LABEL[a.role]}</span>
              </span>
              <button
                onClick={() => leave(a.role)}
                disabled={busy}
                className="text-sm font-medium text-brand hover:underline disabled:opacity-60"
              >
                Leave
              </button>
            </div>
          ))}
        </div>
      )}

      {availableRoles.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
            value={role}
            onChange={(e) => setRole(e.target.value as AssignmentRole)}
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {STAFF_POSITION_LABEL[r] ?? ASSIGNMENT_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <button
            onClick={join}
            disabled={busy || !role}
            className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "…" : "Join"}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-brand">{error}</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}

/** A labelled link with a copy-to-clipboard button (clean feed for directors). */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-semibold text-gray-500">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{value}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            },
            () => {}
          );
        }}
        className="shrink-0 rounded border border-gray-200 px-2 py-1 text-xs font-medium hover:bg-gray-50"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
