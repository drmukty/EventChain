import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyQRCode } from "@/lib/qr";
import { markAttendanceAndMint } from "@/lib/checkin";

const REASON_MESSAGES: Record<string, string> = {
  MALFORMED: "Invalid QR code format.",
  TAMPERED: "QR code has been modified.",
  EXPIRED: "QR code has expired.",
  ALREADY_USED: "QR code has already been used.",
  NOT_FOUND: "QR code not found.",
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { payload, eventId } = await request.json();

    if (!payload) {
      return NextResponse.json(
        { error: "Missing QR payload" },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const membership = await prisma.teamMember.findUnique({
      where: { eventId_userId: { eventId, userId: session.user.id } },
    });
    const isAdmin = (session.user as any).role === "ADMIN";
    
    if (!isAdmin && !(membership && ["OWNER", "ADMIN", "VOLUNTEER", "QR_SCANNER"].includes(membership.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await verifyQRCode(payload);

    if (!result.ok) {
      return NextResponse.json(
        { error: REASON_MESSAGES[result.reason] || "Invalid QR code", reason: result.reason },
        { status: 400 }
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: result.applicationId },
      include: { user: true, event: true },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.eventId !== eventId) {
      return NextResponse.json(
        { error: "This QR code does not belong to the selected event." },
        { status: 400 }
      );
    }

    const existing = await prisma.checkIn.findFirst({
      where: {
        eventId: application.eventId,
        userId: application.userId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already checked in for this event" },
        { status: 400 }
      );
    }

    const checkInResult = await markAttendanceAndMint(
      application.id,
      application.eventId,
      application.userId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: "Check-in successful!",
      attendee: {
        name: application.user.name,
        email: application.user.email,
      },
      nft: checkInResult.nft,
      certificate: checkInResult.certificate,
    });
  } catch (err) {
    console.error("Check-in error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
