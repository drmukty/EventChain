// GET /api/events — public browse/search/filter
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  const { searchParams } = new URL(req.url);

  const mine = searchParams.get("mine");
  const liveOnly = searchParams.get("live") === "true";   // ✅ now boolean
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const organizer = searchParams.get("organizer") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.EventWhereInput =
    mine === "true" && session?.user
      ? {
          organizerId: (session.user as any).id,
        }
      : {
          visibility: "PUBLIC",
          // ✅ new status filtering logic
          status: liveOnly
            ? { in: ["REGISTRATION_OPEN", "LIVE"] }               // exclude SOLD_OUT
            : { in: ["REGISTRATION_OPEN", "SOLD_OUT", "LIVE"] },  // include all

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
