import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { computeWorkStats } from "@/lib/stats";

/**
 * GET /api/profile/stats — the current user's own work stats: games worked,
 * by role and tournament, with each game listed.
 */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const people = await computeWorkStats({ userIds: [auth.user.id] });
  return NextResponse.json({ stats: people[0] ?? null });
}
