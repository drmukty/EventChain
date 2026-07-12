import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/me/access — tells the client whether the signed-in user has any
 * staff role (organizer or volunteer/scanner) on at least one event. Used
 * to decide whether to show the "Scan" nav link — plain attendees should
 * never see it (spec section 6), even though the underlying /scan page and
 * /api/checkin route already enforce this server-side regardless.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ isStaffAnywhere: false, isOrganizerAnywhere: false });

  const role = (session.user as any).role;
  if (role === "ADMIN") {
    return NextResponse.json({ isStaffAnywhere: true, isOrganizerAnywhere: true });
  }

  const memberships = await prisma.teamMember.findMany({
    where: { userId: (session.user as any).id },
    select: { role: true },
  });

  return NextResponse.json({
    isStaffAnywhere: memberships.length > 0,
    isOrganizerAnywhere: memberships.some((m) => ["OWNER", "ADMIN"].includes(m.role)),
  });
}
