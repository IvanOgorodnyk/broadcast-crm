import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { googleRefreshToken: null, googleConnectedAt: null },
  });
  return NextResponse.json({ ok: true });
}
