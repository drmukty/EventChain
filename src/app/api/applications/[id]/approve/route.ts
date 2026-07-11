import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueQRCodeForApplication } from "@/lib/qr";
import { notify } from "@/lib/notifications";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: { event: true },
  });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const membership = await prisma.teamMember.findUnique({
    where: { eventId_userId: { eventId: application.eventId, userId: (session.user as any).id } },
  });
  const isAdmin = (session.user as any).role === "ADMIN";
  if (!isAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (application.status !== "PENDING") {
    return NextResponse.json({ error: `Application is already ${application.status}` }, { status: 400 });
  }

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: {
      status: "APPROVED",
      reviewedById: (session.user as any).id,
      reviewedAt: new Date(),
    },
  });

  const { dataUrl } = await issueQRCodeForApplication(updated.id, application.event.endsAt);

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

  return NextResponse.json({ application: updated, qrDataUrl: dataUrl });
}
