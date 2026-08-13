import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function markAttendanceAndMint(
  applicationId: string,
  eventId: string,
  userId: string,
  scannedById: string,
  tx?: Prisma.TransactionClient
) {
  const client = tx || prisma;

  const checkIn = await client.checkIn.create({
    data: {
      applicationId,
      eventId,
      userId,
      scannedById,
    },
  });

  const nft = await client.nft.create({
    data: {
      eventId,
      userId,
      checkInId: checkIn.id,
      isOnChain: false,
      metadataUrl: `/api/nft/metadata/${eventId}`,
    },
  });

  const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  const certificate = await client.certificate.create({
    data: {
      certificateId,
      userId,
      eventId,
      checkInId: checkIn.id,
      pdfUrl: `/api/certificates/${eventId}/${certificateId}`,
    },
  });

  await client.application.update({
    where: { id: applicationId },
    data: { status: "APPROVED" },
  });

  return { checkIn, nft, certificate };
}
