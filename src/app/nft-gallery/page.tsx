"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { Hexagon, ExternalLink, ShieldCheck, RefreshCw, Zap } from "lucide-react";
import { WalletConnectButton } from "@/components/WalletConnectButton";

type NFT = {
  id: string;
  isOnChain: boolean;
  tokenId: string | null;
  txHash: string | null;
  mintedAt: string;
  explorerUrl: string | null;
  event: { title: string; bannerUrl: string | null; venue: string; startsAt: string };
};

export default function NftGalleryPage() {
  const { data: session } = useSession();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [mintingId, setMintingId] = useState<string | null>(null);

  const hasWallet = !!(session?.user as any)?.walletAddress;

  function load() {
    fetch("/api/me/nfts")
      .then((r) => r.json())
      .then((d) => setNfts(d.nfts ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleMint(nftId: string) {
    if (!hasWallet) {
      toast.error("Please connect your wallet first");
      return;
    }
    setMintingId(nftId);
    try {
      const res = await fetch("/api/nft/mint", {
        method: "POST",
        body: JSON.stringify({ nftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Minting failed");
      toast.success("NFT minted on‑chain! 🎉");
      load();
    } catch (err: any) {
      toast.error(err.message || "Minting failed");
    } finally {
      setMintingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your NFT gallery</h1>
          <p className="mt-2 text-fg-muted">Every verified attendance, permanently provable.</p>
        </div>
        <div className="mt-1">
          <WalletConnectButton currentWallet={(session?.user as any)?.walletAddress} />
        </div>
      </div>

      {!hasWallet && nfts.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          💡 Connect your wallet above to mint your badges on‑chain.
        </div>
      )}

      {loading && <p className="mt-10 text-fg-muted">Loading…</p>}

      {!loading && nfts.length === 0 && (
        <div className="mt-16 flex flex-col items-center text-center text-fg-muted">
          <Hexagon className="mb-4 h-10 w-10 text-base-400/60" />
          <p>No badges yet — check in at an event to earn your first one.</p>
        </div>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {nfts.map((nft, i) => {
          const isMinting = mintingId === nft.id;
          const canMint = !nft.isOnChain && hasWallet;

          return (
            <motion.div
              key={nft.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                if (!nft.isOnChain) {
                  if (hasWallet) {
                    handleMint(nft.id);
                  } else {
                    toast.error("Please connect your wallet first");
                  }
                }
              }}
              className={`glass-panel overflow-hidden rounded-2xl shadow-glass transition-all ${
                !nft.isOnChain && hasWallet
                  ? "cursor-pointer hover:ring-2 hover:ring-base-500/50"
                  : ""
              }`}
            >
              <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-base-500/30 to-violet-500/20">
                <div className="hex-badge glass-panel flex h-24 w-24 items-center justify-center">
                  <Hexagon className="h-8 w-8 text-base-400" />
                </div>
                {nft.isOnChain && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                    <ShieldCheck size={12} /> On-chain
                  </span>
                )}
                {!nft.isOnChain && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-medium text-amber-400">
                    <Zap size={12} /> Off-chain
                  </span>
                )}
              </div>
              <div className="p-5">
                <p className="font-display font-semibold">{nft.event.title}</p>
                <p className="mt-1 text-xs text-fg-muted">
                  {nft.event.venue} · {new Date(nft.event.startsAt).toLocaleDateString()}
                </p>
                <p className="mt-3 text-xs text-fg-muted">
                  Minted {new Date(nft.mintedAt).toLocaleDateString()}
                  {nft.tokenId && ` · Token #${nft.tokenId}`}
                </p>

                {nft.isOnChain ? (
                  nft.explorerUrl && (
                    <a
                      href={nft.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-base-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View on Base Explorer <ExternalLink size={12} />
                    </a>
                  )
                ) : hasWallet ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMint(nft.id);
                    }}
                    disabled={isMinting}
                    className="mt-4 flex items-center gap-1.5 rounded-full bg-base-500 px-4 py-2 text-xs font-medium text-white shadow-glow hover:bg-base-600 disabled:opacity-60"
                  >
                    <RefreshCw size={12} className={isMinting ? "animate-spin" : ""} />
                    {isMinting ? "Minting…" : "Mint NFT"}
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.error("Connect your wallet first");
                    }}
                    className="mt-4 flex items-center gap-1.5 rounded-full bg-gray-200 px-4 py-2 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    Connect wallet to mint
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
