import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyQRCode } from "@/lib/qr"; // consumeQRCode no longer used

const REASON_MESSAGES: Record<string, string> = {
  MALFORMED: "Invalid QR code",
  TAMPERED: "QR code has been modified",
  EXPIRED: "QR code has expired",      // kept but never returned
  ALREADY_USED: "QR code has already been used", // never returned
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

    // Now EXPIRED and ALREADY_USED are never returned, so just check ok
    if (!result.ok) {
      return NextResponse.json(
        { error: REASON_MESSAGES[result.reason] || "Invalid QR code" },
        { status: 400 }
      );
    }

    // ✅ result is guaranteed ok, so applicationId exists
    const applicationId = result.applicationId;

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

    // Check if QR belongs to the selected event
    if (application.eventId !== eventId) {
      return NextResponse.json(
        { error: "This QR code does not belong to the selected event." },
        { status: 400 }
      );
    }

    // Check if already checked in
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

    // Create check‑in record
    await prisma.checkIn.create({
      data: {
        applicationId: application.id,
        eventId: application.eventId,
        userId: application.userId,
      },
    });

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
