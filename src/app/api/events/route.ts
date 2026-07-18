import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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

// GET /api/events — public browse + my events (for organizers/volunteers)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  const { searchParams } = new URL(req.url);

  const mine = searchParams.get("mine") === "true";        // now boolean
  const liveOnly = searchParams.get("live") === "true";
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const organizer = searchParams.get("organizer") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Base filter: always public, and status based on liveOnly
  let where: Prisma.EventWhereInput = {
    visibility: "PUBLIC",
    status: liveOnly
      ? { in: ["REGISTRATION_OPEN", "LIVE"] }               // exclude SOLD_OUT
      : { in: ["REGISTRATION_OPEN", "SOLD_OUT", "LIVE"] },  // all
  };

  // If "mine" is requested, restrict to events the user owns OR is a team member of
  if (mine && session?.user) {
    const userId = (session.user as any).id;
    where = {
      ...where,
      OR: [
        { organizerId: userId },
        { teamMembers: { some: { userId } } },   // includes volunteers/checkers
      ],
    };
  }

  // Apply optional search / filter parameters
  if (q) {
    where.OR = [
      { title: { contains: q, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: q, mode: Prisma.QueryMode.insensitive } },
    ];
  }
  if (category) {
    where.category = { equals: category, mode: Prisma.QueryMode.insensitive };
  }
  if (location) {
    where.venue = { contains: location, mode: Prisma.QueryMode.insensitive };
  }
  if (organizer) {
    where.organizer = {
      name: { contains: organizer, mode: Prisma.QueryMode.insensitive },
    };
  }
  if (from) {
    where.startsAt = { gte: new Date(from) };
  }
  if (to) {
    where.startsAt = { lte: new Date(to) };
  }

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

// POST /api/events — organizer creates an event
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
      status: "REGISTRATION_OPEN",
      visibility: "PUBLIC",
      organizerId: (session.user as any).id,
      teamMembers: {
        create: { userId: (session.user as any).id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
