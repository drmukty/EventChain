import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).role === "ADMIN";

    // Get events where user is organizer or team member
    const memberships = isAdmin
      ? []
      : await prisma.teamMember.findMany({ 
          where: { userId }, 
          select: { eventId: true, role: true } 
        });

    const organizerEventIds = isAdmin
      ? (await prisma.event.findMany({ select: { id: true } })).map((e) => e.id)
      : memberships.filter((m) => ["OWNER", "ADMIN"].includes(m.role)).map((m) => m.eventId);

    // Volunteer stats (separate from organizer stats)
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
          checkIns: {
            select: { id: true },
          },
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
            checkedIn: e.checkIns.length,
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

    // Get all applications for these events
    const applications = await prisma.application.findMany({
      where: {
        eventId: { in: eventIds },
      },
      include: {
        checkIn: {
          include: {
            nft: true,
          },
        },
      },
    });

    // Calculate stats from applications
    const totalEvents = eventIds.length;
    const registrations = applications.length;
    const pending = applications.filter(a => a.status === "PENDING").length;
    const approved = applications.filter(a => a.status === "APPROVED").length;
    const rejected = applications.filter(a => a.status === "REJECTED").length;
    const checkedIn = applications.filter(a => a.checkIn).length;
    const nftsMinted = applications.filter(a => a.checkIn?.nft).length;
    const noShows = Math.max(0, approved - checkedIn);

    // Per event stats for chart
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        title: true,
      },
      orderBy: { startsAt: "desc" },
      take: 8,
    });

    const perEvent = await Promise.all(
      events.map(async (e) => {
        const eventApps = applications.filter(a => a.eventId === e.id);
        const checkedInCount = eventApps.filter(a => a.checkIn).length;
        const approvedCount = eventApps.filter(a => a.status === "APPROVED").length;
        return {
          event: e.title,
          checkedIn: checkedInCount,
          noShow: Math.max(0, approvedCount - checkedInCount),
        };
      })
    );

    return NextResponse.json({
      stats: {
        totalEvents,
        registrations,
        pending,
        approved,
        rejected,
        checkedIn,
        nftsMinted,
        noShows,
      },
      perEvent,
      volunteerStats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
