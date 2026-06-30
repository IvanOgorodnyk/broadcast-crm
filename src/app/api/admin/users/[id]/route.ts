import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

const schema = z.object({
  role: z.enum(["ADMIN", "STAFF", "VIEWER"]).optional(),
  active: z.boolean().optional(),
  companyId: z.string().optional().nullable(),
  email: z.string().email().optional(),
  username: z.string().min(1).optional(),
  disciplineIds: z.array(z.string()).optional(),
});

/** PATCH — admin edits role / active / company / disciplines. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const data = parsed.data;

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.companyId !== undefined ? { companyId: data.companyId || null } : {}),
      ...(data.email !== undefined ? { email: data.email.toLowerCase() } : {}),
      ...(data.username !== undefined ? { username: data.username } : {}),
      ...(data.disciplineIds !== undefined
        ? { disciplines: { set: data.disciplineIds.map((id) => ({ id })) } }
        : {}),
    },
    select: { id: true, role: true, active: true },
  });
  return NextResponse.json({ user });
}

/**
 * DELETE — deactivate a user. We never hard-delete (preserves historical
 * assignments), we just mark inactive.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (auth.user.id === params.id) {
    return NextResponse.json({ error: "You cannot deactivate yourself" }, { status: 400 });
  }
  await prisma.user.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
