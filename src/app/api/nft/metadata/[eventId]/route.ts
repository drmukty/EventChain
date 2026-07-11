import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Standard ERC-721 metadata JSON, served per-event so every attendee's POAP
// for a given event resolves to the same badge artwork/description.
export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  return NextResponse.json({
    name: `${event.title} — Proof of Attendance`,
    description: `Awarded for verified attendance at ${event.title}, held at ${event.venue}.`,
    image: event.bannerUrl ?? event.logoUrl ?? undefined,
    attributes: [
      { trait_type: "Event", value: event.title },
      { trait_type: "Category", value: event.category },
      { trait_type: "Date", value: event.startsAt.toISOString() },
      { trait_type: "Venue", value: event.venue },
    ],
  });
}
