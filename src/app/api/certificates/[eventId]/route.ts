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

  const certId = `EVT-${eventId.slice(0, 8).toUpperCase()}-${userId.slice(0, 6).toUpperCase()}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eventschain.vercel.app";
  const verifyUrl = `${baseUrl}/verify/${certId}`;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  const centerText = (
    text: string,
    font: any,
    size: number,
    y: number,
    color = rgb(0, 0, 0)
  ) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - w) / 2,
      y,
      size,
      font,
      color,
    });
  };

  const getDynamicFontSize = (
    text: string,
    font: any,
    maxWidth: number,
    minSize: number = 10,
    maxSize: number = 32
  ): number => {
    let size = maxSize;
    while (size > minSize) {
      const w = font.widthOfTextAtSize(text, size);
      if (w <= maxWidth) break;
      size -= 1;
    }
    return size;
  };

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const templatePath = path.join(
    process.cwd(),
    "public",
    "certificates",
    "certificate-template.png"
  );
  if (!fs.existsSync(templatePath)) {
    return NextResponse.json(
      { error: "Certificate template not found." },
      { status: 500 }
    );
  }

  const templateBytes = fs.readFileSync(templatePath);
  const templateImage = await pdfDoc.embedPng(templateBytes);
  page.drawImage(templateImage, { x: 0, y: 0, width, height });

  const attendeeName = checkIn.user.name ?? checkIn.user.email;
  const maxTextWidth = width * 0.8;
  const nameSize = getDynamicFontSize(attendeeName, boldFont, maxTextWidth, 16, 32);
  centerText(attendeeName, boldFont, nameSize, 300, rgb(0.1, 0.2, 0.5));

  const eventTitle = checkIn.event.title;
  const titleSize = getDynamicFontSize(eventTitle, boldFont, maxTextWidth, 14, 22);
  centerText(eventTitle, boldFont, titleSize, 375, rgb(0.05, 0.1, 0.2));

  const dateStr = checkIn.event.startsAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const venueStr = checkIn.event.venue;
  const detailsText = `Date: ${dateStr}  |  Venue: ${venueStr}`;
  centerText(detailsText, regularFont, 12, height - 350, rgb(0.2, 0.2, 0.2));

  const checkInTime = checkIn.checkedInAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const timeText = `Checked in at: ${checkInTime} (UTC)`;
  centerText(timeText, regularFont, 11, 475, rgb(0.3, 0.3, 0.3));

  const certIdText = `Certificate ID: ${certId}`;
  const idSize = 10;
  page.drawText(certIdText, {
    x: 80,
    y: 70,
    size: idSize,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  const issuedText = `Issued on: ${new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
  page.drawText(issuedText, {
    x: 80,
    y: 50,
    size: idSize,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // --- QR code – adjust these numbers to match your template's placeholder
  const qrX = 690;
  const qrY = 415;
  const qrSize = 105;

  // ✅ QR generation now uses qrSize and margin: 0
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: qrSize,
    margin: 0,
    errorCorrectionLevel: "H",
  });
  const qrImage = await pdfDoc.embedPng(qrBuffer);
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  const pdfBytes = await pdfDoc.save();

  const uploadPath = `certificates/${eventId}/${userId}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("EventChain")
    .upload(uploadPath, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Failed to store certificate: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("EventChain")
    .getPublicUrl(uploadPath);

  const certificate = await prisma.certificate.create({
    data: {
      certificateId: certId,
      eventId,
      userId,
      checkInId: checkIn.id,
      pdfUrl: publicUrlData.publicUrl,
    },
  });

  await notify(userId, {
    type: "CERTIFICATE_READY",
    title: "Certificate ready",
    message: `Your attendance certificate for ${checkIn.event.title} is ready to download.`,
    metadata: { eventId },
  });

  return NextResponse.json({ certificate });
}
