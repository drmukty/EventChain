import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === "ADMIN";

  // Events this user organizes or is on the team for (all events, for admins).
  const eventIds = isAdmin
    ? (await prisma.event.findMany({ select: { id: true } })).map((e) => e.id)
    : (
        await prisma.teamMember.findMany({ where: { userId }, select: { eventId: true } })
      ).map((t) => t.eventId);

  if (eventIds.length === 0) {
    return NextResponse.json({
      stats: {
        totalEvents: 0,
        registrations: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        checkedIn: 0,
        nftsMinted: 0,
        noShows: 0,
      },
      perEvent: [],
    });
  }

  const [
    totalEvents,
    registrations,
    pending,
    approved,
    rejected,
    checkedIn,
    nftsMinted,
    events,
  ] = await Promise.all([
    prisma.event.count({ where: { id: { in: eventIds } } }),
    prisma.application.count({ where: { eventId: { in: eventIds } } }),
    prisma.application.count({ where: { eventId: { in: eventIds }, status: "PENDING" } }),
    prisma.application.count({ where: { eventId: { in: eventIds }, status: "APPROVED" } }),
    prisma.application.count({ where: { eventId: { in: eventIds }, status: "REJECTED" } }),
    prisma.checkIn.count({ where: { eventId: { in: eventIds } } }),
    prisma.nFT.count({ where: { eventId: { in: eventIds }, isOnChain: true } }),
    prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        title: true,
        _count: { select: { checkIns: true, applications: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 8,
    }),
  ]);

  const noShows = Math.max(0, approved - checkedIn);

  const perEvent = await Promise.all(
    events.map(async (e) => {
      const approvedForEvent = await prisma.application.count({
        where: { eventId: e.id, status: "APPROVED" },
      });
      return {
        event: e.title,
        checkedIn: e._count.checkIns,
        noShow: Math.max(0, approvedForEvent - e._count.checkIns),
      };
    })
  );

  return NextResponse.json({
    stats: { totalEvents, registrations, pending, approved, rejected, checkedIn, nftsMinted, noShows },
    perEvent,
  });
}
