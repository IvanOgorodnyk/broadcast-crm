import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { hashPassword, verifyPassword } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1).optional(),
  name: z.string().optional().nullable(),
  surname: z.string().optional().nullable(),
  // Accepts https:// links and data: URLs from the avatar upload/crop flow;
  // capped so nobody stores a multi-megabyte original in the row.
  avatarUrl: z.string().url().max(500_000).optional().nullable().or(z.literal("")),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

/** PUT — update the current user's own editable profile fields. */
export async function PUT(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  // Password change requires the current password.
  let passwordHash: string | undefined;
  if (data.newPassword) {
    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user?.passwordHash || !data.currentPassword) {
      return NextResponse.json({ error: "Current password required" }, { status: 400 });
    }
    const ok = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    passwordHash = await hashPassword(data.newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      ...(data.username !== undefined ? { username: data.username } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.surname !== undefined ? { surname: data.surname } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: { id: true, username: true, name: true, surname: true, avatarUrl: true },
  });

  return NextResponse.json({ user: updated });
}
