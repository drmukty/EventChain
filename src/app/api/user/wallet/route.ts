import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Not a valid EVM address") });

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const conflict = await prisma.user.findUnique({ where: { walletAddress: parsed.data.walletAddress } });
  if (conflict && conflict.id !== (session.user as any).id) {
    return NextResponse.json({ error: "This wallet is already linked to another account" }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: (session.user as any).id },
    data: { walletAddress: parsed.data.walletAddress },
    select: { id: true, walletAddress: true },
  });

  return NextResponse.json({ user });
}
