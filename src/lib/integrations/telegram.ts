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

const API = (method: string) =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

export function telegramEnabled() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
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
