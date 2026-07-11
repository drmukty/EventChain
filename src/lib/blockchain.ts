import { ethers } from "ethers";

/**
 * Server-side minter. Uses a dedicated low-privilege hot wallet
 * (BACKEND_MINTER_PRIVATE_KEY) that only holds the MINTER_ROLE on the POAP
 * contract — it cannot upgrade, pause, or transfer contract ownership.
 *
 * MIGRATION NOTE: to move from Base Sepolia to Base Mainnet, change only:
 *   NEXT_PUBLIC_BASE_RPC_URL, NEXT_PUBLIC_BASE_CHAIN_ID,
 *   NEXT_PUBLIC_POAP_CONTRACT_ADDRESS, BACKEND_MINTER_PRIVATE_KEY
 * No code in this file (or anywhere else) needs to change.
 */

const POAP_ABI = [
  "function mintAttendance(address attendee, bytes32 eventIdHash, string calldata uri) external returns (uint256)",
  "event AttendanceMinted(address indexed attendee, uint256 indexed tokenId, bytes32 indexed eventIdHash, string tokenURI)",
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

export function eventIdHash(eventId: string) {
  return ethers.keccak256(ethers.toUtf8Bytes(eventId));
}

const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];
const ERC721_ABI = ["function balanceOf(address owner) view returns (uint256)"];

/**
 * Checks whether a wallet holds at least `minBalance` of the gating token.
 * Used for TOKEN_GATED and NFT_HOLDER events. Both ERC-20 and ERC-721 expose
 * an identical `balanceOf(address) → uint256` signature, so one ABI covers
 * both — the event organizer is responsible for pointing tokenGateAddress at
 * the correct contract type.
 */
export async function checkTokenGateBalance(params: {
  walletAddress: string;
  tokenContractAddress: string;
  minBalance: number;
}): Promise<{ eligible: boolean; balance: string }> {
  const provider = getProvider();
  const contract = new ethers.Contract(params.tokenContractAddress, ERC20_ABI.concat(ERC721_ABI), provider);
  const balance: bigint = await contract.balanceOf(params.walletAddress);
  return {
    eligible: balance >= BigInt(params.minBalance),
    balance: balance.toString(),
  };
}

export async function mintAttendanceNFT(params: {
  attendeeWallet: string;
  eventId: string;
  metadataUrl: string;
}) {
  const contract = getContract();
  const hash = eventIdHash(params.eventId);

  const tx = await contract.mintAttendance(params.attendeeWallet, hash, params.metadataUrl);
  const receipt = await tx.wait();

  // Pull the tokenId out of the AttendanceMinted event log.
  const iface = new ethers.Interface(POAP_ABI);
  let tokenId: string | undefined;
  for (const log of receipt.logs) {
    try {
      const parsedLog = iface.parseLog(log);
      if (parsedLog?.name === "AttendanceMinted") {
        tokenId = parsedLog.args.tokenId.toString();
        break;
      }
    } catch {
      // not our event, ignore
    }
  }

  return {
    txHash: receipt.hash as string,
    tokenId,
    contractAddress: await contract.getAddress(),
    chainId: Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID),
    explorerUrl: `https://sepolia.basescan.org/tx/${receipt.hash}`,
  };
}
