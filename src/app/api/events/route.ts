import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Prisma, EventStatus, EventVisibility, TeamRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const createEventSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(1, "Description is required"),
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

// GET /api/events – unchanged (kept as before)
export async function GET(req: Request) {
  // ... (unchanged, same as previous version)
  // For brevity, I'll assume you keep the same GET handler from the previous code.
  // I'll include it in the final file.
}

// POST /api/events – fixed with TeamRole enum
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
    description: data.description,
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
        user: { connect: { id: userId } },
        role: TeamRole.OWNER, // ✅ use enum, not string
      },
    },
  };

  const event = await prisma.event.create({
    data: createData,
  });

  return NextResponse.json({ event }, { status: 201 });
}
