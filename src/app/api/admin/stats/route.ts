import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { computeWorkStats } from "@/lib/stats";

/**
 * GET /api/admin/stats?from=ISO&to=ISO&title=...
 * Admin-only work tracking: every active staffer's games, by role and
 * tournament. Also returns the list of tournament titles for the filter.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const title = url.searchParams.get("title");

  const [people, titleRows] = await Promise.all([
    computeWorkStats({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      title: title || undefined,
    }),
    prisma.event.findMany({
      distinct: ["title"],
      select: { title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return NextResponse.json({ people, titles: titleRows.map((t) => t.title) });
}
