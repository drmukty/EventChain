import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === "ADMIN";

  // Split events into ones this user *organizes* (OWNER/ADMIN team role)
  // vs. ones they're only a VOLUNTEER/QR_SCANNER on. Full applicant
  // analytics (pending/approved/rejected/registrations) are an organizer
  // concern; volunteers should only see check-in/scanner numbers for their
  // assigned event, per spec section 10. Previously every TeamMember role
  // got identical full-analytics data regardless of role.
  const memberships = isAdmin
    ? []
    : await prisma.teamMember.findMany({ where: { userId }, select: { eventId: true, role: true } });

  const organizerEventIds = isAdmin
    ? (await prisma.event.findMany({ select: { id: true } })).map((e) => e.id)
    : memberships.filter((m) => ["OWNER", "ADMIN"].includes(m.role)).map((m) => m.eventId);

  const volunteerOnlyEventIds = isAdmin
    ? []
    : memberships
        .filter((m) => ["VOLUNTEER", "QR_SCANNER"].includes(m.role))
        .map((m) => m.eventId)
        .filter((id) => !organizerEventIds.includes(id));

  const eventIds = organizerEventIds;

  let volunteerStats: { eventId: string; event: string; checkedIn: number; approved: number }[] = [];
  if (volunteerOnlyEventIds.length > 0) {
    const volunteerEvents = await prisma.event.findMany({
      where: { id: { in: volunteerOnlyEventIds } },
      select: {
        id: true,
        title: true,
        _count: { select: { checkIns: true } },
      },
    });
    volunteerStats = await Promise.all(
      volunteerEvents.map(async (e) => {
        const approvedForEvent = await prisma.application.count({
          where: { eventId: e.id, status: "APPROVED" },
        });
        return {
          eventId: e.id,
          event: e.title,
          checkedIn: e._count.checkIns,
          approved: approvedForEvent,
        };
      })
    );
  }

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
      volunteerStats,
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
    volunteerStats,
  });
}
