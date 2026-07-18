"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Hexagon, ShieldCheck, Zap, Clock } from "lucide-react";
import toast from "react-hot-toast";

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

  function load() {
    fetch("/api/me/nfts")
      .then((r) => r.json())
      .then((d) => setNfts(d.nfts ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleComingSoon() {
    toast("🚀 Minting coming soon on Base!", {
      icon: "⏳",
      duration: 4000,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your POAP Gallery</h1>
          <p className="mt-2 text-fg-muted">Your Proof of Attendance badges — minting coming soon on Base.</p>
        </div>
      </div>

      {loading && <p className="mt-10 text-fg-muted">Loading…</p>}

      {!loading && nfts.length === 0 && (
        <div className="mt-16 flex flex-col items-center text-center text-fg-muted">
          <Hexagon className="mb-4 h-10 w-10 text-base-400/60" />
          <p>No badges yet — check in at an event to earn your first one.</p>
        </div>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {nfts.map((nft, i) => (
          <motion.div
            key={nft.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel overflow-hidden rounded-2xl shadow-glass"
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

              {/* Replace mint button with "Coming Soon" */}
              <button
                onClick={handleComingSoon}
                className="mt-4 flex items-center gap-1.5 rounded-full bg-gray-200 px-4 py-2 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                <Clock size={12} />
                Mint coming soon
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
