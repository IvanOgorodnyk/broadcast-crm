/** Initials from a name/username for avatar fallbacks. */
export function initials(name?: string | null, surname?: string | null, fallback = "?") {
  const a = (name ?? "").trim();
  const b = (surname ?? "").trim();
  if (a || b) return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || fallback;
  return fallback;
}

export function displayName(u: {
  name?: string | null;
  surname?: string | null;
  username: string;
}) {
  const full = `${u.name ?? ""} ${u.surname ?? ""}`.trim();
  return full || u.username;
}

/** Pick a readable text color (black/white) for a given hex background. */
export function contrastText(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#111827";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
}

/** "19:00" from a Date, in the server/browser local zone. */
export function hhmm(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
