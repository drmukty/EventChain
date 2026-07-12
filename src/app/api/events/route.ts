import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
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
  // Private / token-gated / NFT-holder events have been removed per spec —
  // every event is public now. Visibility, invitedEmails, and token-gate
  // fields are intentionally NOT accepted from the client anymore; any of
  // those values sent by an old client are silently ignored below.
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

// GET /api/events — public browse/search/filter
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const organizer = searchParams.get("organizer") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const events = await prisma.event.findMany({
    where: {
      visibility: "PUBLIC",
      status: { in: ["REGISTRATION_OPEN", "SOLD_OUT", "LIVE"] },
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(category && { category: { equals: category, mode: "insensitive" } }),
      ...(location && { venue: { contains: location, mode: "insensitive" } }),
      ...(organizer && { organizer: { name: { contains: organizer, mode: "insensitive" } } }),
      ...(from && { startsAt: { gte: new Date(from) } }),
      ...(to && { startsAt: { lte: new Date(to) } }),
    },
    include: {
      organizer: { select: { name: true, image: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ events });
}

// POST /api/events — organizer creates an event
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ORGANIZER", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Only organizers can create events" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
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
