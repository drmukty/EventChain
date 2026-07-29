import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: {
      organizer: { select: { name: true } },
    },
  });

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const metadata = {
    name: `Block Pass — ${event.title}`,
    description: `Proof of Attendance for "${event.title}" hosted by ${event.organizer?.name || "Block Pass"} at ${event.venue} on ${new Date(event.startsAt).toLocaleDateString()}.`,
    image: event.bannerUrl || `${process.env.NEXT_PUBLIC_APP_URL}/images/default-poap.png`,
    attributes: [
      { trait_type: "Event", value: event.title },
      { trait_type: "Category", value: event.category },
      { trait_type: "Date", value: new Date(event.startsAt).toLocaleDateString() },
      { trait_type: "Venue", value: event.venue },
      { trait_type: "Hosted By", value: event.organizer?.name || "Block Pass" },
      { trait_type: "Verified On", value: "Base Sepolia" },
    ],
  };

  return NextResponse.json(metadata);
}
