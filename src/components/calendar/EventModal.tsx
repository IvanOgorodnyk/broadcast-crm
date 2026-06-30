"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { displayName, hhmm } from "@/lib/utils";
import {
  ASSIGNMENT_ROLES,
  ASSIGNMENT_ROLE_LABEL,
  SETUP_LABEL,
  SETUP_TYPES,
  STATUS_LABEL,
  STATUSES,
  STATUS_COLOR,
} from "@/lib/labels";
import type { CalendarEvent, Meta } from "@/types";
import type { AssignmentRole } from "@prisma/client";

type Draft = {
  id?: string;
  title: string;
  segment: string;
  startsAt: string; // datetime-local value
  endsAt: string;
  status: string;
  setupType: string;
  countryTag: string;
  disciplineId: string;
  studioId: string;
  channelId: string;
  streamLinks: string;
  notes: string;
  internalComment: string;
  color: string;
  assignments: { userId: string; role: AssignmentRole }[];
  participantIds: string[];
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
    startsAt: toLocalInput(start.toISOString()),
    endsAt: toLocalInput(end.toISOString()),
    status: "DRAFT",
    setupType: "STUDIO",
    countryTag: "",
    disciplineId: meta.disciplines[0]?.id ?? "",
    studioId: "",
    channelId: "",
    streamLinks: "",
    notes: "",
    internalComment: "",
    color: "",
    assignments: [],
    participantIds: [],
  };
}

function fromEvent(e: CalendarEvent): Draft {
  return {
    id: e.id,
    title: e.title,
    segment: e.segment ?? "",
    startsAt: toLocalInput(e.startsAt),
    endsAt: toLocalInput(e.endsAt),
    status: e.status,
    setupType: e.setupType,
    countryTag: e.countryTag ?? "",
    disciplineId: e.discipline.id,
    studioId: e.studio?.id ?? "",
    channelId: e.channel?.id ?? "",
    streamLinks: e.streamLinks ?? "",
    notes: e.notes ?? "",
    internalComment: e.internalComment ?? "",
    color: e.color ?? "",
    assignments: e.assignments.map((a) => ({ userId: a.user.id, role: a.role })),
    participantIds: e.participants.map((p) => p.id),
  };
}

