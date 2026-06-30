import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * OBLOGA Broadcast — real initial configuration.
 * Only the lookup data the team confirmed; no demo events, teams, or staff.
 * A single admin account is created so the system can be logged into and the
 * rest (real users, events) added from inside the app.
 */
async function main() {
  console.log("Seeding OBLOGA initial config…");

  const company = await prisma.company.upsert({
    where: { name: "OBLOGA" },
    update: {},
    create: { name: "OBLOGA" },
  });

  // Disciplines (color used for calendar row color-coding).
  const disciplines = [
    { name: "Rainbow Six Siege", color: "#d35400" },
    { name: "Counter-Strike 2", color: "#1f6feb" },
  ];
  for (const d of disciplines) {
    await prisma.discipline.upsert({ where: { name: d.name }, update: { color: d.color }, create: d });
  }

  // Studios.
  for (const name of ["Studio 1", "Remote"]) {
    await prisma.studio.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Broadcast channels.
  for (const name of ["Broadcast"]) {
    await prisma.channel.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Discord channels.
  for (const name of ["Studio 1"]) {
    await prisma.discordChannel.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Streaming channels.
  for (const name of ["YouTube", "Twitch"]) {
    await prisma.streamChannel.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Media representatives.
  for (const name of ["HLTV", "Siege.gg", "Liquipedia"]) {
    await prisma.participant.upsert({
      where: { name_type: { name, type: "MEDIA" } },
      update: {},
      create: { name, type: "MEDIA" },
    });
  }

  // Single admin account (change the password after first login).
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "admin@maincast.com" },
    update: { companyId: company.id, role: "ADMIN", active: true },
    create: {
      email: "admin@maincast.com",
      passwordHash,
      username: "Admin",
      role: "ADMIN",
      active: true,
      companyId: company.id,
    },
  });

  console.log("Done. Admin login: admin@maincast.com / password123 (please change it).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
