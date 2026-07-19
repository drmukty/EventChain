// src/app/api/certificates/[eventId]/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { notify } from "@/lib/notifications";
import fs from "fs";
import path from "path";

// =============================================================
//  LAYOUT CONSTANTS – ADJUST THESE TO MATCH YOUR TEMPLATE
//  All coordinates are in PDF points (1/72 inch), origin bottom‑left.
//  Page size: 842 x 595 (landscape A4).
// =============================================================

// --- Attendee name (centered) ---
const NAME_X = 421;           // horizontal center of the name line
const NAME_Y = 340;           // vertical position from bottom
const NAME_MAX_WIDTH = 600;   // max width before shrinking

// --- Event title (centered) ---
const EVENT_X = 421;
const EVENT_Y = 240;
const EVENT_MAX_WIDTH = 600;

// --- Certificate ID & Issue date (left‑aligned) ---
const CERT_ID_X = 100;
const CERT_ID_Y = 80;
const ISSUE_DATE_X = 100;
const ISSUE_DATE_Y = 55;

// --- QR code ---
const QR_X = 680;
const QR_Y = 130;
const QR_SIZE = 100;

// --- Font sizes ---
const DEFAULT_NAME_SIZE = 28;
const DEFAULT_TITLE_SIZE = 22;
const MIN_FONT_SIZE = 10;

// =============================================================
//  HELPER: Shrink text to fit within a given width
// =============================================================

function fitTextToWidth(
  text: string,
  font: any,
  maxWidth: number,
  initialSize: number
): { text: string; size: number } {
  let size = initialSize;
  let width = font.widthOfTextAtSize(text, size);
  while (width > maxWidth && size > MIN_FONT_SIZE) {
    size -= 0.5;
    width = font.widthOfTextAtSize(text, size);
  }
  return { text, size };
}

// =============================================================
//  API ROUTE
// =============================================================

export async function POST(_req: Request, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const eventId = params.eventId;

  // 1. Verify the user has checked in for this event
  const checkIn = await prisma.checkIn.findFirst({
    where: { eventId, userId },
    include: { event: true, user: true },
  });
  if (!checkIn) {
    return NextResponse.json({ error: "No verified attendance found for this event" }, { status: 404 });
  }

  // 2. Delete any existing certificate (database + Supabase file)
  const existing = await prisma.certificate.findFirst({
    where: { eventId, userId },
  });
  if (existing) {
    await prisma.certificate.delete({ where: { id: existing.id } });
    await supabaseAdmin.storage
      .from("EventChain")
      .remove([`certificates/${eventId}/${userId}.pdf`])
      .catch(() => {});
  }

  // 3. Generate certificate data
  const certId = `EVT-${eventId.slice(0, 8).toUpperCase()}-${userId.slice(0, 6).toUpperCase()}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eventschain.vercel.app";
  const verifyUrl = `${baseUrl}/verify/${certId}`;

  // 4. Create a new PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // landscape A4
  const { width, height } = page.getSize();

  // 5. Embed fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 6. Load the PNG template and draw it as the background
  const templatePath = path.join(
    process.cwd(),
    "public",
    "certificates",
    "certificate-template.png"
  );
  if (!fs.existsSync(templatePath)) {
    return NextResponse.json(
      { error: "Certificate template not found at public/certificates/certificate-template.png" },
      { status: 500 }
    );
  }
  const templateBytes = fs.readFileSync(templatePath);
  const templateImage = await pdfDoc.embedPng(templateBytes);
  page.drawImage(templateImage, { x: 0, y: 0, width, height });

  // 7. Draw ONLY the dynamic data (no static text from the template)

  // --- Attendee Name (bold, centered, auto‑resized) ---
  const attendeeName = checkIn.user.name ?? checkIn.user.email;
  const nameResult = fitTextToWidth(attendeeName, boldFont, NAME_MAX_WIDTH, DEFAULT_NAME_SIZE);
  const nameWidth = boldFont.widthOfTextAtSize(nameResult.text, nameResult.size);
  page.drawText(nameResult.text, {
    x: NAME_X - nameWidth / 2,
    y: NAME_Y,
    size: nameResult.size,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.5),
  });

  // --- Event Title (bold, centered, auto‑resized) ---
  const eventTitle = checkIn.event.title;
  const titleResult = fitTextToWidth(eventTitle, boldFont, EVENT_MAX_WIDTH, DEFAULT_TITLE_SIZE);
  const titleWidth = boldFont.widthOfTextAtSize(titleResult.text, titleResult.size);
  page.drawText(titleResult.text, {
    x: EVENT_X - titleWidth / 2,
    y: EVENT_Y,
    size: titleResult.size,
    font: boldFont,
    color: rgb(0.05, 0.1, 0.2),
  });

  // --- Certificate ID (left‑aligned) ---
  page.drawText(`#${certId}`, {
    x: CERT_ID_X,
    y: CERT_ID_Y,
    size: 12,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // --- Issue Date (left‑aligned) ---
  const issuedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  page.drawText(`Issued: ${issuedDate}`, {
    x: ISSUE_DATE_X,
    y: ISSUE_DATE_Y,
    size: 12,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // --- QR Code ---
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: QR_SIZE,
    margin: 0,
    errorCorrectionLevel: "H",
  });
  const qrImage = await pdfDoc.embedPng(qrBuffer);
  page.drawImage(qrImage, {
    x: QR_X,
    y: QR_Y,
    width: QR_SIZE,
    height: QR_SIZE,
  });

  // 8. Serialize the PDF
  const pdfBytes = await pdfDoc.save();

  // 9. Upload to Supabase
  const uploadPath = `certificates/${eventId}/${userId}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("EventChain")
    .upload(uploadPath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Failed to store certificate: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("EventChain")
    .getPublicUrl(uploadPath);

  // 10. Create the certificate record in the database
  const certificate = await prisma.certificate.create({
    data: {
      certificateId: certId,
      eventId,
      userId,
      checkInId: checkIn.id,
      pdfUrl: publicUrlData.publicUrl,
    },
  });

  // 11. Send a notification
  await notify(userId, {
    type: "CERTIFICATE_READY",
    title: "Certificate ready",
    message: `Your attendance certificate for ${checkIn.event.title} is ready to download.`,
    metadata: { eventId },
  });

  return NextResponse.json({ certificate });
}
