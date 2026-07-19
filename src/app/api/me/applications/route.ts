import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      qrCode: {        // ✅ ADD THIS
        select: {
          id: true,
          token: true,
          dataUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Format the response
  const formatted = applications.map((app) => {
    return {
      id: app.id,
      eventId: app.eventId,
      userId: app.userId,
      status: app.status,
      waitlistPosition: app.waitlistPosition,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      qrDataUrl: app.qrCode?.dataUrl || null,   // ✅ Now this will work
      event: app.event,
      checkIn: app.checkIn || null,
    };
  });

  return NextResponse.json({ applications: formatted });
}
