"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Wallet, Check, LogOut, Copy } from "lucide-react";
import { useSession } from "next-auth/react";
import { ethers } from "ethers";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function WalletConnectButton({ currentWallet }: { currentWallet?: string | null }) {
  const { data: session, update } = useSession();
  const [connecting, setConnecting] = useState(false);
  const [wallet, setWallet] = useState<string | null>(currentWallet ?? null);

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
      // 1️⃣ Connect wallet
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        toast.error("No accounts found. Please unlock your wallet.");
        setConnecting(false);
        return;
      }

      const address = accounts[0];

      // 2️⃣ Request signature
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const message = `Sign this message to verify ownership of wallet ${address} for Block Pass.`;
      const signature = await signer.signMessage(message);

      // 3️⃣ Verify signature
      const verifyRes = await fetch("/api/user/verify-wallet", {
        method: "POST",
        body: JSON.stringify({ walletAddress: address, signature, message }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        toast.error(verifyData.error || "Signature verification failed");
        setConnecting(false);
        return;
      }

      // 4️⃣ Check if already linked
      const checkRes = await fetch(`/api/user/by-wallet?address=${address}`);
      const checkData = await checkRes.json();

      if (checkData.user && checkData.user.id !== (session?.user as any)?.id) {
        toast.error(`This wallet is already connected to another account.`);
        setConnecting(false);
        return;
      }

      // 5️⃣ Link wallet
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
      await update({ walletAddress: address });
      toast.success("Wallet connected and verified! 🎉");
    } catch (err: any) {
      console.error("Connect error:", err);
      if (err.code === 4001) {
        toast.error("Connection or signature rejected — please approve the request.");
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
          const newAddress = accounts[0];
          if (newAddress !== wallet) {
            setWallet(newAddress);
            update({ walletAddress: newAddress });
          }
        }
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, [wallet, update]);

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="flex items-center gap-2 rounded-full border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors" onClick={copyAddress} aria-label="Copy wallet address">
          <Check size={14} />
          <span>{wallet.slice(0, 6)}…{wallet.slice(-4)}</span>
          <Copy size={12} className="opacity-50" />
        </Button>
        <Button variant="ghost" className="rounded-full p-2 text-red-400 hover:bg-red-500/10" onClick={disconnect} aria-label="Disconnect wallet">
          <LogOut size={16} />
        </Button>
      </div>
    );
  }

  return (
    <motion.div whileTap={{ scale: 0.96 }}>
      <Button variant="primary" className="flex items-center gap-2 rounded-full bg-base-500 px-5 py-2.5 text-sm font-medium text-white shadow-glow disabled:opacity-60" onClick={connect} disabled={connecting}>
        <Wallet size={16} /> {connecting ? "Connecting…" : "Connect Wallet"}
      </Button>
    </motion.div>
  );
}
