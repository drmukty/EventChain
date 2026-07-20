// GET /api/events
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);

  const mine = searchParams.get("mine") === "true";
  const liveOnly = searchParams.get("live") === "true";
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const organizer = searchParams.get("organizer") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // ✅ Check if user is admin
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  // ✅ Admin bypass: return ALL events (with search/filter)
  if (isAdmin) {
    const where: Prisma.EventWhereInput = {
      visibility: EventVisibility.PUBLIC,
      status: liveOnly
        ? { in: [EventStatus.REGISTRATION_OPEN, EventStatus.LIVE] }
        : { in: [EventStatus.REGISTRATION_OPEN, EventStatus.SOLD_OUT, EventStatus.LIVE] },
      ...(q && {
        OR: [
          { title: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: q, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
      ...(category && {
        category: { equals: category, mode: Prisma.QueryMode.insensitive },
      }),
      ...(location && {
        venue: { contains: location, mode: Prisma.QueryMode.insensitive },
      }),
      ...(organizer && {
        organizer: {
          name: { contains: organizer, mode: Prisma.QueryMode.insensitive },
        },
      }),
      ...(from && { startsAt: { gte: new Date(from) } }),
      ...(to && { startsAt: { lte: new Date(to) } }),
    };

    const events = await prisma.event.findMany({
      where,
      include: {
        organizer: { select: { name: true, image: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    return NextResponse.json({ events });
  }

  // ✅ Non-admin logic (unchanged)
  if (mine && !session?.user) {
    return NextResponse.json({ events: [] });
  }

  const statusFilter = liveOnly
    ? { in: [EventStatus.REGISTRATION_OPEN, EventStatus.LIVE] }
    : { in: [EventStatus.REGISTRATION_OPEN, EventStatus.SOLD_OUT, EventStatus.LIVE] };

  const baseWhere: Prisma.EventWhereInput = {
    visibility: EventVisibility.PUBLIC,
    status: statusFilter,
    ...(q && {
      OR: [
        { title: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: q, mode: Prisma.QueryMode.insensitive } },
      ],
    }),
    ...(category && {
      category: { equals: category, mode: Prisma.QueryMode.insensitive },
    }),
    ...(location && {
      venue: { contains: location, mode: Prisma.QueryMode.insensitive },
    }),
    ...(organizer && {
      organizer: {
        name: { contains: organizer, mode: Prisma.QueryMode.insensitive },
      },
    }),
    ...(from && { startsAt: { gte: new Date(from) } }),
    ...(to && { startsAt: { lte: new Date(to) } }),
  };

  let events: any[] = [];

  if (mine && session?.user) {
    const userId = (session.user as any).id;

    const organizerEvents = await prisma.event.findMany({
      where: {
        organizerId: userId,
      },
      include: {
        organizer: { select: { name: true, image: true } },
        _count: { select: { applications: true } },
      },
    });

    const teamEvents = await prisma.event.findMany({
      where: {
        teamMembers: {
          some: { userId: userId },
        },
      },
      include: {
        organizer: { select: { name: true, image: true } },
        _count: { select: { applications: true } },
      },
    });

    const merged = [...organizerEvents, ...teamEvents];
    const seen = new Set();
    events = merged.filter((ev) => {
      if (seen.has(ev.id)) return false;
      seen.add(ev.id);
      return true;
    });
  } else {
    events = await prisma.event.findMany({
      where: baseWhere,
      include: {
        organizer: { select: { name: true, image: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { startsAt: "desc" },
    });
  }

  return NextResponse.json({ events });
}
