import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyQRCode } from "@/lib/qr";

const REASON_MESSAGES: Record<string, string> = {
  MALFORMED: "Invalid QR code format.",
  TAMPERED: "QR code has been modified.",
  EXPIRED: "QR code has expired.",
  ALREADY_USED: "QR code has already been used.",
  NOT_FOUND: "QR code not found.",
};

export async function POST(request: NextRequest) {
  try {
    const { payload, eventId } = await request.json();

    console.log("📦 Received payload:", payload);
    console.log("📌 Event ID:", eventId);

    if (!payload) {
      console.warn("❌ Missing payload");
      return NextResponse.json(
        { error: "Missing QR payload" },
        { status: 400 }
      );
    }

    const result = await verifyQRCode(payload);
    console.log("🔍 verifyQRCode result:", result);

    if (!result.ok) {
      console.warn(`❌ QR verification failed: ${result.reason}`);
      return NextResponse.json(
        { error: REASON_MESSAGES[result.reason] || "Invalid QR code", reason: result.reason },
        { status: 400 }
      );
    }

    console.log(`✅ QR verified for application ${result.applicationId}`);

    const application = await prisma.application.findUnique({
      where: { id: result.applicationId },
      include: { user: true, event: true },
    });

    if (!application) {
      console.warn("❌ Application not found");
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Check event match
    if (application.eventId !== eventId) {
      console.warn(`❌ Event mismatch: QR event ${application.eventId} != selected ${eventId}`);
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
      console.warn(`❌ Already checked in for user ${application.userId}`);
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

    console.log(`✅ Check-in successful for ${application.user.email}`);

    return NextResponse.json({
      success: true,
      attendee: {
        name: application.user.name,
        email: application.user.email,
      },
    });
  } catch (err) {
    console.error("❌ Check‑in error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
