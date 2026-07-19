import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  surname: z.string().min(1, "Surname is required"),
  positions: z
    .array(z.enum(["CASTER", "ANALYST", "DIRECTOR", "SMM"]))
    .min(1, "Pick at least one position"),
});

/**
 * POST — public staff self-registration. Creates an active STAFF account with
 * the chosen positions; admins keep managing roles from the admin panel.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // Derive a unique username from the email local part.
  const base = email.split("@")[0].replace(/[^a-z0-9._-]/gi, "") || "user";
  let username = base;
  for (let i = 2; await prisma.user.findFirst({ where: { username } }); i++) {
    username = `${base}${i}`;
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      username,
      name: data.name.trim(),
      surname: data.surname.trim(),
      role: "STAFF",
      active: true,
      positions: [...new Set(data.positions)],
    },
  });

  await createSession({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
