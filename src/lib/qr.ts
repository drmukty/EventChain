import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

function getSigningSecret() {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret) throw new Error("QR_SIGNING_SECRET is not configured");
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

export async function issueQRCodeForApplication(applicationId: string, _expiresAt?: Date) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(3000, 0, 1);
  const expTimestamp = expiresAt.getTime();
  const payloadHash = sign(`${applicationId}:${token}:${expTimestamp}`);

  const qr = await prisma.qRCode.create({
    data: { applicationId, token, payloadHash, expiresAt },
  });

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { eventId: true },
  });
  if (!application) throw new Error("Application not found");

  // ✅ Compact JSON (no extra spaces)
  const payload = JSON.stringify({
    applicationId,
    eventId: application.eventId,
    token,
    exp: expTimestamp,
    sig: payloadHash,
  });

  // ✅ Very large QR for perfect scanning
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    margin: 12,
    width: 1500,
  });

  return { qr, dataUrl, payload };
}

export async function verifyQRCode(rawPayload: string): Promise<ScanResult> {
  let parsed;
  try {
    parsed = JSON.parse(rawPayload);
    if (!parsed.applicationId || !parsed.token || !parsed.exp || !parsed.sig) {
      return { ok: false, reason: "MALFORMED" };
    }
  } catch {
    return { ok: false, reason: "MALFORMED" };
  }

  const expected = sign(`${parsed.applicationId}:${parsed.token}:${parsed.exp}`);
  if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(parsed.sig, "hex"))) {
    return { ok: false, reason: "TAMPERED" };
  }

  const qr = await prisma.qRCode.findUnique({ where: { token: parsed.token } });
  if (!qr || qr.applicationId !== parsed.applicationId) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  return {
    ok: true,
    applicationId: qr.applicationId,
    eventId: parsed.eventId,
    token: qr.token,
  };
}

type ScanResult =
  | { ok: true; applicationId: string; eventId: string; token: string }
  | { ok: false; reason: "MALFORMED" | "TAMPERED" | "NOT_FOUND" | "EXPIRED" | "ALREADY_USED" };

export async function consumeQRCode(_token: string) {
  return { ok: true };
}
