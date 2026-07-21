import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const applications = await prisma.application.findMany({
    where: { userId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          venue: true,
          startsAt: true,
          endsAt: true,
          bannerUrl: true,
          logoUrl: true,
        },
      },
      checkIn: {
        select: {
          id: true,
          checkedInAt: true,
          scannedById: true,
        },
      },
      qrCode: {
        select: {
          id: true,
          token: true,
          payloadHash: true,
          expiresAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Format the response and generate QR codes on the fly
  const formatted = await Promise.all(
    applications.map(async (app) => {
      let qrDataUrl = null;

      // If there's a QR code token, generate the QR image with the correct payload
      if (app.qrCode?.token) {
        try {
          const qr = app.qrCode;
          const expTimestamp = qr.expiresAt.getTime();

          // ✅ Reconstruct the exact payload used when the QR was issued
          const payload = JSON.stringify({
            applicationId: app.id,
            eventId: app.eventId,
            token: qr.token,
            exp: expTimestamp,
            sig: qr.payloadHash,
          });

          // ✅ Generate QR with large settings for reliable scanning
          qrDataUrl = await QRCode.toDataURL(payload, {
            errorCorrectionLevel: "H",
            margin: 12,
            width: 1500,
          });
        } catch (err) {
          console.error("QR generation failed:", err);
        }
      }

      return {
        id: app.id,
        eventId: app.eventId,
        userId: app.userId,
        status: app.status,
        waitlistPosition: app.waitlistPosition,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        qrDataUrl,
        event: app.event,
        checkIn: app.checkIn || null,
      };
    })
  );

  return NextResponse.json({ applications: formatted });
}
