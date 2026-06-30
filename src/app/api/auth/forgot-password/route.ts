import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().email() });

/**
 * Password reset request. For the MVP we generate a reset token and (in dev)
 * return it. In production this would be emailed instead of returned.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // Always respond ok to avoid leaking which emails exist.
  if (!user) return NextResponse.json({ ok: true });

  const { randomBytes } = await import("crypto");
  const token = randomBytes(24).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { inviteToken: token, inviteExpiresAt: new Date(Date.now() + 1000 * 60 * 60) },
  });

  const resetUrl = `${process.env.APP_URL ?? ""}/invite?token=${token}`;
  const devLink = process.env.NODE_ENV === "development" ? resetUrl : undefined;
  return NextResponse.json({ ok: true, devLink });
}
