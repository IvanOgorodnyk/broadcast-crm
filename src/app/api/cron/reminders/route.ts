import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventInclude } from "@/lib/events";
import { buildCastMessage, sendTelegramMessage } from "@/lib/integrations/telegram";

export const dynamic = "force-dynamic";

const KYIV_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Kyiv",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * GET — daily reminder fan-out, invoked by Vercel Cron (see vercel.json).
 * Sends the cast card to every assignee's Telegram:
 *   - the day before the cast ("cast tomorrow")
 *   - on the day of the cast ("cast today")
 * Sent-markers on the event guarantee each reminder goes out at most once.
 */
export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
  // when the env var is set; reject anything else.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = KYIV_DAY.format(now);
  const tomorrow = KYIV_DAY.format(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  // Everything starting within the next ~2 days; per-event day matching below.
  const events = await prisma.event.findMany({
    where: {
      startsAt: { gte: now, lt: new Date(now.getTime() + 49 * 60 * 60 * 1000) },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    include: eventInclude,
  });

  let sentDayBefore = 0;
  let sentDayOf = 0;

  for (const event of events) {
    const eventDay = KYIV_DAY.format(event.startsAt);
    const kind =
      eventDay === today && !event.dayOfReminderAt
        ? "dayOf"
        : eventDay === tomorrow && !event.dayBeforeReminderAt
          ? "dayBefore"
          : null;
    if (!kind || event.assignments.length === 0) continue;

    const heading =
      kind === "dayOf"
        ? "🔔 <b>Reminder: your cast is today!</b>"
        : "🔔 <b>Reminder: your cast is tomorrow!</b>";
    const text = buildCastMessage(event, heading);

    const users = await prisma.user.findMany({
      where: {
        id: { in: event.assignments.map((a) => a.userId) },
        active: true,
        telegramChatId: { not: null },
      },
      select: { telegramChatId: true },
    });
    await Promise.allSettled(users.map((u) => sendTelegramMessage(u.telegramChatId!, text)));

    await prisma.event.update({
      where: { id: event.id },
      data: kind === "dayOf" ? { dayOfReminderAt: now } : { dayBeforeReminderAt: now },
    });
    if (kind === "dayOf") sentDayOf++;
    else sentDayBefore++;
  }

  return NextResponse.json({ ok: true, checked: events.length, sentDayBefore, sentDayOf });
}
