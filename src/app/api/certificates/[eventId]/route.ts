import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { notify } from "@/lib/notifications";

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

  const existing = await prisma.certificate.findUnique({ where: { eventId_userId: { eventId, userId } } });
  if (existing) return NextResponse.json({ certificate: existing });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: rgb(0.1, 0.1, 0.15), borderWidth: 2 });

  page.drawText("Certificate of Attendance", {
    x: width / 2 - 220,
    y: height - 140,
    size: 32,
    font,
    color: rgb(0.09, 0.09, 0.12),
  });

  page.drawText("This certifies that", { x: width / 2 - 70, y: height - 200, size: 14, font: bodyFont });

  page.drawText(checkIn.user.name ?? checkIn.user.email, {
    x: width / 2 - (checkIn.user.name?.length ?? 10) * 6,
    y: height - 240,
    size: 26,
    font,
    color: rgb(0.35, 0.25, 0.75),
  });

  page.drawText(`successfully attended`, { x: width / 2 - 75, y: height - 280, size: 14, font: bodyFont });
  page.drawText(checkIn.event.title, {
    x: width / 2 - checkIn.event.title.length * 5.5,
    y: height - 315,
    size: 20,
    font,
  });

  page.drawText(
    `Held at ${checkIn.event.venue} on ${checkIn.event.startsAt.toDateString()}`,
    { x: width / 2 - 160, y: height - 350, size: 12, font: bodyFont }
  );

  page.drawText(`Verified on-chain check-in: ${checkIn.checkedInAt.toISOString()}`, {
    x: 60,
    y: 60,
    size: 9,
    font: bodyFont,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdfDoc.save();

  const path = `certificates/${eventId}/${userId}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("eventchain")
    .upload(path, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Failed to store certificate: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from("eventchain").getPublicUrl(path);

  const certificate = await prisma.certificate.create({
    data: { eventId, userId, pdfUrl: publicUrlData.publicUrl },
  });

  await notify(userId, {
    type: "CERTIFICATE_READY",
    title: "Certificate ready",
    message: `Your attendance certificate for ${checkIn.event.title} is ready to download.`,
    metadata: { eventId },
  });

  return NextResponse.json({ certificate });
}
