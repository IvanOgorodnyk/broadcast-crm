/**
 * Telegram bot integration.
 *
 * MVP behaviour:
 *  - If TELEGRAM_BOT_TOKEN is unset, all calls are no-ops (logged in dev) so the
 *    app runs without credentials.
 *  - Linking flow: the user generates a one-time link code in their profile, then
 *    sends `/start <code>` to the bot. The webhook (see api/integrations/telegram/
 *    webhook) matches the code to the user and stores chatId.
 */

import type { AssignmentRole } from "@prisma/client";
import {
  ANALYST_ROLES,
  ASSIGNMENT_ROLE_LABEL,
  CASTER_ROLES,
  DIRECTOR_ROLES,
  SETUP_LABEL,
  SMM_ROLES,
} from "../labels";
import type { EventWithRelations } from "../events";

const API = (method: string) =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

export function telegramEnabled() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * People in a role bucket. Anyone holding a secondary role of that bucket
 * (a host among analysts, a producer among directors…) is marked in brackets
 * so nobody silently disappears from the card.
 */
function names(event: EventWithRelations, roles: AssignmentRole[], primary: AssignmentRole) {
  const list = event.assignments
    .filter((a) => roles.includes(a.role))
    .map((a) => {
      const u = a.user;
      const full = [u.name, u.surname].filter(Boolean).join(" ") || u.username;
      const marker = a.role === primary ? "" : ` (${ASSIGNMENT_ROLE_LABEL[a.role].toLowerCase()})`;
      return esc(full) + marker;
    });
  return list.length ? list.join(", ") : "—";
}

const KYIV_DATE = new Intl.DateTimeFormat("uk-UA", {
  timeZone: "Europe/Kyiv",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const KYIV_TIME = new Intl.DateTimeFormat("uk-UA", {
  timeZone: "Europe/Kyiv",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * The cast card pushed to Telegram on assignment and in reminders.
 * Format agreed with production:
 *   ⚠️ Tournament / 💥 Match / ⏰ Date and time / 🎨 Format
 *   ---- Casts ---- language, commentators, analysts, director, SMM, setup, channels
 */
export function buildCastMessage(event: EventWithRelations, heading?: string) {
  const match = event.participants
    .filter((p) => p.participant.type === "MAIN")
    .map((p) => p.participant.name);
  const channels = event.streamChannels.map((s) => s.streamChannel.name);

  const lines = [
    heading ? `${heading}\n` : null,
    `⚠️ Tournament: ${esc(event.title)}`,
    `💥 Match: ${match.length ? esc(match.join(" vs ")) : "—"}`,
    `⏰ Date and time: ${KYIV_DATE.format(event.startsAt)} ${KYIV_TIME.format(event.startsAt)}–${KYIV_TIME.format(event.endsAt)} (Kyiv)`,
    `🎨 Format: ${event.matchFormat ?? "—"}`,
    "",
    "---------------- Casts -------------",
    `🇺🇦 Broadcast language: ${event.countryTag ? esc(event.countryTag) : "—"}`,
    `🎤 Commentators: ${names(event, CASTER_ROLES, "CASTER")}`,
    `🗣 Analysts: ${names(event, ANALYST_ROLES, "ANALYST")}`,
    `🧿 Director: ${names(event, DIRECTOR_ROLES, "DIRECTOR")}`,
    `✨ SMM: ${names(event, SMM_ROLES, "SMM")}`,
    `🎛 Setup: ${SETUP_LABEL[event.setupType]}`,
    `📢 Channels: ${channels.length ? esc(channels.join(", ")) : "—"}`,
  ].filter((l): l is string => l !== null);

  return lines.join("\n");
}

export async function sendTelegramMessage(chatId: string, text: string) {
  if (!telegramEnabled()) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[telegram:disabled] -> ${chatId}: ${text}`);
    }
    return;
  }
  try {
    await fetch(API("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("[telegram] sendMessage failed", err);
  }
}
