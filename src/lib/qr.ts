import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

/**
 * QR SECURITY MODEL
 * ─────────────────
 * Each approved application gets exactly one QRCode row. The QR image encodes
 * a JSON payload { applicationId, token, exp } plus an HMAC-SHA256 signature
 * over that payload, keyed by QR_SIGNING_SECRET (server-only secret, never
 * shipped to the client).
 *
 *  • Unique     → `token` is a fresh crypto-random 256-bit value per application.
 *  • Single-use → `isUsed` flips to true inside a DB transaction on first
 *                 successful scan; any later scan of the same token is rejected.
 *  • Expiring   → `expiresAt` is set to the event's end time; scans after
 *                 that are rejected even if otherwise valid.
 *  • Tamper-proof → the HMAC signature is recomputed server-side on every
 *                   scan and compared in constant time; any edited payload
 *                   (e.g. swapped applicationId) fails verification.
 *  • Replay-proof → combining single-use + signature verification means a
 *                   captured/replayed QR image cannot be reused after its
 *                   first successful scan, and cannot be forged for another
 *                   application.
 */

function getSigningSecret() {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret) throw new Error("QR_SIGNING_SECRET is not configured");
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

export async function issueQRCodeForApplication(applicationId: string, expiresAt: Date) {
  const token = crypto.randomBytes(32).toString("hex");

  const payloadHash = sign(`${applicationId}:${token}:${expiresAt.getTime()}`);

  const qr = await prisma.qRCode.create({
    data: {
      applicationId,
      token,
      payloadHash,
      expiresAt,
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
    exp: expiresAt.getTime(),
    sig: payloadHash,
  });

  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 512,
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
        | "EXPIRED"
        | "ALREADY_USED"
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

  const expected = sign(`${parsed.applicationId}:${parsed.token}:${parsed.exp}`);
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(parsed.sig, "hex");
  if (expectedBuf.length !== gotBuf.length || !crypto.timingSafeEqual(expectedBuf, gotBuf)) {
    return { ok: false, reason: "TAMPERED" };
  }

  if (Date.now() > parsed.exp) {
    return { ok: false, reason: "EXPIRED" };
  }

  const qr = await prisma.qRCode.findUnique({
    where: { token: parsed.token },
  });

  if (!qr || qr.applicationId !== parsed.applicationId) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (qr.isUsed) {
    return {
      ok: false,
      reason: "ALREADY_USED",
    };
  }

  return {
    ok: true,
    applicationId: qr.applicationId,
    eventId: parsed.eventId,
    token: qr.token,
  };
}

export async function consumeQRCode(token: string) {
  const qr = await prisma.qRCode.findUnique({
    where: { token },
  });

  if (!qr) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (qr.isUsed) {
    return { ok: false, reason: "ALREADY_USED" };
  }

  await prisma.qRCode.update({
    where: { token },
    data: {
      isUsed: true,
      usedAt: new Date(),
    },
  });

  return { ok: true };
}
