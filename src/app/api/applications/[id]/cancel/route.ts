import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelApprovedRegistration } from "@/lib/waitlist";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const application = await prisma.application.findUnique({ where: { id: params.id } });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (application.userId !== (session.user as any).id) {
    return NextResponse.json({ error: "You can only cancel your own registration" }, { status: 403 });
  }
  if (!["APPROVED", "PENDING", "WAITLISTED"].includes(application.status)) {
    return NextResponse.json({ error: `Cannot cancel a ${application.status.toLowerCase()} application` }, { status: 400 });
  }

  const updated = await cancelApprovedRegistration(application.id);
  return NextResponse.json({ application: updated });
}
