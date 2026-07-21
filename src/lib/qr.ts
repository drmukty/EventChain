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

// The `_expiresAt` parameter is kept for backward compatibility but ignored
export async function issueQRCodeForApplication(applicationId: string, _expiresAt?: Date) {
  const token = crypto.randomBytes(32).toString("hex");

  // No real expiration – set to year 3000
  const expiresAt = new Date(3000, 0, 1);
  const expTimestamp = expiresAt.getTime();

  const payloadHash = sign(`${applicationId}:${token}:${expTimestamp}`);

  const qr = await prisma.qRCode.create({
    data: {
      applicationId,
      token,
      payloadHash,
      expiresAt, // stored but never checked
    },
  });

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { eventId: true },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  const payload = JSON.stringify({
    applicationId,
    eventId: application.eventId,
    token,
    exp: expTimestamp,
    sig: payloadHash,
  });

  // ✅ Increased QR size for better scanning reliability
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",   // Highest error correction
    margin: 4,                   // More white space around the QR (was 2)
    width: 800,                  // Higher resolution (was 512)
  });

  return { qr, dataUrl, payload };
}

type ScanResult =
  | { ok: true; applicationId: string; eventId: string; token: string }
  | {
      ok: false;
      reason:
        | "MALFORMED"
        | "TAMPERED"
        | "EXPIRED"        // kept for compatibility, never returned
        | "ALREADY_USED"   // kept for compatibility, never returned
        | "NOT_FOUND";
    };

export async function verifyQRCode(rawPayload: string): Promise<ScanResult> {
  let parsed: {
    applicationId: string;
    eventId: string;
    token: string;
    exp: number;
    sig: string;
  };
  try {
    parsed = JSON.parse(rawPayload);
    if (!parsed.applicationId || !parsed.token || !parsed.exp || !parsed.sig) {
      return { ok: false, reason: "MALFORMED" };
    }
  } catch {
    return { ok: false, reason: "MALFORMED" };
  }

  // Verify signature (tamper‑proof)
  const expected = sign(`${parsed.applicationId}:${parsed.token}:${parsed.exp}`);
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(parsed.sig, "hex");
  if (expectedBuf.length !== gotBuf.length || !crypto.timingSafeEqual(expectedBuf, gotBuf)) {
    return { ok: false, reason: "TAMPERED" };
  }

  // ❌ Expiry check removed – QR never expires
  // if (Date.now() > parsed.exp) { return { ok: false, reason: "EXPIRED" }; }

  const qr = await prisma.qRCode.findUnique({
    where: { token: parsed.token },
  });

  if (!qr || qr.applicationId !== parsed.applicationId) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  // ❌ isUsed check removed – QR can be scanned indefinitely
  // if (qr.isUsed) { return { ok: false, reason: "ALREADY_USED" }; }

  return {
    ok: true,
    applicationId: qr.applicationId,
    eventId: parsed.eventId,
    token: qr.token,
  };
}

// consumeQRCode is no longer used – leave as no‑op to avoid breaking imports
export async function consumeQRCode(_token: string) {
  return { ok: true };
}
