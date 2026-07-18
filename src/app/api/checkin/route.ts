import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyQRCode } from "@/lib/qr"; // ❌ removed consumeQRCode

const REASON_MESSAGES: Record<string, string> = {
  MALFORMED: "Invalid QR code",
  TAMPERED: "QR code has been modified",
  EXPIRED: "QR code has expired",      // kept but overridden
  ALREADY_USED: "QR code has already been used", // overridden
  NOT_FOUND: "QR code not found",
};

export async function POST(request: NextRequest) {
  try {
    const { payload, eventId } = await request.json();

    if (!payload) {
      return NextResponse.json(
        { error: "Missing QR payload" },
        { status: 400 }
      );
    }

    const result = await verifyQRCode(payload);

    // ✅ Only reject if QR is malformed, tampered, or not found
    if (!result.ok && result.reason !== "EXPIRED" && result.reason !== "ALREADY_USED") {
      return NextResponse.json(
        { error: REASON_MESSAGES[result.reason] },
        { status: 400 }
      );
    }

    // ✅ We still need the applicationId from the token
    const applicationId = result.applicationId;
    if (!applicationId) {
      return NextResponse.json(
        { error: "Invalid QR code – missing application ID" },
        { status: 400 }
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
        event: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // ✅ Wrong event check – this stays
    if (application.eventId !== eventId) {
      return NextResponse.json(
        { error: "This QR code does not belong to the selected event." },
        { status: 400 }
      );
    }

    // ✅ Check if already checked in
    const existing = await prisma.checkIn.findFirst({
      where: {
        eventId: application.eventId,
        userId: application.userId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already checked in for this event" }, // ✅ updated message
        { status: 400 }
      );
    }

    // ✅ Create check‑in record
    await prisma.checkIn.create({
      data: {
        applicationId: application.id,
        eventId: application.eventId,
        userId: application.userId,
      },
    });

    // ❌ REMOVED: await consumeQRCode(result.token); – QR is now permanent

    return NextResponse.json({
      success: true,
      attendee: {
        name: application.user.name,
        email: application.user.email,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
