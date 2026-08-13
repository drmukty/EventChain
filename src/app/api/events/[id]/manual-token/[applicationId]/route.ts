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

  const eventId = params.id;
  const applicationId = params.applicationId;

  const membership = await prisma.teamMember.findUnique({
    where: { eventId_userId: { eventId, userId: session.user.id } },
  });
  const isAdmin = (session.user as any).role === "ADMIN";
  
  if (!isAdmin && !(membership && ["OWNER", "ADMIN"].includes(membership.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId, eventId },
    include: { event: true },
  });
  
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (application.status !== "APPROVED") {
    return NextResponse.json({ error: "Application is not approved" }, { status: 400 });
  }

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
