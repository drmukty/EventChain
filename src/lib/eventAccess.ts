import { prisma } from "@/lib/prisma";
import type { Event } from "@prisma/client";

type AccessResult = { allowed: true } | { allowed: false; reason: string; status: number };

export async function checkEventAccess(
  event: Event,
  user: { id: string; email: string; role: string } | null
): Promise<AccessResult> {
  if (event.visibility === "PUBLIC") return { allowed: true };
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

  if (event.visibility === "TOKEN_GATED" || event.visibility === "NFT_HOLDER") {
    return { allowed: true };
  }

  return { allowed: false, reason: "You don't have access to this event", status: 403 };
}

export async function hasEventAccess(
  userId: string,
  eventId: string,
  allowedRoles: string[] = ["OWNER", "ADMIN", "VOLUNTEER", "QR_SCANNER"]
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === "ADMIN") return true;

  const membership = await prisma.teamMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });

  if (!membership) return false;
  return allowedRoles.includes(membership.role);
}
