import { PrismaClient, AssignmentRole, EventStatus, SetupType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function at(dayOffset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding…");

  // ---- Company ----
  const company = await prisma.company.upsert({
    where: { name: "Maincast" },
    update: {},
    create: { name: "Maincast" },
  });

  // ---- Disciplines (color-coded) ----
  const disciplineData = [
    { name: "CS2", color: "#16a34a" },
    { name: "Dota 2", color: "#dc2626" },
    { name: "Valorant", color: "#e11d8f" },
    { name: "Formula 1", color: "#7c2d12" },
    { name: "Podcast", color: "#7c3aed" },
    { name: "Events", color: "#a855f7" },
    { name: "Table Tennis", color: "#059669" },
  ];
  const disciplines: Record<string, string> = {};
  for (const d of disciplineData) {
    const rec = await prisma.discipline.upsert({
      where: { name: d.name },
      update: { color: d.color },
      create: d,
    });
    disciplines[d.name] = rec.id;
  }

  // ---- Studios ----
  const studioNames = ["Studio A", "Studio B", "Analyst Studio", "Remote"];
  const studios: Record<string, string> = {};
  for (const name of studioNames) {
    const rec = await prisma.studio.upsert({
      where: { name },
      update: { isAnalystStudio: name === "Analyst Studio" },
      create: { name, isAnalystStudio: name === "Analyst Studio" },
    });
    studios[name] = rec.id;
  }

  // ---- Channels ----
  const channelNames = ["Twitch", "YouTube", "Kick", "VK Video"];
  const channels: Record<string, string> = {};
  for (const name of channelNames) {
    const rec = await prisma.channel.upsert({ where: { name }, update: {}, create: { name } });
    channels[name] = rec.id;
  }

  // ---- Participants ----
  const mainTeams = ["NAVI", "G2", "Team Spirit", "FaZe", "Vitality"];
  const mediaOrgs = ["HLTV", "Dexerto", "Cybersport.ru"];
  const participants: Record<string, string> = {};
  for (const name of mainTeams) {
    const rec = await prisma.participant.upsert({
      where: { name_type: { name, type: "MAIN" } },
      update: {},
      create: { name, type: "MAIN" },
    });
    participants[name] = rec.id;
  }
  for (const name of mediaOrgs) {
    const rec = await prisma.participant.upsert({
      where: { name_type: { name, type: "MEDIA" } },
      update: {},
      create: { name, type: "MEDIA" },
    });
    participants[name] = rec.id;
  }

  // ---- Users ----
  const password = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@maincast.com" },
    update: {},
    create: {
      email: "admin@maincast.com",
      passwordHash: password,
      username: "Producer",
      name: "Олександр",
      surname: "Самойленко",
      role: "ADMIN",
      companyId: company.id,
      disciplines: { connect: [{ id: disciplines["CS2"] }, { id: disciplines["Dota 2"] }] },
    },
  });

  const staffSeed = [
    { email: "caster1@maincast.com", username: "Mafusail_D", name: "Дмитро", surname: "К.", disc: "CS2" },
    { email: "caster2@maincast.com", username: "Ghood Bhoy", name: "Олег", surname: "С.", disc: "CS2" },
    { email: "analyst1@maincast.com", username: "Kv-analyst", name: "Костянтин", surname: "Ковтюх", disc: "Dota 2" },
    { email: "director1@maincast.com", username: "Director_W", name: "Wladimir", surname: "W.", disc: "CS2" },
    { email: "tech1@maincast.com", username: "TechOps", name: "Іван", surname: "Т.", disc: "Valorant" },
  ];
  const staff: Record<string, string> = {};
  for (const s of staffSeed) {
    const rec = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash: password,
        username: s.username,
        name: s.name,
        surname: s.surname,
        role: "STAFF",
        companyId: company.id,
        disciplines: { connect: [{ id: disciplines[s.disc] }] },
      },
    });
    staff[s.username] = rec.id;
  }

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@maincast.com" },
    update: {},
    create: {
      email: "viewer@maincast.com",
      passwordHash: password,
      username: "Viewer",
      role: "VIEWER",
      companyId: company.id,
    },
  });

  // ---- Events (today) ----
  // Clear existing demo events to keep seed idempotent-ish for today.
  await prisma.event.deleteMany({ where: { title: { startsWith: "[demo] " } } });

  const e1 = await prisma.event.create({
    data: {
      title: "[demo] BLAST Premier: Spring Final",
      segment: "Matchday 3 — NAVI vs G2",
      startsAt: at(0, 19, 0),
      endsAt: at(0, 22, 0),
      status: "CONFIRMED",
      setupType: "STUDIO",
      countryTag: "EN",
      disciplineId: disciplines["CS2"],
      studioId: studios["Studio A"],
      channelId: channels["Twitch"],
      streamLinks: "https://twitch.tv/maincast\nhttps://youtube.com/maincast",
      notes: "Pre-show starts 30 min before.",
      createdById: admin.id,
      assignments: {
        create: [
          { userId: staff["Mafusail_D"], role: "CASTER" },
          { userId: staff["Ghood Bhoy"], role: "CASTER" },
          { userId: staff["Kv-analyst"], role: "ANALYST" },
          { userId: staff["Director_W"], role: "DIRECTOR" },
          { userId: admin.id, role: "PRODUCER" },
        ],
      },
      participants: {
        create: [
          { participantId: participants["NAVI"] },
          { participantId: participants["G2"] },
          { participantId: participants["HLTV"] },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "[demo] The International — Group Stage",
      segment: "Team Spirit vs FaZe",
      startsAt: at(0, 14, 0),
      endsAt: at(0, 17, 30),
      status: "IN_PROGRESS",
      setupType: "REMOTE",
      countryTag: "UA",
      disciplineId: disciplines["Dota 2"],
      studioId: studios["Remote"],
      channelId: channels["YouTube"],
      createdById: admin.id,
      assignments: {
        create: [
          { userId: staff["Mafusail_D"], role: "CASTER" },
          { userId: staff["Kv-analyst"], role: "ANALYST" },
          { userId: staff["TechOps"], role: "TECHNICAL_STAFF" },
        ],
      },
      participants: {
        create: [{ participantId: participants["Team Spirit"] }, { participantId: participants["FaZe"] }],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "[demo] Weekly Production Podcast",
      segment: "Episode 42",
      startsAt: at(0, 11, 0),
      endsAt: at(0, 12, 30),
      status: "DRAFT",
      setupType: "STUDIO",
      disciplineId: disciplines["Podcast"],
      studioId: studios["Studio B"],
      channelId: channels["YouTube"],
      createdById: admin.id,
      assignments: {
        create: [
          { userId: staff["Ghood Bhoy"], role: "HOST" },
          { userId: staff["Director_W"], role: "DIRECTOR" },
        ],
      },
    },
  });

  // A future event tomorrow for week/month navigation.
  await prisma.event.create({
    data: {
      title: "[demo] Valorant Champions",
      segment: "Quarterfinal",
      startsAt: at(1, 18, 0),
      endsAt: at(1, 21, 0),
      status: "CONFIRMED",
      setupType: "HYBRID",
      countryTag: "EN",
      disciplineId: disciplines["Valorant"],
      studioId: studios["Studio A"],
      channelId: channels["Kick"],
      createdById: admin.id,
      assignments: {
        create: [
          { userId: staff["Mafusail_D"], role: "CASTER" },
          { userId: staff["TechOps"], role: "REPLAY_OPERATOR" },
        ],
      },
    },
  });

  // ---- A couple of notifications for the admin demo ----
  await prisma.notification.create({
    data: {
      type: "ASSIGNED",
      message: `${admin.username} assigned you to "[demo] BLAST Premier: Spring Final"`,
      recipientId: staff["Mafusail_D"],
      actorId: admin.id,
      eventId: e1.id,
    },
  });

  console.log("Seed complete.");
  console.log("Login accounts (password: password123):");
  console.log("  admin@maincast.com    (ADMIN / Producer)");
  console.log("  caster1@maincast.com  (STAFF)");
  console.log("  viewer@maincast.com   (VIEWER)");
  void viewer;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
