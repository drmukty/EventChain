import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

/**
 * Per-event team management.
 *
 * This was missing entirely from the original codebase: the schema defines
 * TeamRole (OWNER / ADMIN / VOLUNTEER / QR_SCANNER) and every access check
 * in the app (checkin, approve/reject, applications list, event edit) reads
 * TeamMember rows to decide permissions — but nothing ever *wrote* a
 * TeamMember row except the OWNER record created at event creation. That
 * made the volunteer workflow in spec section 5 (attendee applies -> gets
 * approved -> organizer assigns them as a volunteer for that event) dead
 * code; there was no way to ever create a VOLUNTEER or QR_SCANNER row.
 *
 * Only OWNER/ADMIN team members (or global ADMIN) can manage a team.
 * Volunteers can only be assigned from users with an APPROVED application
 * to that specific event, per the spec's workflow.
 */

async function assertCanManageTeam(eventId: string, userId: string, role: string) {
  if (role === "ADMIN") return true;
  const membership = await prisma.teamMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  return !!membership && ["OWNER", "ADMIN"].includes(membership.role);
}

// GET /api/events/[id]/team — list current team members (organizer only)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage = await assertCanManageTeam(params.id, (session.user as any).id, (session.user as any).role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.teamMember.findMany({
    where: { eventId: params.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { invitedAt: "asc" },
  });

  return NextResponse.json({ members });
}

const inviteSchema = z.object({
  // The attendee being assigned must already have an APPROVED application
  // for this event — you can only make an attendee a volunteer for an
  // event they're actually attending, per spec section 5.
  userId: z.string().min(1),
  role: z.enum(["VOLUNTEER", "QR_SCANNER", "ADMIN"]).default("VOLUNTEER"),
});

// POST /api/events/[id]/team — assign a role to an approved attendee
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = params.id;
  const canManage = await assertCanManageTeam(eventId, (session.user as any).id, (session.user as any).role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { userId, role } = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const application = await prisma.application.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!application || application.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Only attendees with an approved application to this event can be assigned a team role" },
      { status: 400 }
    );
  }

  const member = await prisma.teamMember.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { role },
    create: { eventId, userId, role },
  });

  await notify(userId, {
    type: "APPLICATION_APPROVED",
    title: "You've been added to the event team",
    message: `You've been assigned as a ${role === "VOLUNTEER" ? "Volunteer" : role.toLowerCase()} for ${event.title}. ${
      role !== "ADMIN" ? "You now have QR scanner access for this event only." : ""
    }`,
    metadata: { eventId },
  });

  return NextResponse.json({ member }, { status: 201 });
}

const removeSchema = z.object({ userId: z.string().min(1) });

// DELETE /api/events/[id]/team — remove a team member (cannot remove OWNER)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = params.id;
  const canManage = await assertCanManageTeam(eventId, (session.user as any).id, (session.user as any).role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const target = await prisma.teamMember.findUnique({
    where: { eventId_userId: { eventId, userId: parsed.data.userId } },
  });
  if (!target) return NextResponse.json({ error: "Not a team member" }, { status: 404 });
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the event owner" }, { status: 400 });
  }

  await prisma.teamMember.delete({ where: { id: target.id } });
  return NextResponse.json({ success: true });
}
