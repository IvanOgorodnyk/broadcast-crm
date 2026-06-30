import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

/** GET — current user's notifications (newest first). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const notifications = await prisma.notification.findMany({
    where: { recipientId: auth.user.id },
    include: {
      actor: { select: { username: true, avatarUrl: true } },
      event: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ notifications, unread });
}

/** PATCH — mark notifications read. Body: { id } to mark one, or {} to mark all. */
export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  if (body?.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, recipientId: auth.user.id },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { recipientId: auth.user.id, read: false },
      data: { read: true },
    });
  }
  return NextResponse.json({ ok: true });
}
