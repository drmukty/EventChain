import { prisma } from "@/lib/prisma";
import type { Event } from "@prisma/client";

type AccessResult = { allowed: true } | { allowed: false; reason: string; status: number };

/**
 * Central place that decides whether a given (possibly anonymous) user may
 * view or apply to an event, based on its visibility setting. Both the event
 * detail route and the apply route call this so the rule can never drift
 * between "can see it" and "can apply to it".
 */
export async function checkEventAccess(
  event: Event,
  user: { id: string; email: string; role: string } | null
): Promise<AccessResult> {
  if (event.visibility === "PUBLIC") return { allowed: true };

  // Every other visibility requires being signed in.
  if (!user) return { allowed: false, reason: "Sign in to view this event", status: 401 };

  if (user.role === "ADMIN") return { allowed: true };

  const membership = await prisma.teamMember.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
  });
  if (membership) return { allowed: true };

  if (event.visibility === "PRIVATE") {
    const invited = event.invitedEmails.some((e) => e.toLowerCase() === user.email.toLowerCase());
    if (!invited) {
      return { allowed: false, reason: "This is a private event — you haven't been invited", status: 403 };
    }
    return { allowed: true };
  }

  // TOKEN_GATED / NFT_HOLDER events – skip token check for now
  if (event.visibility === "TOKEN_GATED" || event.visibility === "NFT_HOLDER") {
    // Token gating is not implemented in the simple contract
    // Allow access by default (check will be handled elsewhere if needed)
    return { allowed: true };
  }

  return { allowed: false, reason: "You don't have access to this event", status: 403 };
}
