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

export async function POST(_req: Request, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const eventId = params.eventId;

  const checkIn = await prisma.checkIn.findFirst({
    where: { eventId, userId },
    include: { event: true, user: true },
  });
  if (!checkIn) {
    return NextResponse.json({ error: "No verified attendance found for this event" }, { status: 404 });
  }

  const existing = await prisma.certificate.findFirst({
    where: { eventId, userId },
  });
  if (existing) return NextResponse.json({ certificate: existing });

  // --- 1. Generate a unique certificate ID
  const certId = `EVT-${eventId.slice(0, 8).toUpperCase()}-${userId.slice(0, 6).toUpperCase()}`;

  // --- 2. Build verification URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eventschain.vercel.app";
  const verifyUrl = `${baseUrl}/verify/${certId}`;

  // --- 3. Create a PDF document (A4 landscape)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  // --- Watermark logo
  const logoPath = path.join(process.cwd(), "public", "images", "eventchain-logo.png");
  if (fs.existsSync(logoPath)) {
    const logoBytes = fs.readFileSync(logoPath);
    const logo = await pdfDoc.embedPng(logoBytes);
    page.drawImage(logo, {
      x: width / 2 - 170,
      y: height / 2 - 170,
      width: 340,
      height: 340,
      opacity: 0.08,
    });
  }

  // --- 4. Embed fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // --- 5. Draw decorative double border
  const margin = 40;
  const borderWidth = 2;
  const innerMargin = 50;

  // Outer border
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - 2 * margin,
    height: height - 2 * margin,
    borderColor: rgb(0.1, 0.3, 0.6),
    borderWidth: borderWidth,
  });
  // Inner border (thinner)
  page.drawRectangle({
    x: margin + 10,
    y: margin + 10,
    width: width - 2 * (margin + 10),
    height: height - 2 * (margin + 10),
    borderColor: rgb(0.2, 0.4, 0.7),
    borderWidth: 1,
  });

  // --- 6. Header: "CERTIFICATE OF ATTENDANCE"
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

  // --- 7. Subtitle: "This certifies that"
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

  // --- 8. Attendee name (large, bold, blue)
  const attendeeName = checkIn.user.name ?? checkIn.user.email;
  const nameSize = 32;
  const nameWidth = boldFont.widthOfTextAtSize(attendeeName, nameSize);
  page.drawText(attendeeName, {
    x: (width - nameWidth) / 2,
    y: height - 230,
    size: nameSize,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.5),
  });

  // --- 9. Event details: "successfully attended and participated in"
  const attendedText = "has successfully attended and participated in";
  const attendedSize = 14;
  const attendedWidth = regularFont.widthOfTextAtSize(attendedText, attendedSize);
  page.drawText(attendedText, {
    x: (width - attendedWidth) / 2,
    y: height - 270,
    size: attendedSize,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // --- 10. Event title (larger, bold)
  const eventTitle = checkIn.event.title;
  const eventSize = 22;
  const eventWidth = boldFont.widthOfTextAtSize(eventTitle, eventSize);
  page.drawText(eventTitle, {
    x: (width - eventWidth) / 2,
    y: height - 310,
    size: eventSize,
    font: boldFont,
    color: rgb(0.05, 0.1, 0.2),
  });

  // --- 11. Date and venue
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
    y: height - 350,
    size: detailsSize,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // --- 12. Check-in time
  const checkInTime = checkIn.checkedInAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const timeText = `Checked in at: ${checkInTime} (UTC)`;
  const timeSize = 11;
  const timeWidth = regularFont.widthOfTextAtSize(timeText, timeSize);
  page.drawText(timeText, {
    x: (width - timeWidth) / 2,
    y: height - 375,
    size: timeSize,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // --- 13. "VERIFIED" badge (circle with text)
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

  // --- 14. Certificate ID (bottom left)
  const certIdText = `Certificate ID: ${certId}`;
  const idSize = 10;
  page.drawText(certIdText, {
    x: 80,
    y: 70,
    size: idSize,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // --- 15. Issue date (bottom left)
  const issuedText = `Issued on: ${new Date().toLocaleDateString()}`;
  page.drawText(issuedText, {
    x: 80,
    y: 50,
    size: idSize,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // --- 16. QR code (bottom right) – embed as PNG
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: 120,
    margin: 1,
    errorCorrectionLevel: "H",
  });
  const qrImage = await pdfDoc.embedPng(qrBuffer);
  const qrDims = qrImage.scale(0.8);
  const qrX = width - 140;
  const qrY = 60;
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrDims.width,
    height: qrDims.height,
  });

  // --- 17. Signature: event name in cursive (as signature)
  // Place it below the event title or at bottom right. We'll put it bottom right above QR.
  const signatureText = eventTitle;
  const sigSize = 18;
  const sigWidth = timesItalic.widthOfTextAtSize(signatureText, sigSize);
  const sigX = width - 140 - sigWidth - 10;
  const sigY = 140;
  page.drawText(signatureText, {
    x: sigX,
    y: sigY,
    size: sigSize,
    font: timesItalic,
    color: rgb(0.1, 0.1, 0.3),
  });
  // Draw a line under signature
  page.drawLine({
    start: { x: sigX, y: sigY - 5 },
    end: { x: sigX + sigWidth, y: sigY - 5 },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.4),
  });

  // --- 18. Save PDF
  const pdfBytes = await pdfDoc.save();

  // --- 19. Upload to Supabase
  const path = `certificates/${eventId}/${userId}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("EventChain")
    .upload(path, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Failed to store certificate: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("EventChain")
    .getPublicUrl(path);

  // --- 20. Create certificate record in DB
  const certificate = await prisma.certificate.create({
    data: {
      certificateId: certId,
      eventId,
      userId,
      checkInId: checkIn.id,
      pdfUrl: publicUrlData.publicUrl,
    },
  });

  // --- 21. Notify user
  await notify(userId, {
    type: "CERTIFICATE_READY",
    title: "Certificate ready",
    message: `Your attendance certificate for ${checkIn.event.title} is ready to download.`,
    metadata: { eventId },
  });

  return NextResponse.json({ certificate });
}
