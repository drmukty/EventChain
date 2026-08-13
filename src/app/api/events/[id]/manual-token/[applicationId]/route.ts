import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateManualToken, hashToken } from "@/lib/manualToken";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; applicationId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }

  const eventId = params.id;
  const applicationId = params.applicationId;

  // Fetch the application with its event
  const application = await prisma.application.findUnique({
    where: { id: applicationId, eventId },
    include: { event: true, user: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Authorization: allow if user is application owner OR has team access
  const isOwner = application.userId === userId;

  // Check team membership (for organizers/admins)
  const membership = await prisma.teamMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  const isAdmin = (session.user as any).role === "ADMIN";
  const isOrganizer = membership?.role === "OWNER" || membership?.role === "ADMIN";

  if (!isOwner && !isAdmin && !isOrganizer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only approved applications get a token
  if (application.status !== "APPROVED") {
    return NextResponse.json({ error: "Application is not approved" }, { status: 400 });
  }

  // Generate or regenerate the token
  const result = await prisma.$transaction(async (tx) => {
    let tokenRecord = await tx.manualToken.findUnique({
      where: { applicationId }
    });

    let plainToken: string;

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      plainToken = generateManualToken();
      const tokenHash = await hashToken(plainToken);

      tokenRecord = await tx.manualToken.upsert({
        where: { applicationId },
        update: {
          tokenHash,
          usedAt: null,
          expiresAt: application.event.endsAt,
        },
        create: {
          applicationId,
          eventId,
          tokenHash,
          expiresAt: application.event.endsAt,
        },
      });
    } else {
      // Regenerate (can't retrieve old plaintext)
      plainToken = generateManualToken();
      const tokenHash = await hashToken(plainToken);

      tokenRecord = await tx.manualToken.update({
        where: { id: tokenRecord.id },
        data: {
          tokenHash,
          usedAt: null,
          expiresAt: application.event.endsAt,
        },
      });
    }

    return { token: plainToken };
  });

  return NextResponse.json({ token: result.token });
}
