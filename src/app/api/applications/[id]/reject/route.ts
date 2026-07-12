import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { promoteNextWaitlisted } from "@/lib/waitlist";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: { event: true },
  });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const membership = await prisma.teamMember.findUnique({
    where: { eventId_userId: { eventId: application.eventId, userId: (session.user as any).id } },
  });
  const isAdmin = (session.user as any).role === "ADMIN";
  // Same restriction as approve — organizer-only, not any team member.
  if (!isAdmin && !(membership && ["OWNER", "ADMIN"].includes(membership.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const wasApproved = application.status === "APPROVED";

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: { status: "REJECTED", reviewedById: (session.user as any).id, reviewedAt: new Date() },
  });

  await notify(application.userId, {
    type: "APPLICATION_REJECTED",
    title: "Application update",
    message: body.reason
      ? `Your application to ${application.event.title} was not approved: ${body.reason}`
      : `Your application to ${application.event.title} was not approved this time.`,
    metadata: { eventId: application.eventId },
  });

  // If a previously-approved attendee is being removed (cancellation flow),
  // free up their seat for the next person on the waitlist.
  if (wasApproved) {
    await promoteNextWaitlisted(application.eventId);
  }

  return NextResponse.json({ application: updated });
}
