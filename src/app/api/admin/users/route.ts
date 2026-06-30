import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { username: "asc" }],
    include: { company: true, disciplines: true },
  });
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      surname: u.surname,
      role: u.role,
      active: u.active,
      company: u.company?.name ?? null,
      disciplines: u.disciplines.map((d) => d.name),
      pendingInvite: Boolean(u.inviteToken),
    })),
  });
}

const inviteSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1),
  role: z.enum(["ADMIN", "STAFF", "VIEWER"]).default("STAFF"),
  companyId: z.string().optional().nullable(),
  disciplineIds: z.array(z.string()).default([]),
});

/**
 * POST — invite a new user by email. Creates an inactive account with an invite
 * token; the user sets their password via the invite link.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const inviteToken = randomBytes(24).toString("hex");
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      username: data.username,
      role: data.role,
      active: false, // becomes active once they accept the invite & set a password
      companyId: data.companyId || null,
      inviteToken,
      inviteExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      disciplines: { connect: data.disciplineIds.map((id) => ({ id })) },
    },
  });

  const inviteUrl = `${process.env.APP_URL ?? ""}/invite?token=${inviteToken}`;
  // In production an email would be sent here. For MVP we return the link.
  return NextResponse.json({ user: { id: user.id, email: user.email }, inviteUrl }, { status: 201 });
}
