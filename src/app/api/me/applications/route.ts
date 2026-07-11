import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { userId: (session.user as any).id },
    include: { event: true, qrCode: true },
    orderBy: { createdAt: "desc" },
  });

  // Regenerate the scannable QR image for approved, unused codes on demand —
  // the signature itself was already computed and stored at issuance time
  // (src/lib/qr.ts), so this just re-renders the same signed payload as an
  // image rather than re-deriving any secret.
  const withQr = await Promise.all(
    applications.map(async (app) => {
      if (!app.qrCode || app.qrCode.isUsed) return { ...app, qrDataUrl: null };
      const payload = JSON.stringify({
        applicationId: app.id,
        token: app.qrCode.token,
        exp: app.qrCode.expiresAt.getTime(),
        sig: app.qrCode.payloadHash,
      });
      const qrDataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: "H", margin: 2, width: 400 });
      return { ...app, qrDataUrl };
    })
  );

  return NextResponse.json({ applications: withQr });
}
