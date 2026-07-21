import type { AssignmentRole, EventStatus, SetupType } from "@prisma/client";

export const ASSIGNMENT_ROLE_LABEL: Record<AssignmentRole, string> = {
  CASTER: "Caster",
  ANALYST: "Analyst",
  DIRECTOR: "Director",
  PRODUCER: "Producer",
  OBSERVER: "Observer",
  REPLAY_OPERATOR: "Replay operator",
  TECHNICAL_STAFF: "Technical staff",
  MEDIA_REPRESENTATIVE: "Media representative",
  HOST: "Host",
  GUEST: "Guest",
  SMM: "SMM specialist",
};

export const ASSIGNMENT_ROLES: AssignmentRole[] = [
  "CASTER",
  "ANALYST",
  "DIRECTOR",
  "PRODUCER",
  "OBSERVER",
  "REPLAY_OPERATOR",
  "TECHNICAL_STAFF",
  "MEDIA_REPRESENTATIVE",
  "HOST",
  "GUEST",
  "SMM",
];

// Positions staff can pick at registration and self-assign to events as.
export const STAFF_POSITIONS: AssignmentRole[] = ["CASTER", "ANALYST", "DIRECTOR", "SMM"];

export const STAFF_POSITION_LABEL: Record<string, string> = {
  CASTER: "Commentator (caster)",
  ANALYST: "Analyst",
  DIRECTOR: "Stream director",
  SMM: "SMM specialist",
};

/**
 * Role buckets behind the calendar columns. Shared by the calendar grid, the
 * filter panel and the Telegram/Google notifications so they can't drift apart.
 */
export const CASTER_ROLES: AssignmentRole[] = ["CASTER"];
export const ANALYST_ROLES: AssignmentRole[] = ["ANALYST", "HOST"];
export const DIRECTOR_ROLES: AssignmentRole[] = [
  "DIRECTOR",
  "PRODUCER",
  "OBSERVER",
  "REPLAY_OPERATOR",
  "TECHNICAL_STAFF",
];
export const SMM_ROLES: AssignmentRole[] = ["SMM", "MEDIA_REPRESENTATIVE"];

export const STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  CHANGED: "Changed",
};

export const STATUS_COLOR: Record<EventStatus, string> = {
  DRAFT: "#9ca3af",
  CONFIRMED: "#16a34a",
  IN_PROGRESS: "#2563eb",
  COMPLETED: "#6b7280",
  CANCELLED: "#dc2626",
  CHANGED: "#d97706",
};

export const SETUP_LABEL: Record<SetupType, string> = {
  STUDIO: "Studio",
  REMOTE: "Remote",
  ON_SITE: "On site",
  HYBRID: "Hybrid",
  PC_DIRECTORS: "PC Directors",
  SERVER_OSTAP: "Server Ostap",
  AIRGPU: "AirGPU",
};

export const STATUSES: EventStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "CHANGED",
];

// Setups offered in the event form. Legacy enum values remain valid in the DB
// but are not offered in the UI.
export const SETUP_TYPES: SetupType[] = ["PC_DIRECTORS", "SERVER_OSTAP", "AIRGPU"];

// Broadcast languages offered in the event form.
export const LANGUAGES = ["UA", "ENG"];

// Palette for the "Color of blocks" picker.
export const BLOCK_COLORS = [
  "#16a3e0", // blue
  "#7c3aed", // violet
  "#db2777", // pink
  "#ef2b2b", // red
  "#ea580c", // orange
  "#d97706", // amber
  "#65a30d", // lime
  "#16a34a", // green
  "#0d9488", // teal
  "#475569", // slate
];
