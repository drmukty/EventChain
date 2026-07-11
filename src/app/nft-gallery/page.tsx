"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Hexagon, ExternalLink, ShieldCheck } from "lucide-react";

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
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/nfts")
      .then((r) => r.json())
      .then((d) => setNfts(d.nfts ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Your NFT gallery</h1>
      <p className="mt-2 text-fg-muted">Every verified attendance, permanently provable.</p>

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
              {nft.explorerUrl ? (
                <a
                  href={nft.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-base-400 hover:underline"
                >
                  View on Base Explorer <ExternalLink size={12} />
                </a>
              ) : (
                <p className="mt-4 text-xs text-fg-muted">Off-chain badge — connect a wallet next time for an on-chain POAP.</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
