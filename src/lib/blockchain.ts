import { ethers } from "ethers";

const POAP_ABI = [
  "function safeMint(address to, string memory uri) external",
  "event AttendanceMinted(address indexed attendee, uint256 indexed tokenId, string uri)",
];

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL, {
    chainId: Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID),
    name: "base-sepolia",
  });
}

function getMinterWallet() {
  const key = process.env.BACKEND_MINTER_PRIVATE_KEY;
  if (!key) throw new Error("BACKEND_MINTER_PRIVATE_KEY is not configured");
  return new ethers.Wallet(key, getProvider());
}

function getContract() {
  const address = process.env.NEXT_PUBLIC_POAP_CONTRACT_ADDRESS;
  if (!address) throw new Error("NEXT_PUBLIC_POAP_CONTRACT_ADDRESS is not configured");
  return new ethers.Contract(address, POAP_ABI, getMinterWallet());
}

export async function mintAttendanceNFT(params: {
  attendeeWallet: string;
  eventId: string;
  metadataUrl: string;
}) {
  const contract = getContract();
  const tx = await contract.safeMint(params.attendeeWallet, params.metadataUrl);
  const receipt = await tx.wait();

  const iface = new ethers.Interface(POAP_ABI);
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

  return {
    txHash: receipt.hash,
    tokenId,
    contractAddress: await contract.getAddress(),
    chainId: Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID),
  };
}
