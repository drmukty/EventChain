import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address parameter" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { walletAddress: address },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user });
}
