import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptPrivateKey } from "@/lib/wallet";
import { ethers } from "ethers";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { nftId, masterPassword } = body;

  if (!nftId || !masterPassword) {
    return NextResponse.json(
      { error: "Missing required fields: nftId, masterPassword" },
      { status: 400 }
    );
  }

  // Get the NFT
  const nft = await prisma.nFT.findUnique({
    where: { id: nftId },
    include: {
      user: true,
      event: true,
    },
  });

  if (!nft) {
    return NextResponse.json({ error: "NFT not found" }, { status: 404 });
  }

  if (nft.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (nft.isOnChain) {
    return NextResponse.json({ error: "NFT already minted" }, { status: 400 });
  }

  // Get the user's default wallet
  const wallet = await prisma.wallet.findFirst({
    where: { userId, isDefault: true },
  });

  if (!wallet) {
    return NextResponse.json(
      { error: "No default wallet found. Please set a default wallet first." },
      { status: 400 }
    );
  }

  // Decrypt private key
  let privateKey: string;
  try {
    privateKey = decryptPrivateKey(wallet.encryptedKey, masterPassword);
  } catch {
    return NextResponse.json(
      { error: "Invalid master password" },
      { status: 400 }
    );
  }

  // Get contract address and metadata
  const contractAddress = process.env.NEXT_PUBLIC_POAP_CONTRACT_ADDRESS;
  if (!contractAddress) {
    return NextResponse.json(
      { error: "Contract address not configured" },
      { status: 500 }
    );
  }

  const metadataUrl = nft.metadataUrl || `/api/nft/metadata/${nft.eventId}`;

  // Send transaction
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org");
  const signer = new ethers.Wallet(privateKey, provider);

  const abi = ["function safeMint(address to, string memory uri) external"];
  const contract = new ethers.Contract(contractAddress, abi, signer);

  try {
    const tx = await contract.safeMint(wallet.address, metadataUrl);
    const receipt = await tx.wait();

    // Extract tokenId from logs
    const iface = new ethers.Interface(abi);
    let tokenId = "0";
    for (const log of receipt.logs) {
      try {
        const parsedLog = iface.parseLog(log);
        if (parsedLog?.name === "AttendanceMinted") {
          tokenId = parsedLog.args.tokenId.toString();
          break;
        }
      } catch {}
    }

    // Update NFT record
    await prisma.nFT.update({
      where: { id: nftId },
      data: {
        isOnChain: true,
        txHash: tx.hash,
        tokenId,
        contractAddr: contractAddress,
        chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532"),
      },
    });

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      tokenId,
      message: "NFT minted successfully!",
    });
  } catch (error: any) {
    console.error("NFT mint error:", error);
    return NextResponse.json(
      { error: error.message || "Transaction failed" },
      { status: 500 }
    );
  }
}
