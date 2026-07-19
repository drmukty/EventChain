// src/app/api/certificates/[eventId]/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { notify } from "@/lib/notifications";

// =============================================================
//  LAYOUT CONSTANTS
//  All coordinates are in PDF points (1/72 inch), origin bottom‑left.
//  Page size: 842 x 595 (landscape A4).
// =============================================================

const NAME_X = 421;
const NAME_Y = 380;
const NAME_MAX_WIDTH = 600;
const EVENT_X = 421;
const EVENT_Y = 300;
const EVENT_MAX_WIDTH = 600;
const CERT_ID_X = 100;
const CERT_ID_Y = 80;
const ISSUE_DATE_X = 100;
const ISSUE_DATE_Y = 55;
const QR_X = 680;
const QR_Y = 130;
const QR_SIZE = 100;

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
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  // 2. Delete any existing certificate
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

  // 4. Create a new PDF (draw everything from scratch – no template needed)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // landscape A4
  const { width, height } = page.getSize();

  // 5. Embed fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // 6. Draw decorative border
  const margin = 40;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - 2 * margin,
    height: height - 2 * margin,
    borderColor: rgb(0.1, 0.3, 0.6),
    borderWidth: 3,
  });
  // Inner border
  page.drawRectangle({
    x: margin + 10,
    y: margin + 10,
    width: width - 2 * (margin + 10),
    height: height - 2 * (margin + 10),
    borderColor: rgb(0.2, 0.4, 0.7),
    borderWidth: 1,
  });

  // 7. Header: "CERTIFICATE OF ATTENDANCE"
  const title = "CERTIFICATE OF ATTENDANCE";
  const titleSize = 32;
  const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 130,
    size: titleSize,
    font: boldFont,
    color: rgb(0.05, 0.15, 0.35),
  });

  // 8. Subtitle
  const subText = "This certifies that";
  const subSize = 16;
  const subWidth = regularFont.widthOfTextAtSize(subText, subSize);
  page.drawText(subText, {
    x: (width - subWidth) / 2,
    y: height - 180,
    size: subSize,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // 9. Attendee Name
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

  // 10. "has successfully attended"
  const attendedText = "has successfully attended";
  const attendedSize = 14;
  const attendedWidth = regularFont.widthOfTextAtSize(attendedText, attendedSize);
  page.drawText(attendedText, {
    x: (width - attendedWidth) / 2,
    y: height - 260,
    size: attendedSize,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // 11. Event Title
  const eventTitle = checkIn.event.title;
  const titleResult = fitTextToWidth(eventTitle, boldFont, EVENT_MAX_WIDTH, DEFAULT_TITLE_SIZE);
  const titleWidth2 = boldFont.widthOfTextAtSize(titleResult.text, titleResult.size);
  page.drawText(titleResult.text, {
    x: EVENT_X - titleWidth2 / 2,
    y: EVENT_Y,
    size: titleResult.size,
    font: boldFont,
    color: rgb(0.05, 0.1, 0.2),
  });

  // 12. Date and Venue
  const dateStr = checkIn.event.startsAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const venueStr = checkIn.event.venue;
  const detailsText = `Date: ${dateStr}  |  Venue: ${venueStr}`;
  const detailsSize = 12;
  const detailsWidth = regularFont.widthOfTextAtSize(detailsText, detailsSize);
  page.drawText(detailsText, {
    x: (width - detailsWidth) / 2,
    y: height - 320,
    size: detailsSize,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // 13. Check-in time
  const checkInTime = checkIn.checkedInAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const timeText = `Checked in at: ${checkInTime} (UTC)`;
  const timeSize = 11;
  const timeWidth = regularFont.widthOfTextAtSize(timeText, timeSize);
  page.drawText(timeText, {
    x: (width - timeWidth) / 2,
    y: height - 345,
    size: timeSize,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // 14. "VERIFIED" badge
  const badgeRadius = 30;
  const badgeX = width - 120;
  const badgeY = 120;
  page.drawCircle({
    x: badgeX,
    y: badgeY,
    size: badgeRadius,
    color: rgb(0.1, 0.6, 0.2),
    borderColor: rgb(0.1, 0.4, 0.1),
    borderWidth: 2,
  });
  page.drawText("VERIFIED", {
    x: badgeX - 25,
    y: badgeY - 6,
    size: 12,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  // 15. Certificate ID
  page.drawText(`Certificate ID: ${certId}`, {
    x: CERT_ID_X,
    y: CERT_ID_Y,
    size: 10,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // 16. Issue Date
  const issuedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  page.drawText(`Issued on: ${issuedDate}`, {
    x: ISSUE_DATE_X,
    y: ISSUE_DATE_Y,
    size: 10,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // 17. QR Code
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

  // 18. Signature (event name in cursive)
  const signatureText = eventTitle;
  const sigSize = 16;
  const sigWidth = italicFont.widthOfTextAtSize(signatureText, sigSize);
  const sigX = width - 140 - sigWidth - 10;
  const sigY = 140;
  page.drawText(signatureText, {
    x: sigX,
    y: sigY,
    size: sigSize,
    font: italicFont,
    color: rgb(0.1, 0.1, 0.3),
  });
  // Underline
  page.drawLine({
    start: { x: sigX, y: sigY - 5 },
    end: { x: sigX + sigWidth, y: sigY - 5 },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.4),
  });

  // 19. Save PDF
  const pdfBytes = await pdfDoc.save();

  // 20. Upload to Supabase
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

  // 21. Create certificate record
  const certificate = await prisma.certificate.create({
    data: {
      certificateId: certId,
      eventId,
      userId,
      checkInId: checkIn.id,
      pdfUrl: publicUrlData.publicUrl,
    },
  });

  // 22. Send notification
  await notify(userId, {
    type: "CERTIFICATE_READY",
    title: "Certificate ready",
    message: `Your attendance certificate for ${checkIn.event.title} is ready to download.`,
    metadata: { eventId },
  });

  return NextResponse.json({ certificate });
}
