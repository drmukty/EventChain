import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { checkEventAccess } from "@/lib/eventAccess";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  console.log("🔍 Apply API called for event:", params.id);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("❌ Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const eventId = params.id;
    const body = await req.json().catch((e) => {
      console.log("⚠️ Failed to parse JSON:", e);
      return {};
    });
    const reason = body.reason || null;
    console.log("📝 Reason:", reason);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      console.log("❌ Event not found");
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Prevent organizer from applying to their own event
    if (event.organizerId === userId) {
      console.log("❌ Organizer cannot apply to own event");
      return NextResponse.json(
        { error: "You cannot apply to your own event." },
        { status: 400 }
      );
    }

    if (new Date() > event.registrationDeadline) {
      console.log("❌ Registration closed");
      return NextResponse.json({ error: "Registration is closed for this event" }, { status: 400 });
    }

    const access = await checkEventAccess(event, {
      id: userId,
      email: session.user.email!,
      role: (session.user as any).role,
    });
    if (!access.allowed) {
      console.log("❌ Access denied:", access.reason);
      return NextResponse.json({ error: access.reason }, { status: access.status });
    }

    const existing = await prisma.application.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing) {
      console.log("❌ Already applied");
      return NextResponse.json({ error: "You already applied to this event", application: existing }, { status: 409 });
    }

    console.log("✅ Creating application...");
    const application = await prisma.$transaction(async (tx) => {
      const approvedCount = await tx.application.count({
        where: { eventId, status: "APPROVED" },
      });

      const isFull = approvedCount >= event.capacity;
      if (isFull) {
        const waitlistCount = await tx.application.count({
          where: { eventId, status: "WAITLISTED" },
        });
        if (event.status !== "SOLD_OUT") {
          await tx.event.update({
            where: { id: eventId },
            data: { status: "SOLD_OUT" },
          });
        }
        return tx.application.create({
          data: {
            eventId,
            userId,
            reason: reason,
            answers: body.answers ?? undefined,
            status: "WAITLISTED",
            waitlistPosition: waitlistCount + 1,
          },
        });
      }
      return tx.application.create({
        data: {
          eventId,
          userId,
          reason: reason,
          answers: body.answers ?? undefined,
          status: "PENDING",
        },
      });
    });

    console.log("✅ Application created:", application.id);

    await notify(userId, {
      type: application.status === "WAITLISTED" ? "WAITLIST_PROMOTED" : "APPLICATION_SUBMITTED",
      title: application.status === "WAITLISTED" ? "You're on the waitlist" : "Application submitted",
      message:
        application.status === "WAITLISTED"
          ? `${event.title} is full. You're #${application.waitlistPosition} on the waitlist — we'll notify you if a spot opens up.`
          : `Your application to ${event.title} is pending organizer review.`,
      metadata: { eventId },
    });

    console.log("✅ Notification sent");
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error("❌ ERROR in apply API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
