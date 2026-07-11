import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@eventchain.dev" },
    update: {},
    create: { name: "Ada Admin", email: "admin@eventchain.dev", passwordHash, role: "ADMIN" },
  });

  const organizer = await prisma.user.upsert({
    where: { email: "organizer@eventchain.dev" },
    update: {},
    create: { name: "Olu Organizer", email: "organizer@eventchain.dev", passwordHash, role: "ORGANIZER" },
  });

  const attendee = await prisma.user.upsert({
    where: { email: "attendee@eventchain.dev" },
    update: {},
    create: {
      name: "Ama Attendee",
      email: "attendee@eventchain.dev",
      passwordHash,
      role: "ATTENDEE",
      walletAddress: "0x0000000000000000000000000000000000dEaD",
    },
  });

  const event = await prisma.event.upsert({
    where: { slug: "base-builders-summit-2026" },
    update: {},
    create: {
      title: "Base Builders Summit 2026",
      slug: "base-builders-summit-2026",
      description:
        "A day of talks and workshops for builders shipping on Base — from smart contract security to onchain UX.",
      category: "Web3 / Blockchain",
      venue: "Lagos Innovation Hub",
      address: "12 Adeola Odeku St, Victoria Island, Lagos",
      startsAt: new Date("2026-09-12T09:00:00Z"),
      endsAt: new Date("2026-09-12T18:00:00Z"),
      registrationDeadline: new Date("2026-09-10T23:59:00Z"),
      capacity: 150,
      visibility: "PUBLIC",
      status: "REGISTRATION_OPEN",
      organizerId: organizer.id,
      teamMembers: { create: { userId: organizer.id, role: "OWNER" } },
      speakers: {
        create: [
          { name: "Chidi Nwosu", title: "Protocol Engineer, Base" },
          { name: "Grace Okafor", title: "Founder, OnchainNG" },
        ],
      },
      sponsors: {
        create: [{ name: "Coinbase Developer Platform", tier: "Platinum" }],
      },
      agenda: {
        create: [
          {
            title: "Opening keynote",
            startTime: new Date("2026-09-12T09:30:00Z"),
            endTime: new Date("2026-09-12T10:15:00Z"),
            speaker: "Chidi Nwosu",
          },
        ],
      },
    },
  });

  console.log({ admin: admin.email, organizer: organizer.email, attendee: attendee.email, event: event.title });
  console.log("Seed complete. All sample accounts use password: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
