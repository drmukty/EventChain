import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/users/[id]/role — ADMIN only.
 *
 * The spec requires Organizer/Volunteer/QR Scanner/Admin roles to be
 * "assigned internally," never self-registered. TeamRole (per-event
 * volunteer/scanner assignment) now has a real endpoint at
 * /api/events/[id]/team. But there was no mechanism anywhere in the app —
 * not even an admin-only one — to ever change a user's *global* role from
 * the ATTENDEE default to ORGANIZER, other than editing the database
 * directly (e.g. via the seed script or Prisma Studio). This endpoint is
 * the minimal internal control surface for that: only an existing ADMIN
 * can call it.
 */
const bodySchema = z.object({ role: z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role: parsed.data.role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ user });
}
