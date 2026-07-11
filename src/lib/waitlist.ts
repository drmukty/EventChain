import { prisma } from "@/lib/prisma";
import { issueQRCodeForApplication } from "@/lib/qr";
import { notify } from "@/lib/notifications";

/**
 * When an approved attendee cancels (or is removed), automatically approve
 * the next person in line on the waitlist, ordered by `waitlistPosition`.
 */
export async function promoteNextWaitlisted(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;

  const next = await prisma.application.findFirst({
    where: { eventId, status: "WAITLISTED" },
    orderBy: { waitlistPosition: "asc" },
  });
  if (!next) return null;

  const promoted = await prisma.application.update({
    where: { id: next.id },
    data: { status: "APPROVED", waitlistPosition: null, reviewedAt: new Date() },
  });

  await issueQRCodeForApplication(promoted.id, event.endsAt);

  await notify(promoted.userId, {
    type: "WAITLIST_PROMOTED",
    title: "A spot opened up! 🎉",
    message: `You've been moved off the waitlist and approved for ${event.title}. Your check-in QR code is ready.`,
    metadata: { eventId },
  });

  return promoted;
}

/** Attendee-initiated cancellation of an approved registration. */
export async function cancelApprovedRegistration(applicationId: string) {
  const application = await prisma.application.update({
    where: { id: applicationId },
    data: { status: "CANCELLED" },
  });
  await promoteNextWaitlisted(application.eventId);
  return application;
}
