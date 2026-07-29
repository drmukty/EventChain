"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Wallet, Check, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function WalletConnectButton({ currentWallet }: { currentWallet?: string | null }) {
  const { data: session } = useSession();
  const [connecting, setConnecting] = useState(false);
  const [wallet, setWallet] = useState(currentWallet ?? null);

  useEffect(() => {
    setWallet(currentWallet ?? null);
  }, [currentWallet]);

  async function connect() {
    // ✅ If no wallet, silently return
    if (!window.ethereum) {
      return;
    }

    setConnecting(true);
    try {
      // ✅ ONLY check if already connected – NO popup
      const accounts: string[] = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length === 0) {
        toast.error(
          "No wallet connected. Please open your wallet extension and unlock it, then click 'Connect Wallet' again."
        );
        setConnecting(false);
        return;
      }

      const address = accounts[0];

      // ✅ Check if wallet is already linked to another account
      const checkRes = await fetch(`/api/user/by-wallet?address=${address}`);
      const checkData = await checkRes.json();

      if (checkData.user && checkData.user.id !== (session?.user as any)?.id) {
        toast.error(`This wallet is already connected to "${checkData.user.name || checkData.user.email}". Please use a different wallet.`);
        setConnecting(false);
        return;
      }

      // ✅ Link wallet to user account
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
      toast.success("Wallet linked! 🎉");
      window.location.reload();
    } catch (err: any) {
      console.error("Connect error:", err);
      toast.error(err.message || "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!wallet) return;
    if (!confirm("Remove wallet from your account and sign out?")) return;

    try {
      const res = await fetch("/api/user/wallet", { method: "DELETE" });
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
      <Wallet size={16} /> {connecting ? "Connecting…" : "Connect Wallet"}
    </motion.button>
  );
}
