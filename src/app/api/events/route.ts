import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Prisma, EventStatus, EventVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const createEventSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().optional(),
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

// GET /api/events – unchanged
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

  const statusFilter = liveOnly
    ? { in: [EventStatus.REGISTRATION_OPEN, EventStatus.LIVE] }
    : { in: [EventStatus.REGISTRATION_OPEN, EventStatus.SOLD_OUT, EventStatus.LIVE] };

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

    const teamEvents = await prisma.event.findMany({
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

// POST /api/events – FIXED with correct relation for teamMembers
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
    const errors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0];
    const message = firstError || "Invalid form data. Please check your inputs.";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const userId = (session.user as any).id;

  const createData = {
    title: data.title,
    description: data.description ?? "",
    category: data.category,
    venue: data.venue,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    bannerUrl: data.bannerUrl,
    logoUrl: data.logoUrl,
    capacity: data.capacity,
    slug: slugify(data.title),
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    registrationDeadline: new Date(data.registrationDeadline),
    status: EventStatus.REGISTRATION_OPEN,
    visibility: EventVisibility.PUBLIC,
    organizer: {
      connect: { id: userId },
    },
    teamMembers: {
      create: {
        // ✅ Use relation connect instead of userId scalar
        user: { connect: { id: userId } },
        role: "OWNER",
      },
    },
  };

  const event = await prisma.event.create({
    data: createData,
  });

  return NextResponse.json({ event }, { status: 201 });
}
