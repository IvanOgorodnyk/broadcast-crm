import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { computePayStats } from "@/lib/money";

/**
 * GET /api/admin/finance?from=ISO&to=ISO&title=...
 * Admin-only payroll: each active staffer's earnings, by tournament and game.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const title = url.searchParams.get("title");

  const [people, titleRows] = await Promise.all([
    computePayStats({
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

  const grandTotal = people.reduce((n, p) => n + p.total, 0);
  return NextResponse.json({
    people,
    titles: titleRows.map((t) => t.title),
    grandTotal: Math.round(grandTotal * 100) / 100,
  });
}
