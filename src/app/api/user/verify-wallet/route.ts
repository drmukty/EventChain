import { NextResponse } from "next/server";
import { ethers } from "ethers";

export async function POST(req: Request) {
  try {
    const { walletAddress, signature, message } = await req.json();

    if (!walletAddress || !signature || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error("Wallet verification error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
