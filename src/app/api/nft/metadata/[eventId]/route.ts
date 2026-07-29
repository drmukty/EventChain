import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: {
      organizer: { select: { name: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // ✅ Check if the request wants an image (SVG)
  const url = new URL(_req.url);
  const format = url.searchParams.get("format");

  if (format === "image") {
    // Return SVG image
    const svg = generateEventSVG(event);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // ✅ Return JSON metadata (default)
  const metadata = {
    name: `${event.title}`,
    description: `Proof of Attendance for "${event.title}" hosted by ${event.organizer?.name || "EventChain"} at ${event.venue} on ${new Date(event.startsAt).toLocaleDateString()}.`,
    // ✅ Image URL points to the same endpoint with ?format=image
    image: `${process.env.NEXT_PUBLIC_APP_URL}/api/nft/metadata/${event.id}?format=image`,
    attributes: [
      { trait_type: "Event", value: event.title },
      { trait_type: "Category", value: event.category },
      { trait_type: "Date", value: new Date(event.startsAt).toLocaleDateString() },
      { trait_type: "Venue", value: event.venue },
      { trait_type: "Hosted By", value: event.organizer?.name || "EventChain" },
      { trait_type: "Verified On", value: "Base Sepolia" },
    ],
  };

  return NextResponse.json(metadata);
}

// ✅ Helper function to generate SVG
function generateEventSVG(event: any) {
  const eventName = event.title;
  const venue = event.venue;
  const date = new Date(event.startsAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const organizer = event.organizer?.name || "EventChain";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#bgGrad)" rx="20" ry="20"/>
      <rect x="20" y="20" width="560" height="560" fill="none" stroke="url(#accentGrad)" stroke-width="4" rx="16" ry="16"/>
      <rect x="20" y="20" width="560" height="120" fill="url(#accentGrad)" opacity="0.15" rx="16" ry="16"/>
      <polygon points="300,80 330,95 330,125 300,140 270,125 270,95" fill="none" stroke="#4f46e5" stroke-width="3" opacity="0.6"/>
      <text x="300" y="180" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">Proof of Attendance</text>
      <text x="300" y="270" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${escapeXml(eventName)}</text>
      <line x1="100" y1="300" x2="500" y2="300" stroke="#4f46e5" stroke-width="2" opacity="0.5"/>
      <text x="300" y="360" font-family="Arial, sans-serif" font-size="24" fill="#c4b5fd" text-anchor="middle">📍 ${escapeXml(venue)}</text>
      <text x="300" y="410" font-family="Arial, sans-serif" font-size="22" fill="#a5b4fc" text-anchor="middle">📅 ${escapeXml(date)}</text>
      <text x="300" y="460" font-family="Arial, sans-serif" font-size="18" fill="#9ca3af" text-anchor="middle">Hosted by ${escapeXml(organizer)}</text>
      <circle cx="300" cy="520" r="30" fill="none" stroke="#34d399" stroke-width="3" opacity="0.8"/>
      <text x="300" y="526" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#34d399" text-anchor="middle">✓</text>
      <text x="300" y="555" font-family="Arial, sans-serif" font-size="12" fill="#6b7280" text-anchor="middle">Verified on Base Sepolia</text>
    </svg>
  `;
}

function escapeXml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
