import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyToken, isValidTokenFormat } from "@/lib/manualToken";
import { markAttendanceAndMint } from "@/lib/checkin";

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = params;
  const { token } = await req.json();

  if (!token || typeof token !== 'string' || !isValidTokenFormat(token)) {
    return NextResponse.json(
      { error: "Invalid token format. Must be 8 uppercase alphanumeric characters." },
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

  const tokens = await prisma.manualToken.findMany({
    where: {
      eventId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      application: {
        include: {
          user: true,
          event: true,
        },
      },
    },
  });

  let matchedToken = null;
  for (const t of tokens) {
    if (await verifyToken(token, t.tokenHash)) {
      matchedToken = t;
      break;
    }
  }

  if (!matchedToken) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 400 }
    );
  }

  const existingCheckIn = await prisma.checkIn.findFirst({
    where: {
      eventId,
      userId: matchedToken.application.userId,
    },
  });

  if (existingCheckIn) {
    return NextResponse.json(
      { error: "Attendee already checked in for this event" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.manualToken.update({
        where: { id: matchedToken.id },
        data: { usedAt: new Date() },
      });

      const checkIn = await markAttendanceAndMint(
        matchedToken.applicationId,
        eventId,
        matchedToken.application.userId,
        session.user.id,
        tx
      );

      return checkIn;
    });

    return NextResponse.json({
      success: true,
      message: "Check-in successful!",
      attendee: {
        name: matchedToken.application.user.name,
        email: matchedToken.application.user.email,
      },
    });
  } catch (error) {
    console.error("Manual check-in error:", error);
    return NextResponse.json(
      { error: "Failed to complete check-in" },
      { status: 500 }
    );
  }
}
