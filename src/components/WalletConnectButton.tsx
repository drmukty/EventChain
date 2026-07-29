"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Wallet, Check, LogOut, Copy } from "lucide-react";
import { useSession } from "next-auth/react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function WalletConnectButton({ currentWallet }: { currentWallet?: string | null }) {
  const { data: session, update } = useSession();
  const [connecting, setConnecting] = useState(false);
  const [wallet, setWallet] = useState(currentWallet ?? null);

  useEffect(() => {
    setWallet(currentWallet ?? null);
  }, [currentWallet]);

  async function connect() {
    if (!window.ethereum) {
      toast.error("No EVM wallet found. Please install MetaMask, Coinbase Wallet, Trust Wallet, OKX Wallet, Bitget Wallet, or any EVM-compatible wallet.");
      return;
    }

    setConnecting(true);
    try {
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        toast.error("No accounts found. Please unlock your wallet.");
        setConnecting(false);
        return;
      }

      const address = accounts[0];

      const checkRes = await fetch(`/api/user/by-wallet?address=${address}`);
      const checkData = await checkRes.json();

      if (checkData.user && checkData.user.id !== (session?.user as any)?.id) {
        toast.error(`This wallet is already connected to "${checkData.user.name || checkData.user.email}". Please use a different wallet.`);
        setConnecting(false);
        return;
      }

      const linkRes = await fetch("/api/user/wallet", {
        method: "PATCH",
        body: JSON.stringify({ walletAddress: address }),
      });
      const linkData = await linkRes.json();

      if (!linkRes.ok) {
        toast.error(linkData.error || "Could not link wallet");
        setConnecting(false);
        return;
      }

      setWallet(address);
      toast.success("Wallet connected! 🎉");
      await update({ walletAddress: address });
      window.location.reload();
    } catch (err: any) {
      console.error("Connect error:", err);
      if (err.code === 4001) {
        toast.error("Connection rejected — please approve the request.");
      } else {
        toast.error(err.message || "Connection failed");
      }
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!wallet) return;

    try {
      const res = await fetch("/api/user/wallet", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to disconnect");
        return;
      }

      toast.success("Wallet disconnected");
      setWallet(null);
      await update({ walletAddress: null });
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Disconnect failed");
    }
  }

  async function copyAddress() {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet);
      toast.success("Address copied to clipboard! 📋");
    } catch {
      toast.error("Failed to copy address");
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
        <button
          onClick={copyAddress}
          className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
          aria-label="Copy wallet address"
        >
          <Check size={14} />
          <span>{wallet.slice(0, 6)}…{wallet.slice(-4)}</span>
          <Copy size={12} className="opacity-50" />
        </button>
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
      <Wallet size={16} /> {connecting ? "Connecting…" : "Connect Wallet"}
    </motion.button>
  );
}
