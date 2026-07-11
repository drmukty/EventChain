import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export async function notify(
  userId: string,
  input: { type: NotificationType; title: string; message: string; metadata?: Record<string, unknown> }
) {
  return prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata as any,
    },
  });
  // NOTE: this persists an in-app notification. Wire up email/push delivery
  // here too (e.g. Resend, Supabase Edge Functions) if you want out-of-app
  // notifications — kept in-app-only here to avoid requiring extra provider
  // credentials for the app to run.
}
