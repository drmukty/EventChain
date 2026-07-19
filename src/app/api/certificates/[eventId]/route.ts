import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { notify } from "@/lib/notifications";

export async function POST(_req: Request, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const eventId = params.eventId;

  // 1️⃣ Check if user has a valid check-in
  const checkIn = await prisma.checkIn.findFirst({
    where: { eventId, userId },
    include: { event: true, user: true },
  });

  if (!checkIn) {
    return NextResponse.json({ error: "No verified attendance found for this event" }, { status: 404 });
  }

  // 2️⃣ Delete OLD certificate from Supabase Storage (if exists)
  const existingCert = await prisma.certificate.findFirst({
    where: { eventId, userId },
  });

  if (existingCert && existingCert.pdfUrl) {
    try {
      // Extract the file path from the URL
      const urlParts = existingCert.pdfUrl.split("/");
      const filePath = urlParts.slice(urlParts.indexOf("certificates")).join("/");
      // Or use this alternative: extract path after /storage/v1/object/public/EventChain/
      const pathMatch = existingCert.pdfUrl.match(/\/EventChain\/(.+)$/);
      const pathToDelete = pathMatch ? pathMatch[1] : null;

      if (pathToDelete) {
        const { error: deleteError } = await supabaseAdmin.storage
          .from("EventChain")
          .remove([pathToDelete]);
        if (deleteError) {
          console.warn("Failed to delete old certificate:", deleteError.message);
          // Continue anyway – the new one will overwrite or we can still proceed
        }
      }
    } catch (err) {
      console.warn("Error deleting old certificate:", err);
      // Continue – we'll just overwrite or create a new one
    }
  }

  // 3️⃣ Generate a unique certificate ID
  const certId = `EVT-${eventId.slice(0, 8).toUpperCase()}-${userId.slice(0, 6).toUpperCase()}`;

  // 4️⃣ Build verification URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eventschain.vercel.app";
  const verifyUrl = `${baseUrl}/verify/${certId}`;

  // 5️⃣ Create PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // 6️⃣ Draw decorative borders
  const margin = 40;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - 2 * margin,
    height: height - 2 * margin,
    borderColor: rgb(0.1, 0.3, 0.6),
    borderWidth: 2,
  });
  page.drawRectangle({
    x: margin + 10,
    y: margin + 10,
    width: width - 2 * (margin + 10),
    height: height - 2 * (margin + 10),
    borderColor: rgb(0.2, 0.4, 0.7),
    borderWidth: 1,
  });

  // 7️⃣ Header
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

  // 8️⃣ Subtitle
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

  // 9️⃣ Attendee name
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

  // 🔟 Event details
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

  // 1️⃣1️⃣ Date and venue
  const dateStr = checkIn.event.startsAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const detailsText = `Date: ${dateStr}  |  Venue: ${checkIn.event.venue}`;
  const detailsSize = 12;
  const detailsWidth = regularFont.widthOfTextAtSize(detailsText, detailsSize);
  page.drawText(detailsText, {
    x: (width - detailsWidth) / 2,
    y: height - 350,
    size: detailsSize,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // 1️⃣2️⃣ Check-in time
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

  // 1️⃣3️⃣ "VERIFIED" badge
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

  // 1️⃣4️⃣ Certificate ID
  page.drawText(`Certificate ID: ${certId}`, {
    x: 80,
    y: 70,
    size: 10,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // 1️⃣5️⃣ Issue date
  page.drawText(`Issued on: ${new Date().toLocaleDateString()}`, {
    x: 80,
    y: 50,
    size: 10,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // 1️⃣6️⃣ QR code
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: 120,
    margin: 1,
    errorCorrectionLevel: "H",
  });
  const qrImage = await pdfDoc.embedPng(qrBuffer);
  const qrDims = qrImage.scale(0.8);
  page.drawImage(qrImage, {
    x: width - 140,
    y: 60,
    width: qrDims.width,
    height: qrDims.height,
  });

  // 1️⃣7️⃣ Signature (event name)
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
  page.drawLine({
    start: { x: sigX, y: sigY - 5 },
    end: { x: sigX + sigWidth, y: sigY - 5 },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.4),
  });

  // 1️⃣8️⃣ Save PDF
  const pdfBytes = await pdfDoc.save();

  // 1️⃣9️⃣ Upload to Supabase
  const path = `certificates/${eventId}/${userId}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("EventChain")
    .upload(path, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true, // ✅ This overwrites the old file if it exists
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return NextResponse.json(
      { error: `Failed to store certificate: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("EventChain")
    .getPublicUrl(path);

  // 2️⃣0️⃣ Create or update certificate record in DB
  const certificate = await prisma.certificate.upsert({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
    update: {
      certificateId: certId,
      pdfUrl: publicUrlData.publicUrl,
      issuedAt: new Date(),
    },
    create: {
      certificateId: certId,
      eventId,
      userId,
      checkInId: checkIn.id,
      pdfUrl: publicUrlData.publicUrl,
    },
  });

  // 2️⃣1️⃣ Notify user
  await notify(userId, {
    type: "CERTIFICATE_READY",
    title: "Certificate ready",
    message: `Your attendance certificate for ${checkIn.event.title} is ready to download.`,
    metadata: { eventId },
  });

  return NextResponse.json({ certificate });
}
