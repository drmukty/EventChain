"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, UserPlus, Wallet, Search, QrCode, Hexagon, FileCheck, Users, HelpCircle } from "lucide-react";

const sections = [
  {
    icon: UserPlus,
    title: "Creating an account & signing in",
    body: "Sign up with email and password, or continue with Google. Your role (Attendee, Organizer, Volunteer, QR Scanner, or Admin) determines what you can do next — you can hold different roles on different events.",
  },
  {
    icon: Wallet,
    title: "Connecting MetaMask",
    body: "Open your profile and click Connect Wallet. Approve the connection in MetaMask and confirm you're on Base Sepolia. No wallet? You can still attend — you'll receive an off-chain badge instead of an on-chain POAP.",
  },
  {
    icon: Search,
    title: "Browsing & applying for events",
    body: "Search by name, category, organizer, location, or date on the Events page. Open an event and click Apply. If the event is full, you're placed on the waitlist automatically and notified if a spot opens up.",
  },
  {
    icon: FileCheck,
    title: "Approval & waitlist",
    body: "Organizers review pending applications and approve or reject them. Approval instantly generates your secure, single-use QR code. If an approved attendee cancels, the next person on the waitlist is promoted automatically.",
  },
  {
    icon: QrCode,
    title: "QR code & check-in",
    body: "Download your QR code from your dashboard. At the event, a Volunteer or QR Scanner scans it once. The code is encrypted, expires after the event, and cannot be reused or tampered with.",
  },
  {
    icon: Hexagon,
    title: "NFT & certificate",
    body: "A verified check-in mints a Proof-of-Attendance NFT to your connected wallet on Base Sepolia — view it in your NFT Gallery with a link to the block explorer. A downloadable PDF certificate is generated at the same time.",
  },
  {
    icon: Users,
    title: "Organizer & volunteer guide",
    body: "Organizers create events, set capacity and visibility (public, private, token-gated, or NFT-holder only), and manage a team with Owner, Admin, Volunteer, and QR Scanner roles — each with different permissions.",
  },
  {
    icon: HelpCircle,
    title: "FAQ & troubleshooting",
    body: "QR code not scanning? Make sure it hasn't already been used and the event hasn't ended. NFT not showing up? Confirm your wallet was connected before check-in — otherwise you'll have received an off-chain badge instead.",
  },
];

export default function GuidePage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">User guide</h1>
      <p className="mt-2 text-fg-muted">Everything you need to go from sign-up to on-chain proof.</p>

      <div className="mt-10 space-y-3">
        {sections.map((s, i) => (
          <div key={s.title} className="glass-panel overflow-hidden rounded-2xl">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
            >
              <span className="flex items-center gap-3 font-medium">
                <s.icon className="h-5 w-5 text-base-400" /> {s.title}
              </span>
              <motion.span animate={{ rotate: open === i ? 180 : 0 }}>
                <ChevronDown size={18} className="text-fg-muted" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6"
                >
                  <p className="pb-5 text-sm leading-relaxed text-fg-muted">{s.body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
