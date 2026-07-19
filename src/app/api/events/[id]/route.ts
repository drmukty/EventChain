import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { checkEventAccess } from "@/lib/eventAccess";

async function assertCanManage(eventId: string, userId: string, role: string) {
  if (role === "ADMIN") return true;
  const membership = await prisma.teamMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  return membership && ["OWNER", "ADMIN"].includes(membership.role);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      organizer: { select: { name: true, image: true, bio: true } },
      speakers: true,
      sponsors: true,
      agenda: { orderBy: { startTime: "asc" } },
      _count: { select: { applications: true, checkIns: true } },
    },
  });

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user
    ? { id: (session.user as any).id, email: session.user.email!, role: (session.user as any).role }
    : null;

  const access = await checkEventAccess(event, sessionUser);
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: access.status });
  }

  return NextResponse.json({ event });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage = await assertCanManage(params.id, (session.user as any).id, (session.user as any).role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rawBody = await req.json();
  
  // ✅ Only validate fields that are actually sent
  const updateSchema = z.object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(10).optional(),
    category: z.string().min(2).optional(),
    venue: z.string().min(2).optional(),
    address: z.string().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    bannerUrl: z.string().url().optional().nullable(),
    logoUrl: z.string().url().optional().nullable(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    registrationDeadline: z.string().datetime().optional(),
    capacity: z.number().int().positive().optional(),
    status: z.enum(["DRAFT", "REGISTRATION_OPEN", "SOLD_OUT", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
  });

  const parsed = updateSchema.safeParse(rawBody);
  if (!parsed.success) {
    // ✅ Return a clean error message
    const errors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0];
    return NextResponse.json(
      { error: firstError || "Invalid form data" },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const data: Record<string, unknown> = { ...body };
  
  // Convert date strings to Date objects
  if (body.startsAt) data.startsAt = new Date(body.startsAt);
  if (body.endsAt) data.endsAt = new Date(body.endsAt);
  if (body.registrationDeadline) data.registrationDeadline = new Date(body.registrationDeadline);

  const event = await prisma.event.update({ where: { id: params.id }, data });

  const isClosingRegistration =
    body.status && ["SOLD_OUT", "LIVE", "COMPLETED", "CANCELLED"].includes(body.status);

  if (isClosingRegistration) {
    const applicants = await prisma.application.findMany({
      where: { eventId: params.id, status: { in: ["PENDING", "WAITLISTED"] } },
      select: { userId: true },
    });
    await Promise.all(
      applicants.map((a) =>
        notify(a.userId, {
          type: "REGISTRATION_CLOSED",
          title: "Registration closed",
          message:
            body.status === "CANCELLED"
              ? `${event.title} has been cancelled by the organizer.`
              : `Registration for ${event.title} is now closed.`,
          metadata: { eventId: event.id },
        })
      )
    );
  }

  return NextResponse.json({ event });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage = await assertCanManage(params.id, (session.user as any).id, (session.user as any).role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.event.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
