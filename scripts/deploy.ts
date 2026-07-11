import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying EventChainPOAP with account:", deployer.address);

  // The backend minter wallet is a separate, low-privilege hot wallet used
  // ONLY to call mintAttendance() after a verified check-in. Keep its key
  // in BACKEND_MINTER_PRIVATE_KEY on the server; never in frontend code.
  const backendMinterAddress = process.env.BACKEND_MINTER_ADDRESS || deployer.address;

  const Factory = await ethers.getContractFactory("EventChainPOAP");
  const contract = await Factory.deploy(backendMinterAddress);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("EventChainPOAP deployed to:", address);
  console.log("\nAdd this to your .env file:");
  console.log(`NEXT_PUBLIC_POAP_CONTRACT_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_BASE_CHAIN_ID=${process.env.BASE_CHAIN_ID || 84532}`);
  console.log(`NEXT_PUBLIC_BASE_RPC_URL=${process.env.BASE_RPC_URL || "https://sepolia.base.org"}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
