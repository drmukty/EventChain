import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Prisma, EventStatus } from "@prisma/client";  // ✅ import the enum
import { prisma } from "@/lib/prisma";

const createEventSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10),
  category: z.string().min(2),
  venue: z.string().min(2),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  bannerUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  registrationDeadline: z.string().datetime(),
  capacity: z.number().int().positive(),
});

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

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

  if (mine && !session?.user) {
    return NextResponse.json({ events: [] });
  }

  // Use the actual EventStatus enum values
  const statusFilter = liveOnly
    ? { in: [EventStatus.REGISTRATION_OPEN, EventStatus.LIVE] }
    : { in: [EventStatus.REGISTRATION_OPEN, EventStatus.SOLD_OUT, EventStatus.LIVE] };

  // Build base where clause
  const baseWhere: Prisma.EventWhereInput = {
    visibility: "PUBLIC",
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

    console.log(`[events/GET] mine=true, userId=${userId}`);

    // Organizer events
    const organizerEvents = await prisma.event.findMany({
      where: {
        ...baseWhere,
        organizerId: userId,
      },
      include: {
        organizer: { select: { name: true, image: true } },
        _count: { select: { applications: true } },
      },
    });

    // Team member events – try common relation names
    let teamEvents: any[] = [];
    try {
      teamEvents = await prisma.event.findMany({
        where: {
          ...baseWhere,
          teamMembers: {
            some: { userId: userId },
          },
        },
        include: {
          organizer: { select: { name: true, image: true } },
          _count: { select: { applications: true } },
        },
      });
    } catch {
      try {
        teamEvents = await prisma.event.findMany({
          where: {
            ...baseWhere,
            team: { some: { userId: userId } },
          },
          include: {
            organizer: { select: { name: true, image: true } },
            _count: { select: { applications: true } },
          },
        });
      } catch {
        try {
          teamEvents = await prisma.event.findMany({
            where: {
              ...baseWhere,
              eventTeam: { some: { userId: userId } },
            },
            include: {
              organizer: { select: { name: true, image: true } },
              _count: { select: { applications: true } },
            },
          });
        } catch (e) {
          console.error("No team relation found – check your schema");
        }
      }
    }

    // Merge and deduplicate
    const merged = [...organizerEvents, ...teamEvents];
    const seen = new Set();
    events = merged.filter((ev) => {
      if (seen.has(ev.id)) return false;
      seen.add(ev.id);
      return true;
    });

    console.log(`[events/GET] Found ${events.length} managed events`);
  } else {
    // Public query
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

// POST /api/events – unchanged
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Please login first." },
      { status: 401 }
    );
  }
  const body = await req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const event = await prisma.event.create({
    data: {
      ...data,
      slug: slugify(data.title),
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      registrationDeadline: new Date(data.registrationDeadline),
      status: EventStatus.REGISTRATION_OPEN,   // ✅ use enum
      visibility: "PUBLIC",
      organizerId: (session.user as any).id,
      teamMembers: {
        create: { userId: (session.user as any).id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
