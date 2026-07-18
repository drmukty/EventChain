import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyQRCode, consumeQRCode } from "@/lib/qr";

const REASON_MESSAGES: Record<string, string> = {
  MALFORMED: "Invalid QR code",
  TAMPERED: "QR code has been modified",
  EXPIRED: "QR code has expired",
  ALREADY_USED: "QR code has already been used",
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

    if (!result.ok) {
      return NextResponse.json(
        { error: REASON_MESSAGES[result.reason] },
        { status: 400 }
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: result.applicationId },
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
        { error: "Attendee already checked in." },
        { status: 400 }
      );
    }

    await prisma.checkIn.create({
      data: {
        applicationId: application.id,
        eventId: application.eventId,
        userId: application.userId,
      },
    });

    await consumeQRCode(result.token);

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
