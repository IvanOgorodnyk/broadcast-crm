import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { computePayStats } from "@/lib/money";

/** GET /api/profile/finance — the current user's own earnings breakdown. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const people = await computePayStats({ userIds: [auth.user.id] });
  return NextResponse.json({ pay: people[0] ?? null });
}
