import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

/** Lookup data for the event form and the filter panel. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const [disciplines, studios, channels, users, participants] = await Promise.all([
    prisma.discipline.findMany({ orderBy: { name: "asc" } }),
    prisma.studio.findMany({ orderBy: { name: "asc" } }),
    prisma.channel.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { username: "asc" },
      select: { id: true, username: true, name: true, surname: true, avatarUrl: true },
    }),
    prisma.participant.findMany({ orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    disciplines,
    studios,
    channels,
    users,
    participants: {
      main: participants.filter((p) => p.type === "MAIN"),
      media: participants.filter((p) => p.type === "MEDIA"),
    },
  });
}
