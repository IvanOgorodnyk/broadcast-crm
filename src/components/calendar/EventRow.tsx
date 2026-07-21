"use client";

import Avatar from "@/components/Avatar";
import { hhmm } from "@/lib/utils";
import {
  ANALYST_ROLES,
  ASSIGNMENT_ROLE_LABEL,
  CASTER_ROLES,
  DIRECTOR_ROLES,
  SETUP_LABEL,
  SMM_ROLES,
  STATUS_COLOR,
  STATUS_LABEL,
} from "@/lib/labels";
import type { CalendarEvent, EventAssignment } from "@/types";

/** Column template shared by the game rows and the calendar header. */
export const GAME_COLS = "grid-cols-[52px_1.35fr_0.95fr_1.3fr_1fr_0.85fr_1.05fr]";

/** Fixed left columns, shared with the calendar header. */
export const DISCIPLINE_COL = "w-20";
export const EVENT_COL = "w-44";

/**
 * One tournament group: discipline logo + tournament title on the left,
 * one game row per event on the right (grouped by title in Calendar).
 */
export default function EventRow({
  events,
  onOpen,
}: {
  events: CalendarEvent[];
  onOpen: (e: CalendarEvent) => void;
}) {
  const first = events[0];
  const color = first.color;

  return (
    <div className="flex items-stretch gap-1.5">
      {/* Discipline logo */}
      <div
        className={`flex ${DISCIPLINE_COL} shrink-0 items-center justify-center rounded-md border border-gray-100 bg-white px-1 py-2`}
      >
        {first.discipline.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={first.discipline.logoUrl}
            alt={first.discipline.name}
            title={first.discipline.name}
            className="max-h-10 max-w-full object-contain"
          />
        ) : (
          <span className="text-center text-xs font-bold leading-tight" style={{ color }}>
            {first.discipline.name}
          </span>
        )}
      </div>

      {/* Tournament title */}
      <div
        className={`flex ${EVENT_COL} shrink-0 items-center justify-center rounded-md px-2 text-center text-sm font-semibold leading-tight text-gray-800`}
        style={{ background: tint(color, 0.16), boxShadow: `inset 4px 0 0 0 ${color}` }}
      >
        {first.title}
      </div>

      {/* Game rows */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {events.map((e) => (
          <GameRow key={e.id} event={e} onOpen={() => onOpen(e)} />
        ))}
      </div>
    </div>
  );
}

