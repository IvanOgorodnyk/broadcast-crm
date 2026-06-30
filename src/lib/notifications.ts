import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";
import { sendTelegramMessage } from "./integrations/telegram";

type NotifyInput = {
  recipientIds: string[];
  actorId?: string | null;
  eventId?: string | null;
  type: NotificationType;
  message: string;
  /** Optional richer text pushed to Telegram. Falls back to `message`. */
  telegramText?: string;
};

/**
 * Fan out an in-app notification (and Telegram push, if connected) to a set of
 * recipients. The actor is excluded so people don't get notified of their own
 * actions.
 */
export async function notify({
  recipientIds,
  actorId,
  eventId,
  type,
  message,
  telegramText,
}: NotifyInput) {
  const targets = Array.from(new Set(recipientIds)).filter((id) => id && id !== actorId);
  if (targets.length === 0) return;

  await prisma.notification.createMany({
    data: targets.map((recipientId) => ({
      recipientId,
      actorId: actorId ?? null,
      eventId: eventId ?? null,
      type,
      message,
    })),
  });

  // Best-effort Telegram fan-out (does nothing if bot token / chat ids missing).
  const recipients = await prisma.user.findMany({
    where: { id: { in: targets }, telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  await Promise.allSettled(
    recipients.map((r) =>
      r.telegramChatId ? sendTelegramMessage(r.telegramChatId, telegramText ?? message) : null
    )
  );
}
