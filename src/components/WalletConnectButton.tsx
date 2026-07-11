"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Wallet, Check } from "lucide-react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const BASE_SEPOLIA_CHAIN_ID_HEX = "0x14a34"; // 84532

export function WalletConnectButton({ currentWallet }: { currentWallet?: string | null }) {
  const [connecting, setConnecting] = useState(false);
  const [wallet, setWallet] = useState(currentWallet ?? null);

  async function connect() {
    if (!window.ethereum) {
      toast.error("MetaMask not found — install it from metamask.io");
      return;
    }
    setConnecting(true);
    try {
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];

      // Prompt a switch to Base Sepolia; if the chain isn't added yet, add it.
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BASE_SEPOLIA_CHAIN_ID_HEX,
                chainName: "Base Sepolia",
                nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://sepolia.base.org"],
                blockExplorerUrls: ["https://sepolia.basescan.org"],
              },
            ],
          });
        }
      }

      const res = await fetch("/api/user/wallet", {
        method: "PATCH",
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not link wallet");

      setWallet(address);
      toast.success("Wallet connected");
    } catch (err: any) {
      toast.error(err.message ?? "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  if (wallet) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400">
        <Check size={14} /> {wallet.slice(0, 6)}…{wallet.slice(-4)}
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={connect}
      disabled={connecting}
      className="flex items-center gap-2 rounded-full bg-base-500 px-5 py-2.5 text-sm font-medium text-white shadow-glow disabled:opacity-60"
    >
      <Wallet size={16} /> {connecting ? "Connecting…" : "Connect MetaMask"}
    </motion.button>
  );
}