function GameRow({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  const color = event.color;
  const by = (roles: readonly string[]) =>
    event.assignments.filter((a) => roles.includes(a.role));

  const teams = event.participants.filter((p) => p.type === "MAIN").map((p) => p.name);
  const channels = [
    ...event.streamChannels.map((s) => s.name),
    ...(event.channel ? [event.channel.name] : []),
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={`grid ${GAME_COLS} cursor-pointer items-stretch gap-1.5 text-left`}
    >
      {/* Time — plain text, no block */}
      <div className="flex flex-col items-start justify-center pl-1">
        <span className="text-sm font-semibold text-gray-800">{hhmm(event.startsAt)}</span>
        <span
          title={STATUS_LABEL[event.status]}
          className="mt-1 inline-block h-2 w-2 rounded-full"
          style={{ background: STATUS_COLOR[event.status] }}
        />
      </div>

      {/* Games: BO badge + match teams (fallback: segment text) */}
      <Cell color={color} className="flex items-stretch gap-2 px-2 py-1.5">
        {event.matchFormat && (
          // Vertical badge: in vertical writing-mode the flex main axis runs
          // top-to-bottom, so justify-center is what centers the text on it.
          <span
            className="flex w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold leading-none tracking-wide text-white [writing-mode:vertical-rl] rotate-180"
            style={{ background: color }}
          >
            {event.matchFormat}
          </span>
        )}
        <span className="flex min-w-0 flex-col justify-center text-sm leading-snug text-gray-800">
          {teams.length > 0 ? (
            teams.map((t) => (
              <span key={t} className="truncate">{t}</span>
            ))
          ) : (
            <span className="truncate">{event.segment ?? "—"}</span>
          )}
        </span>
      </Cell>

      {/* Setup */}
      <Cell color={color} className="flex flex-col justify-center gap-0.5 px-2.5 py-1.5 text-sm text-gray-800">
        <span className="flex items-center gap-1.5">
          {event.countryTag && (
            <span
              className="rounded px-1 text-[10px] font-bold uppercase text-white"
              style={{ background: color }}
            >
              {event.countryTag}
            </span>
          )}
          <span>{SETUP_LABEL[event.setupType]}</span>
        </span>
        {event.studio && <span className="text-xs text-gray-500">{event.studio.name}</span>}
      </Cell>

      {/* Casters & Analysts */}
      <PeopleCell
        color={color}
        sections={[
          { label: "Casters", people: by(CASTER_ROLES) },
          { label: "Analysts", people: by(ANALYST_ROLES), tag: (a) => (a.role === "HOST" ? "host" : null) },
        ]}
      />

      {/* Directors */}
      <PeopleCell
        color={color}
        sections={[
          {
            label: "Directors",
            people: by(DIRECTOR_ROLES),
            tag: (a) => (a.role === "DIRECTOR" ? null : ASSIGNMENT_ROLE_LABEL[a.role].toLowerCase()),
          },
        ]}
      />

      {/* SMM — hover card opens leftwards so it can't widen the grid */}
      <PeopleCell
        color={color}
        alignRight
        sections={[
          {
            label: "SMM",
            people: by(SMM_ROLES),
            tag: (a) => (a.role === "MEDIA_REPRESENTATIVE" ? "media" : null),
          },
        ]}
      />

      {/* Channels */}
      <Cell color={color} className="flex flex-col justify-center px-2.5 py-1.5 text-xs leading-relaxed text-gray-700">
        {channels.length > 0 ? (
          channels.map((c) => (
            <span key={c} className="truncate">{c}</span>
          ))
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </Cell>
    </div>
  );
}

function Cell({
  color,
  className = "",
  children,
}: {
  color: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 rounded-md ${className}`} style={{ background: tint(color, 0.14) }}>
      {children}
    </div>
  );
}

/**
 * Avatar stack cell; hovering opens a card with the full list, split into
 * sections (Casters / Analysts, …) — username in bold + full name + [tag].
 */
function PeopleCell({
  color,
  sections,
  alignRight = false,
}: {
  color: string;
  sections: { label: string; people: EventAssignment[]; tag?: (a: EventAssignment) => string | null }[];
  /** Anchor the hover card to the cell's right edge (for right-most columns). */
  alignRight?: boolean;
}) {
  const filled = sections.filter((s) => s.people.length > 0);
  const all = filled.flatMap((s) => s.people);

  if (all.length === 0) {
    return (
      <Cell color={color} className="flex items-center px-2.5 py-1.5 text-gray-300">
        —
      </Cell>
    );
  }

  return (
    <div
      className="group relative flex min-w-0 flex-wrap content-center items-center gap-1 rounded-md px-2.5 py-1.5"
      style={{ background: tint(color, 0.14) }}
    >
      {all.slice(0, 6).map((a) => (
        <Avatar
          key={a.id}
          name={a.user.name}
          surname={a.user.surname}
          username={a.user.username}
          avatarUrl={a.user.avatarUrl}
          size={26}
        />
      ))}
      {all.length > 6 && <span className="text-xs text-gray-500">+{all.length - 6}</span>}

      {/* Hover card with the full list */}
      <div
        className={`pointer-events-none invisible absolute ${
          alignRight ? "right-0" : "left-0"
        } top-full z-30 mt-1 w-72 rounded-xl bg-white p-4 opacity-0 shadow-2xl ring-1 ring-black/10 transition-opacity duration-100 group-hover:visible group-hover:opacity-100`}
      >
        {filled.map((s) => (
          <div key={s.label} className="mb-3 last:mb-0">
            <p className="mb-1.5 text-sm text-gray-400">{s.label}</p>
            <div className="space-y-1.5">
              {s.people.map((a) => {
                const tag = s.tag?.(a) ?? null;
                const full = [a.user.name, a.user.surname].filter(Boolean).join(" ");
                return (
                  <div key={a.id} className="flex items-center gap-2.5">
                    <Avatar
                      name={a.user.name}
                      surname={a.user.surname}
                      username={a.user.username}
                      avatarUrl={a.user.avatarUrl}
                      size={30}
                    />
                    <span className="min-w-0 truncate text-sm text-gray-800">
                      <span className="font-bold">{a.user.username}</span>
                      {full && <span> {full}</span>}
                    </span>
                    {tag && <span className="shrink-0 text-xs text-gray-400">[{tag}]</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Translucent tint of the discipline/event color. */
function tint(hex: string, alpha: number) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#f3f4f6";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
