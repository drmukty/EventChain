"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Wallet, Check, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const BASE_SEPOLIA_CHAIN_ID_HEX = "0x14a34"; // 84532

export function WalletConnectButton({ currentWallet }: { currentWallet?: string | null }) {
  const [connecting, setConnecting] = useState(false);
  const [wallet, setWallet] = useState(currentWallet ?? null);

  useEffect(() => {
    setWallet(currentWallet ?? null);
  }, [currentWallet]);

  async function connect() {
    if (!window.ethereum) {
      toast.error("MetaMask not found — install it from metamask.io");
      return;
    }
    setConnecting(true);
    try {
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];

      // Switch to Base Sepolia
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
        } else {
          throw switchError;
        }
      }

      // ✅ Link wallet to user account
      const res = await fetch("/api/user/wallet", {
        method: "PATCH",
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("already linked") || data.error?.includes("already in use")) {
          const userInfo = await fetch(`/api/user/by-wallet?address=${address}`)
            .then((r) => r.json())
            .catch(() => null);
          if (userInfo?.user?.name) {
            toast.error(`This wallet is already connected to "${userInfo.user.name}". Please use a different account in MetaMask.`);
          } else {
            toast.error("This wallet is already connected to another account. Please choose a different account in MetaMask.");
          }
        } else {
          toast.error(data.error || "Could not link wallet");
        }
        setConnecting(false);
        return;
      }

      setWallet(address);
      toast.success("Wallet connected!");
      // ✅ Reload to refresh session with wallet address
      window.location.reload();
    } catch (err: any) {
      if (err.code === 4001) {
        toast.error("Connection rejected — please approve the request.");
      } else {
        toast.error(err.message ?? "Connection failed");
      }
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!wallet) return;
    if (!confirm("Remove wallet from your account and sign out?")) return;

    try {
      const res = await fetch("/api/user/wallet", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to disconnect");
        return;
      }
      toast.success("Wallet disconnected");
      setWallet(null);
      await signOut({ redirect: false });
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Disconnect failed");
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          window.location.reload();
        }
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400">
          <Check size={14} /> {wallet.slice(0, 6)}…{wallet.slice(-4)}
        </div>
        <button
          onClick={disconnect}
          className="rounded-full p-2 text-red-400 hover:bg-red-500/10 transition-colors"
          aria-label="Disconnect wallet"
        >
          <LogOut size={16} />
        </button>
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
