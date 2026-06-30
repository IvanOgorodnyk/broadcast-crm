"use client";

import Avatar from "@/components/Avatar";
import { hhmm, displayName } from "@/lib/utils";
import { ASSIGNMENT_ROLE_LABEL, STATUS_COLOR, STATUS_LABEL, SETUP_LABEL } from "@/lib/labels";
import type { CalendarEvent } from "@/types";

const CASTER_ROLES = ["CASTER", "ANALYST", "HOST"] as const;

export default function EventRow({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: () => void;
}) {
  const castersAnalysts = event.assignments.filter((a) =>
    (CASTER_ROLES as readonly string[]).includes(a.role)
  );
  const staff = event.assignments.filter(
    (a) => !(CASTER_ROLES as readonly string[]).includes(a.role)
  );
  const main = event.participants.filter((p) => p.type === "MAIN");
  const media = event.participants.filter((p) => p.type === "MEDIA");

  return (
    <button
      onClick={onClick}
      className="row-bar grid w-full grid-cols-[120px_1.6fr_90px_1.4fr_110px_1.6fr_1.4fr_100px_1.2fr] items-center gap-2 rounded-md border border-gray-100 bg-white px-3 py-2.5 text-left text-sm shadow-sm transition hover:shadow-md"
      style={{ background: tint(event.color), "--row-color": event.color } as React.CSSProperties}
    >
      {/* Discipline */}
      <div className="flex items-center gap-1.5 font-semibold" style={{ color: event.color }}>
        <span>{event.discipline.name}</span>
      </div>

      {/* Event title + status */}
      <div className="min-w-0">
        <div className="truncate font-semibold text-gray-800">{event.title}</div>
        <span
          className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ background: STATUS_COLOR[event.status] }}
        >
          {STATUS_LABEL[event.status]}
        </span>
      </div>

      {/* Time */}
      <div className="text-gray-600">
        <div className="font-medium">{hhmm(event.startsAt)}</div>
        <div className="text-xs text-gray-400">{hhmm(event.endsAt)}</div>
      </div>

      {/* Segment */}
      <div className="min-w-0 truncate text-gray-600">{event.segment ?? "—"}</div>

      {/* Studio + setup */}
      <div className="min-w-0 text-gray-600">
        <div className="truncate">{event.studio?.name ?? "—"}</div>
        <div className="text-xs text-gray-400">
          {SETUP_LABEL[event.setupType]}
          {event.countryTag ? ` · ${event.countryTag}` : ""}
        </div>
      </div>

      {/* Casters & Analysts */}
      <PeopleStack people={castersAnalysts} />

      {/* Staff */}
      <PeopleStack people={staff} />

      {/* Channel (broadcast + streaming) */}
      <div className="min-w-0 text-gray-600">
        <div className="truncate">{event.channel?.name ?? "—"}</div>
        {event.streamChannels.length > 0 && (
          <div className="truncate text-xs text-gray-400">
            {event.streamChannels.map((s) => s.name).join(", ")}
          </div>
        )}
      </div>

      {/* SMM (participants / media) */}
      <div className="min-w-0 text-xs text-gray-600">
        {main.length > 0 && <div className="truncate">{main.map((p) => p.name).join(" vs ")}</div>}
        {media.length > 0 && (
          <div className="truncate text-gray-400">{media.map((p) => p.name).join(", ")}</div>
        )}
        {main.length === 0 && media.length === 0 && "—"}
      </div>
    </button>
  );
}

function PeopleStack({
  people,
}: {
  people: { id: string; role: string; user: { id: string; username: string; name?: string | null; surname?: string | null; avatarUrl?: string | null } }[];
}) {
  if (people.length === 0) return <div className="text-gray-300">—</div>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {people.slice(0, 5).map((a) => (
        <Avatar
          key={a.id}
          name={a.user.name}
          surname={a.user.surname}
          username={a.user.username}
          avatarUrl={a.user.avatarUrl}
          size={24}
          title={`${displayName(a.user)} — ${ASSIGNMENT_ROLE_LABEL[a.role as keyof typeof ASSIGNMENT_ROLE_LABEL]}`}
        />
      ))}
      {people.length > 5 && (
        <span className="text-xs text-gray-400">+{people.length - 5}</span>
      )}
    </div>
  );
}

/** Light translucent tint of the discipline color for the row background. */
function tint(hex: string) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.06)`;
}
