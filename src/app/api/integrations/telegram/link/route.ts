import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

/**
 * POST — generate a one-time link code. The user sends `/start <code>` to the
 * bot; the webhook then attaches their Telegram chat id to this account.
 */
export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const code = randomBytes(6).toString("hex");
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { telegramLinkCode: code },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const deepLink = botUsername ? `https://t.me/${botUsername}?start=${code}` : null;
  return NextResponse.json({ code, deepLink });
}

/** DELETE — disconnect Telegram. */
export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { telegramChatId: null, telegramLinkCode: null },
  });
  return NextResponse.json({ ok: true });
}
