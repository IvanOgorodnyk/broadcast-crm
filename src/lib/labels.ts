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
];

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
};

export const STATUSES: EventStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "CHANGED",
];

export const SETUP_TYPES: SetupType[] = ["STUDIO", "REMOTE", "ON_SITE", "HYBRID"];
