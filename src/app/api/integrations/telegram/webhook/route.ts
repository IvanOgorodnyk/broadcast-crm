import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/integrations/telegram";

/**
 * Telegram webhook. Register it with:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/integrations/telegram/webhook
 *
 * Handles `/start <code>` to link a chat to a CRM user.
 */
export async function POST(req: Request) {
  // Telegram echoes the secret_token passed to setWebhook in this header;
  // reject spoofed updates when the secret is configured.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update = await req.json().catch(() => null);
  const message = update?.message;
  const chatId = message?.chat?.id;
  const text: string | undefined = message?.text;

  if (!chatId || !text) return NextResponse.json({ ok: true });

  const match = text.match(/^\/start\s+([a-f0-9]+)/i);
  if (match) {
    const code = match[1];
    const user = await prisma.user.findUnique({ where: { telegramLinkCode: code } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegramChatId: String(chatId), telegramLinkCode: null },
      });
      await sendTelegramMessage(
        String(chatId),
        `✅ Connected to Broadcast CRM as <b>${user.username}</b>. You'll get assignment and schedule notifications here.`
      );
    } else {
      await sendTelegramMessage(String(chatId), "❌ Invalid or expired link code.");
    }
  } else if (/^\/start/.test(text)) {
    await sendTelegramMessage(
      String(chatId),
      "Open your profile in Broadcast CRM and click <b>Connect Telegram Bot</b> to get a link code."
    );
  }

  return NextResponse.json({ ok: true });
}
