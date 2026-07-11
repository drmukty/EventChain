"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Hexagon } from "lucide-react";

export default function LiveCheckInPage() {
  const { id } = useParams<{ id: string }>();
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    const load = () =>
      fetch(`/api/events/${id}/checkins`)
        .then((r) => r.json())
        .then((d) => {
          setCheckIns(d.checkIns ?? []);
          setStats(d.stats ?? {});
        });
    load();
    const interval = setInterval(load, 4000); // near-real-time without a websocket server
    return () => clearInterval(interval);
  }, [id]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Live check-in</h1>
      <p className="mt-2 text-fg-muted">Updates automatically every few seconds.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Approved", stats.approved],
          ["Checked in", stats.checkedIn],
          ["No-shows", stats.noShows],
          ["NFTs minted", stats.nftsMinted],
        ].map(([label, value]) => (
          <div key={label as string} className="glass-panel rounded-2xl p-4 text-center shadow-glass">
            <p className="font-display text-2xl font-semibold">{value ?? 0}</p>
            <p className="text-xs text-fg-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-2">
        <AnimatePresence initial={false}>
          {checkIns.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel flex items-center justify-between rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium">{c.user.name ?? c.user.email}</p>
                  <p className="text-xs text-fg-muted">{new Date(c.checkedInAt).toLocaleTimeString()}</p>
                </div>
              </div>
              {c.nft?.isOnChain ? (
                <span className="flex items-center gap-1 rounded-full bg-base-500/15 px-2.5 py-1 text-[10px] font-medium text-base-400">
                  <Hexagon size={11} /> Minted
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-fg-muted">Badge issued</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
