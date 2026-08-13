import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueQRCodeForApplication } from "@/lib/qr";
import { notify } from "@/lib/notifications";
import { sendApprovalEmail } from "@/lib/email";
import { generateManualToken, hashToken } from "@/lib/manualToken";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: { event: true, user: true },
  });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const membership = await prisma.teamMember.findUnique({
    where: { eventId_userId: { eventId: application.eventId, userId } },
  });
  const isAdmin = (session.user as any).role === "ADMIN";
  
  if (!isAdmin && !(membership && ["OWNER", "ADMIN"].includes(membership.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (application.status !== "PENDING") {
    return NextResponse.json({ error: `Application is already ${application.status}` }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: application.id },
      data: {
        status: "APPROVED",
        reviewedById: userId,
        reviewedAt: new Date(),
      },
    });

    const { dataUrl } = await issueQRCodeForApplication(updated.id, application.event.endsAt);

    const plainToken = generateManualToken();
    const tokenHash = await hashToken(plainToken);
    
    const existingToken = await tx.manualToken.findUnique({
      where: { applicationId: application.id }
    });
    
    if (!existingToken) {
      await tx.manualToken.create({
        data: {
          applicationId: application.id,
          eventId: application.eventId,
          tokenHash: tokenHash,
          expiresAt: application.event.endsAt,
        },
      });
    } else {
      await tx.manualToken.update({
        where: { applicationId: application.id },
        data: {
          tokenHash: tokenHash,
          expiresAt: application.event.endsAt,
          usedAt: null,
        },
      });
    }

    return { application: updated, qrDataUrl: dataUrl, manualToken: plainToken };
  });

  await notify(application.userId, {
    type: "APPLICATION_APPROVED",
    title: "You're approved! 🎉",
    message: `Your application to ${application.event.title} was approved. Your check-in QR code is ready.`,
    metadata: { eventId: application.eventId },
  });
  
  await notify(application.userId, {
    type: "QR_GENERATED",
    title: "QR code ready",
    message: `Download your secure, single-use check-in QR code for ${application.event.title}.`,
    metadata: { eventId: application.eventId },
  });

  (async () => {
    try {
      if (application.user?.email) {
        await sendApprovalEmail({
          to: application.user.email,
          name: application.user.name ?? application.user.email,
          eventTitle: application.event.title,
          eventStartsAt: application.event.startsAt,
          eventVenue: application.event.venue,
          qrDataUrl: result.qrDataUrl,
        });
      }
    } catch (err) {
      console.error("Failed to send approval email:", err);
    }
  })();

  return NextResponse.json({ 
    application: result.application, 
    qrDataUrl: result.qrDataUrl,
    manualToken: result.manualToken
  });
}
