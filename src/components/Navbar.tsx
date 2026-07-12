"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Hexagon } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { NotificationBell } from "@/components/NotificationBell";

export function Navbar() {
  const [isDark, setIsDark] = useState(true);
  const { data: session } = useSession();
  const [isStaffAnywhere, setIsStaffAnywhere] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    if (!session) {
      setIsStaffAnywhere(false);
      return;
    }
    fetch("/api/me/access")
      .then((r) => r.json())
      .then((d) => setIsStaffAnywhere(!!d.isStaffAnywhere))
      .catch(() => setIsStaffAnywhere(false));
  }, [session]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Hexagon className="h-6 w-6 text-base-500" strokeWidth={2.5} />
          Event<span className="gradient-text">Chain</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-fg-muted md:flex">
          <Link href="/events" className="hover:text-white transition-colors">Browse Events</Link>
          {session && (
            <Link href="/my-events" className="hover:text-white transition-colors">My Events</Link>
          )}
          {session && (
            <Link href="/nft-gallery" className="hover:text-white transition-colors">NFT Gallery</Link>
          )}
          {session && (
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          )}
          {isStaffAnywhere && (
            <Link href="/scan" className="hover:text-white transition-colors">Scan</Link>
          )}
          <Link href="/guide" className="hover:text-white transition-colors">Guide</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </nav>

        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9, rotate: 180 }}
            onClick={() => setIsDark((v) => !v)}
            className="rounded-full p-2 text-fg-muted hover:bg-white/5"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>

          <NotificationBell />

          {session ? (
            <button
              onClick={() => signOut()}
              className="rounded-full bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-base-500 px-4 py-2 text-sm font-medium text-white shadow-glow hover:bg-base-600 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
