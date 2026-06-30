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

import type { Event, AssignmentRole } from "@prisma/client";

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
  event: Event & { discipline?: { name: string } | null; studio?: { name: string } | null; channel?: { name: string } | null };
  role: AssignmentRole;
};

function buildDescription(ctx: SyncContext) {
  const lines = [
    `Role: ${ctx.role}`,
    ctx.event.segment ? `Segment: ${ctx.event.segment}` : null,
    ctx.event.studio ? `Studio: ${ctx.event.studio.name}` : null,
    ctx.event.channel ? `Channel: ${ctx.event.channel.name}` : null,
    ctx.event.notes ? `Notes: ${ctx.event.notes}` : null,
    `${process.env.APP_URL ?? ""}/calendar?event=${ctx.event.id}`,
  ].filter(Boolean);
  return lines.join("\n");
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
      summary: ctx.event.title,
      description: buildDescription(ctx),
      start: { dateTime: ctx.event.startsAt.toISOString() },
      end: { dateTime: ctx.event.endsAt.toISOString() },
      // A stable id derived from the CRM event id so updates replace in place.
      id: `bcrm${ctx.event.id.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
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
