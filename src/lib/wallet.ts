import { ethers } from 'ethers';
import { prisma } from './prisma';
import crypto from 'crypto';

// Network configuration
export const NETWORKS = {
  baseSepolia: {
    id: 'baseSepolia',
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    symbol: 'ETH',
    blockExplorer: 'https://sepolia.basescan.org',
  },
  robinhood: {
    id: 'robinhood',
    name: 'Robinhood Testnet',
    chainId: 46630,
    rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
    symbol: 'ETH',
    blockExplorer: 'https://explorer.testnet.chain.robinhood.com',
  },
} as const;

export type NetworkId = keyof typeof NETWORKS;

export const DEFAULT_NETWORK: NetworkId = 'baseSepolia';

// Encryption helpers
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(masterPassword: string): Buffer {
  return crypto.scryptSync(masterPassword, 'salt', 32);
}

export function encryptPrivateKey(privateKey: string, masterPassword: string): string {
  const key = getKey(masterPassword);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptPrivateKey(encryptedData: string, masterPassword: string): string {
  const key = getKey(masterPassword);
  const parts = encryptedData.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted data');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function createWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

export function importWallet(privateKey: string): string {
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}

export async function getBalance(address: string, networkId: NetworkId): Promise<string> {
  const network = NETWORKS[networkId];
  if (!network) throw new Error(`Network ${networkId} not found`);
  const provider = new ethers.JsonRpcProvider(network.rpcUrl);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

export async function sendTransaction(
  privateKey: string,
  to: string,
  amount: string,
  networkId: NetworkId
): Promise<{ txHash: string; receipt: any }> {
  const network = NETWORKS[networkId];
  if (!network) throw new Error(`Network ${networkId} not found`);
  const provider = new ethers.JsonRpcProvider(network.rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const tx = await wallet.sendTransaction({
    to,
    value: ethers.parseEther(amount),
  });
  const receipt = await tx.wait();
  return { txHash: tx.hash, receipt };
}

export function getExplorerUrl(txHash: string, networkId: NetworkId): string {
  const network = NETWORKS[networkId];
  if (!network) return '#';
  return `${network.blockExplorer}/tx/${txHash}`;
}

export async function getWalletBalances(address: string): Promise<Record<NetworkId, string>> {
  const balances: Record<NetworkId, string> = {} as any;
  for (const [id, network] of Object.entries(NETWORKS)) {
    try {
      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const balance = await provider.getBalance(address);
      balances[id as NetworkId] = ethers.formatEther(balance);
    } catch {
      balances[id as NetworkId] = '0.0';
    }
  }
  return balances;
}

export function isValidPrivateKey(privateKey: string): boolean {
  try {
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
}

export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
