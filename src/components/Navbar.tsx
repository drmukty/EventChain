"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Hexagon, Menu, X, User, Settings, LogOut, UserCircle } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { NotificationBell } from "@/components/NotificationBell";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Image from "next/image";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { data: session } = useSession();
  const [isStaffAnywhere, setIsStaffAnywhere] = useState(false);

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

  const user = session?.user as any;
  const avatarUrl = user?.avatarUrl || user?.image || null;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Hexagon className="h-6 w-6 text-base-500" strokeWidth={2.5} />
          Event<span className="gradient-text">Chain</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-fg-muted md:flex">
          <Link href="/events" className="text-gray-700 dark:text-fg-muted hover:text-black dark:hover:text-white transition-colors">Browse Events</Link>
          {session && (
            <Link href="/my-events" className="text-gray-700 dark:text-fg-muted hover:text-black dark:hover:text-white transition-colors">Joined Events</Link>
          )}
          {session && (
            <Link href="/dashboard/events" className="text-gray-700 dark:text-fg-muted hover:text-black dark:hover:text-white transition-colors">My Events</Link>
          )}
          {session && (
            <Link href="/nft-gallery" className="text-gray-700 dark:text-fg-muted hover:text-black dark:hover:text-white transition-colors">NFT Gallery</Link>
          )}
          {session && (
            <Link href="/dashboard" className="text-gray-700 dark:text-fg-muted hover:text-black dark:hover:text-white transition-colors">Dashboard</Link>
          )}
          {isStaffAnywhere && (
            <Link href="/scan" className="text-gray-700 dark:text-fg-muted hover:text-black dark:hover:text-white transition-colors">Scan</Link>
          )}
          <Link href="/guide" className="text-gray-700 dark:text-fg-muted hover:text-black dark:hover:text-white transition-colors">Guide</Link>
          <Link href="/contact" className="text-gray-700 dark:text-fg-muted hover:text-black dark:hover:text-white transition-colors">Contact</Link>
        </nav>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-full p-2 text-fg-muted hover:bg-gray-100 dark:hover:bg-white/5 md:hidden"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className="flex items-center gap-3">
          <motion.div whileTap={{ scale: 0.96 }}>
            <ThemeToggle />
          </motion.div>

          <NotificationBell />

          {mobileMenuOpen && (
            <div className="absolute right-6 top-20 z-50 w-64 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-ink-950/95 p-4 shadow-2xl backdrop-blur-xl md:hidden">
              <div className="flex flex-col gap-2 text-gray-900 dark:text-white">
                <Link href="/events" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5">Browse Events</Link>
                {session && <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5">Dashboard</Link>}
                {session && <Link href="/my-events" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5">Joined Events</Link>}
                {session && <Link href="/dashboard/events" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5">My Events</Link>}
                {session && <Link href="/nft-gallery" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5">NFT Gallery</Link>}
                {isStaffAnywhere && <Link href="/scan" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5">Scan</Link>}
                <Link href="/guide" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5">User Guide</Link>
                <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5">Contact Us</Link>
                {session ? (
                  <button onClick={() => { setMobileMenuOpen(false); signOut(); }} className="rounded-lg px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/5">Sign Out</button>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5">Sign In</Link>
                )}
              </div>
            </div>
          )}

          {session ? (
            <div className="relative flex items-center gap-3">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={32}
                    height={32}
                    className="rounded-full h-8 w-8 object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-base-500/20 flex items-center justify-center">
                    <User size={16} className="text-base-500" />
                  </div>
                )}
                <span className="text-sm font-medium hidden sm:block">{user?.name || user?.email?.split('@')[0]}</span>
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-ink-950/95 p-2 shadow-2xl backdrop-blur-xl">
                  <div className="flex flex-col gap-1">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5">
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-fg-muted truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <UserCircle size={16} /> Profile
                    </Link>
                    <Link
                      href="/profile?tab=settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <Settings size={16} /> Settings
                    </Link>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); signOut(); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left text-red-500"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden md:block rounded-full bg-base-500 px-4 py-2 text-sm font-medium text-white shadow-glow hover:bg-base-600 transition-colors">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
