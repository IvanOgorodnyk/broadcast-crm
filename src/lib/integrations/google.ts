/**
 * Google Calendar integration (MVP scaffold).
 *
 * The full OAuth + event-sync flow is wired structurally so it can be enabled by
 * adding GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Without credentials these
 * helpers are no-ops, keeping the rest of the app functional.
 *
 * Flow:
 *  1. User clicks "Connect Google Calendar" -> /api/integrations/google/start
 *  2. Google redirects back to /api/integrations/google/callback with a code
 *  3. We exchange the code for a refresh token and store it on the user
 *  4. On event create/update/delete we upsert/delete the user's calendar event
 */

import { createHash } from "crypto";
import type { AssignmentRole } from "@prisma/client";
import { prisma } from "../prisma";
import { ASSIGNMENT_ROLE_LABEL, SETUP_LABEL } from "../labels";
import type { EventWithRelations } from "../events";

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function buildGoogleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
}

async function accessTokenFromRefresh(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google refresh failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

type SyncContext = {
  refreshToken: string;
  event: EventWithRelations;
  role: AssignmentRole;
};

/** Teams of the match, e.g. ["NAVI", "Spirit"]. */
function matchTeams(event: EventWithRelations) {
  return event.participants
    .filter((p) => p.participant.type === "MAIN")
    .map((p) => p.participant.name);
}

/**
 * Calendar event title: tournament + matchup + format,
 * e.g. `EWC 26 — NAVI vs Spirit (BO3)`.
 */
export function buildSummary(event: EventWithRelations) {
  const teams = matchTeams(event);
  const head = [event.title, teams.length ? teams.join(" vs ") : event.segment]
    .filter(Boolean)
    .join(" — ");
  return event.matchFormat ? `${head} (${event.matchFormat})` : head;
}

export function buildDescription(event: EventWithRelations, role?: AssignmentRole) {
  const staff = event.assignments.map((a) => {
    const full = [a.user.name, a.user.surname].filter(Boolean).join(" ");
    return `• ${full || a.user.username} — ${ASSIGNMENT_ROLE_LABEL[a.role]}`;
  });
  const channels = event.streamChannels.map((s) => s.streamChannel.name);

  return [
    role ? `Your role: ${ASSIGNMENT_ROLE_LABEL[role]}` : null,
    event.countryTag ? `Language: ${event.countryTag}` : null,
    `Setup: ${SETUP_LABEL[event.setupType]}`,
    channels.length ? `Channels: ${channels.join(", ")}` : null,
    staff.length ? `\nStaff:\n${staff.join("\n")}` : null,
    event.cleanFeedYoutube ? `\nClean feed (YouTube): ${event.cleanFeedYoutube}` : null,
    event.cleanFeedRtmp ? `Clean feed (RTMP): ${event.cleanFeedRtmp}` : null,
    event.graphicsUrl ? `Graphics: ${event.graphicsUrl}` : null,
    event.notes ? `\nNotes: ${event.notes}` : null,
    `\n${process.env.APP_URL ?? ""}/calendar?event=${event.id}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Upsert a Google Calendar event for an assigned user. Returns silently if the
 * integration is disabled or the user is not connected.
 */
export async function syncEventToGoogle(ctx: SyncContext) {
  if (!googleEnabled() || !ctx.refreshToken) return;
  try {
    const token = await accessTokenFromRefresh(ctx.refreshToken);
    const body = {
      summary: buildSummary(ctx.event),
      description: buildDescription(ctx.event, ctx.role),
      start: { dateTime: ctx.event.startsAt.toISOString() },
      end: { dateTime: ctx.event.endsAt.toISOString() },
      // A stable id derived from the CRM event id so updates replace in place.
      id: googleEventId(ctx.event.id),
    };
    // Try update; if it 404s, insert.
    const updateRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${body.id}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (updateRes.status === 404) {
      await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
  } catch (err) {
    console.error("[google] syncEvent failed", err);
  }
}

/**
 * Stable Google event id derived from the CRM event id. Google only allows
 * base32hex characters (a-v, 0-9), so a hex digest is used — cuids contain
 * letters like w-z that Google rejects with a 400.
 */
function googleEventId(eventId: string) {
  return `bcrm${createHash("sha1").update(eventId).digest("hex")}`;
}

/**
 * Find a connected "organizer" Google account for an event: the event creator
 * if they connected Google Calendar, otherwise any connected active admin.
 */
async function findOrganizerToken(createdById: string): Promise<string | null> {
  const creator = await prisma.user.findFirst({
    where: { id: createdById, googleRefreshToken: { not: null } },
    select: { googleRefreshToken: true },
  });
  if (creator?.googleRefreshToken) return creator.googleRefreshToken;
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", active: true, googleRefreshToken: { not: null } },
    orderBy: { googleConnectedAt: "asc" },
    select: { googleRefreshToken: true },
  });
  return admin?.googleRefreshToken ?? null;
}

/**
 * Upsert the event on the organizer's calendar with every assigned member as
 * an attendee. `sendUpdates=all` makes Google email invitations immediately —
 * assignees get notified even if they never connected anything themselves.
 *
 * Returns true when the organizer sync happened; false when it isn't possible
 * (integration disabled / no connected admin) so callers can fall back to the
 * silent per-user sync.
 */
export async function syncEventWithInvites(event: EventWithRelations): Promise<boolean> {
  if (!googleEnabled()) return false;
  const refreshToken = await findOrganizerToken(event.createdById);
  if (!refreshToken) return false;

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: event.assignments.map((a) => a.userId) }, active: true },
      select: { id: true, email: true },
    });
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    const token = await accessTokenFromRefresh(refreshToken);
    const body = {
      id: googleEventId(event.id),
      summary: buildSummary(event),
      description: buildDescription(event),
      start: { dateTime: event.startsAt.toISOString() },
      end: { dateTime: event.endsAt.toISOString() },
      attendees: [...emailById.values()].map((email) => ({ email })),
    };

    const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const updateRes = await fetch(`${base}/${body.id}?sendUpdates=all`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (updateRes.status === 404) {
      const insertRes = await fetch(`${base}?sendUpdates=all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!insertRes.ok) throw new Error(`insert failed: ${insertRes.status}`);
    } else if (!updateRes.ok) {
      throw new Error(`update failed: ${updateRes.status}`);
    }
    return true;
  } catch (err) {
    console.error("[google] syncEventWithInvites failed", err);
    return false;
  }
}

/**
 * Cancel the organizer-calendar event; attendees get a cancellation email.
 * Returns true when handled, false when organizer sync isn't available.
 */
export async function cancelEventInvites(event: { id: string; createdById: string }): Promise<boolean> {
  if (!googleEnabled()) return false;
  const refreshToken = await findOrganizerToken(event.createdById);
  if (!refreshToken) return false;
  try {
    const token = await accessTokenFromRefresh(refreshToken);
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId(event.id)}?sendUpdates=all`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    return true;
  } catch (err) {
    console.error("[google] cancelEventInvites failed", err);
    return false;
  }
}

export async function deleteEventFromGoogle(refreshToken: string, eventId: string) {
  if (!googleEnabled() || !refreshToken) return;
  try {
    const token = await accessTokenFromRefresh(refreshToken);
    const id = `bcrm${eventId.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error("[google] deleteEvent failed", err);
  }
}
