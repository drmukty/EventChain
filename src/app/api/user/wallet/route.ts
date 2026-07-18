import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { walletAddress } = await req.json();
  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
  }

  // Check if wallet is already linked to another user
  const existing = await prisma.user.findFirst({
    where: {
      walletAddress: walletAddress,
      NOT: { id: (session.user as any).id },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "This wallet is already linked to another account" },
      { status: 409 }
    );
  }

  const user = await prisma.user.update({
    where: { id: (session.user as any).id },
    data: { walletAddress },
  });

  return NextResponse.json({ user });
}
