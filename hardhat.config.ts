import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Migration to Base Mainnet requires changing ONLY environment variables:
 *   BASE_RPC_URL, BASE_CHAIN_ID, DEPLOYER_PRIVATE_KEY, BASESCAN_API_KEY
 * No contract, backend, or frontend code changes are needed.
 */
const BASE_SEPOLIA_RPC_URL = process.env.BASE_RPC_URL || "https://sepolia.base.org";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: Number(process.env.BASE_CHAIN_ID || 84532),
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    // To migrate to Base Mainnet, point BASE_RPC_URL / BASE_CHAIN_ID at
    // mainnet in your .env and deploy with the same script — this network
    // entry can be reused as-is, or duplicated as `baseMainnet`.
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};

export default config;
