import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";  // ✅ Add this import

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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Format the response and generate QR codes
  const formatted = await Promise.all(
    applications.map(async (app) => {
      let qrDataUrl = null;

      // If there's a QR code token, generate the QR image
      if (app.qrCode?.token) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eventschain.vercel.app";
          const qrPayload = `${baseUrl}/scan?token=${app.qrCode.token}`;
          qrDataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: "H",
            margin: 1,
            width: 300,
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
        qrDataUrl: qrDataUrl,
        event: app.event,
        checkIn: app.checkIn || null,
      };
    })
  );

  return NextResponse.json({ applications: formatted });
}