export default function EventModal({
  event,
  meta,
  canEdit,
  defaultDate,
  onClose,
  onSaved,
}: {
  event: CalendarEvent | "new";
  meta: Meta;
  canEdit: boolean;
  defaultDate: Date;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = event === "new";
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState<Draft>(
    isNew ? emptyDraft(meta, defaultDate) : fromEvent(event)
  );
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
      countryTag: draft.countryTag,
      disciplineId: draft.disciplineId,
      studioId: draft.studioId || null,
      channelId: draft.channelId || null,
      streamLinks: draft.streamLinks,
      notes: draft.notes,
      internalComment: draft.internalComment,
      color: draft.color || null,
      assignments: draft.assignments.filter((a) => a.userId),
      participantIds: draft.participantIds,
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
          <ReadView event={event as CalendarEvent} />
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
    set("assignments", [
      ...draft.assignments,
      { userId: meta.users[0]?.id ?? "", role: "CASTER" },
    ]);
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

  const allParticipants = [...meta.participants.main, ...meta.participants.media];

  return (
    <div className="max-h-[70vh] space-y-4 overflow-auto px-5 py-4 scroll-thin">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-brand">{error}</p>}

      <Field label="Event title">
        <input className={inputCls} value={draft.title} onChange={(e) => set("title", e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Discipline">
          <select className={inputCls} value={draft.disciplineId} onChange={(e) => set("disciplineId", e.target.value)}>
            {meta.disciplines.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Segment">
          <input className={inputCls} value={draft.segment} onChange={(e) => set("segment", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start">
          <input type="datetime-local" className={inputCls} value={draft.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </Field>
        <Field label="End">
          <input type="datetime-local" className={inputCls} value={draft.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Studio">
          <select className={inputCls} value={draft.studioId} onChange={(e) => set("studioId", e.target.value)}>
            <option value="">—</option>
            {meta.studios.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Setup">
          <select className={inputCls} value={draft.setupType} onChange={(e) => set("setupType", e.target.value)}>
            {SETUP_TYPES.map((s) => (
              <option key={s} value={s}>{SETUP_LABEL[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Channel">
          <select className={inputCls} value={draft.channelId} onChange={(e) => set("channelId", e.target.value)}>
            <option value="">—</option>
            {meta.channels.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Status">
          <select className={inputCls} value={draft.status} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Country / language">
          <input className={inputCls} value={draft.countryTag} onChange={(e) => set("countryTag", e.target.value)} placeholder="EN" />
        </Field>
        <Field label="Color override">
          <input type="text" className={inputCls} value={draft.color} onChange={(e) => set("color", e.target.value)} placeholder="#16a34a" />
        </Field>
      </div>

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
            <div key={i} className="flex gap-2">
              <select
                className={inputCls + " flex-1"}
                value={a.userId}
                onChange={(e) => updateAssignment(i, { userId: e.target.value })}
              >
                {meta.users.map((u) => (
                  <option key={u.id} value={u.id}>{displayName(u)}</option>
                ))}
              </select>
              <select
                className={inputCls + " w-44"}
                value={a.role}
                onChange={(e) => updateAssignment(i, { role: e.target.value as AssignmentRole })}
              >
                {ASSIGNMENT_ROLES.map((r) => (
                  <option key={r} value={r}>{ASSIGNMENT_ROLE_LABEL[r]}</option>
                ))}
              </select>
              <button onClick={() => removeAssignment(i)} className="px-2 text-gray-400 hover:text-brand">
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Participants */}
      <Field label="Main & media participants">
        <div className="flex flex-wrap gap-2">
          {allParticipants.map((p) => {
            const on = draft.participantIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  set(
                    "participantIds",
                    on
                      ? draft.participantIds.filter((id) => id !== p.id)
                      : [...draft.participantIds, p.id]
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs ${
                  on ? "border-brand bg-brand text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.name}
                <span className="ml-1 opacity-60">{p.type === "MEDIA" ? "media" : ""}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Stream / channel links">
        <textarea className={inputCls} rows={2} value={draft.streamLinks} onChange={(e) => set("streamLinks", e.target.value)} placeholder="One URL per line" />
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

function ReadView({ event }: { event: CalendarEvent }) {
  return (
    <div className="max-h-[70vh] space-y-4 overflow-auto px-5 py-4 scroll-thin">
      <div className="flex items-center gap-2">
        <span className="rounded px-2 py-0.5 text-sm font-bold text-white" style={{ background: event.color }}>
          {event.discipline.name}
        </span>
        <span
          className="rounded px-2 py-0.5 text-xs font-bold uppercase text-white"
          style={{ background: STATUS_COLOR[event.status] }}
        >
          {STATUS_LABEL[event.status]}
        </span>
      </div>
      <h3 className="text-xl font-bold">{event.title}</h3>
      {event.segment && <p className="text-gray-600">{event.segment}</p>}

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Time" value={`${hhmm(event.startsAt)} – ${hhmm(event.endsAt)}`} />
        <Info label="Setup" value={SETUP_LABEL[event.setupType]} />
        <Info label="Studio" value={event.studio?.name ?? "—"} />
        <Info label="Channel" value={event.channel?.name ?? "—"} />
        {event.countryTag && <Info label="Country / language" value={event.countryTag} />}
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
            </div>
          ))}
        </div>
      </div>

      {event.participants.length > 0 && (
        <Info
          label="Participants"
          value={event.participants.map((p) => p.name).join(", ")}
        />
      )}
      {event.streamLinks && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Stream links</p>
          {event.streamLinks.split("\n").filter(Boolean).map((l) => (
            <a key={l} href={l} target="_blank" rel="noreferrer" className="block truncate text-sm text-blue-600 hover:underline">
              {l}
            </a>
          ))}
        </div>
      )}
      {event.notes && <Info label="Notes" value={event.notes} />}
      {event.internalComment && <Info label="Internal comment" value={event.internalComment} />}
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
