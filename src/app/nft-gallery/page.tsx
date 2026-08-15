"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { Hexagon, ShieldCheck, ExternalLink, Loader2, Zap, CheckCircle2, Copy } from "lucide-react";
import { truncateAddress } from "@/lib/wallet";

type NFT = {
  id: string;
  isOnChain: boolean;
  tokenId: string | null;
  txHash: string | null;
  mintedAt: string;
  explorerUrl: string | null;
  event: {
    title: string;
    bannerUrl: string | null;
    venue: string;
    startsAt: string;
  };
};

export default function NftGalleryPage() {
  const { data: session, status } = useSession();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [mintingId, setMintingId] = useState<string | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [selectedNftId, setSelectedNftId] = useState<string | null>(null);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const user = session?.user as any;
  const hasWallet = !!(user?.wallets?.length);

  function load() {
    fetch("/api/me/nfts")
      .then((r) => r.json())
      .then((d) => setNfts(d.nfts ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const openMintModal = (nftId: string) => {
    setSelectedNftId(nftId);
    setMintTxHash(null);
    setMintError(null);
    setMasterPassword("");
    setShowMintModal(true);
  };

  const handleMint = async () => {
    if (!selectedNftId) return;
    if (!masterPassword || masterPassword.length < 6) {
      toast.error("Please enter your master password (min 6 characters)");
      return;
    }

    setMintingId(selectedNftId);
    setMintError(null);
    try {
      const res = await fetch("/api/nft/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nftId: selectedNftId,
          masterPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Minting failed");
      }
      setMintTxHash(data.txHash);
      toast.success("NFT minted on-chain! 🎉");
      load();
      setTimeout(() => {
        setShowMintModal(false);
        setMintTxHash(null);
        setSelectedNftId(null);
        setMasterPassword("");
      }, 3000);
    } catch (err: any) {
      console.error("Mint error:", err);
      setMintError(err.message || "Minting failed");
      toast.error(err.message || "Minting failed");
    } finally {
      setMintingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-fg-muted">Loading your badges...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your POAP Gallery</h1>
          <p className="mt-2 text-fg-muted">Every verified attendance badge – mint yours on‑chain.</p>
        </div>
        {!hasWallet && nfts.length > 0 && (
          <div className="mt-1 rounded-full bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
            ⚠️ No platform wallet found – create one in your profile.
          </div>
        )}
      </div>

      {nfts.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-fg-muted">
          <Hexagon className="mb-4 h-10 w-10 text-base-400/60" />
          <p>No badges yet — check in at an event to earn your first one.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {nfts.map((nft) => {
            const isMinting = mintingId === nft.id;
            const isMinted = nft.isOnChain;

            return (
              <motion.div
                key={nft.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel overflow-hidden rounded-2xl shadow-glass transition-all hover:shadow-glow"
              >
                <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-base-500/30 to-violet-500/20">
                  <div className="hex-badge glass-panel flex h-24 w-24 items-center justify-center">
                    <Hexagon className="h-8 w-8 text-base-400" />
                  </div>
                  {isMinted ? (
                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                      <ShieldCheck size={12} /> On‑chain
                    </span>
                  ) : (
                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-medium text-amber-400">
                      <Zap size={12} /> Off‑chain
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <p className="font-display font-semibold">{nft.event.title}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    {nft.event.venue} · {new Date(nft.event.startsAt).toLocaleDateString()}
                  </p>
                  <p className="mt-3 text-xs text-fg-muted">
                    {isMinted
                      ? `Token #${nft.tokenId} · Minted ${new Date(nft.mintedAt).toLocaleDateString()}`
                      : "Not minted yet"}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isMinted ? (
                      <button
                        onClick={() => openMintModal(nft.id)}
                        disabled={isMinting || !hasWallet}
                        className="flex-1 items-center justify-center rounded-full bg-base-500 px-4 py-2 text-xs font-medium text-white shadow-glow hover:bg-base-600 disabled:opacity-60"
                      >
                        {isMinting ? (
                          <>
                            <Loader2 size={14} className="inline animate-spin mr-1" /> Minting…
                          </>
                        ) : (
                          "Mint NFT"
                        )}
                      </button>
                    ) : (
                      nft.explorerUrl && (
                        <a
                          href={nft.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 items-center justify-center rounded-full border border-emerald-500/30 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <ExternalLink size={14} className="inline mr-1" /> View on BaseScan
                        </a>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Mint Modal */}
      {showMintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Mint NFT</h2>
              <button
                onClick={() => {
                  setShowMintModal(false);
                  setMintTxHash(null);
                  setSelectedNftId(null);
                  setMasterPassword("");
                  setMintError(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {mintTxHash ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">NFT Minted! 🎉</h3>
                <p className="text-sm text-fg-muted mb-4">Transaction has been sent successfully.</p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-fg-muted">Tx Hash</p>
                  <div className="flex items-center gap-2 justify-center">
                    <p className="font-mono text-sm break-all">{mintTxHash}</p>
                    <button
                      onClick={() => copyToClipboard(mintTxHash)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <a
                    href={`https://sepolia.basescan.org/tx/${mintTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors inline-flex items-center gap-2 text-sm"
                  >
                    <ExternalLink size={16} />
                    View on Explorer
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-400">
                  ⚠️ You are about to mint an NFT on‑chain. This will send a transaction from your platform wallet.
                  You will pay gas fees (~0.0001 ETH).
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Wallet</label>
                  <p className="text-sm font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded break-all">
                    {user?.wallets?.find((w: any) => w.isDefault)?.address || 'No default wallet'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Network</label>
                  <p className="text-sm">Base Sepolia</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Master Password</label>
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                    placeholder="Enter master password"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleMint();
                    }}
                  />
                </div>
                {mintError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                    {mintError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleMint}
                    disabled={!masterPassword || masterPassword.length < 6}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {mintingId ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Confirm & Mint"}
                  </button>
                  <button
                    onClick={() => {
                      setShowMintModal(false);
                      setMasterPassword("");
                      setSelectedNftId(null);
                      setMintError(null);
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
