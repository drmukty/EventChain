"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, UserPlus, Wallet, Search, QrCode, Hexagon, FileCheck, Users, HelpCircle, Sparkles } from "lucide-react";

const sections = [
  {
    icon: UserPlus,
    title: "Creating an account & signing in",
    steps: [
      "Click 'Sign Up' on the top right corner.",
      "Enter your email and create a password (minimum 8 characters).",
      "Check your email for a verification link — click to confirm.",
      "Sign in with your credentials to access all features."
    ],
    tip: "Forgot your password? Use the 'Forgot Password?' link on the login page — we'll send you a reset link instantly to your email.",
  },
  {
    icon: Wallet,
    title: "Connecting MetaMask",
    steps: [
      "Open your profile and click 'Connect Wallet'.",
      "Approve the connection in MetaMask.",
      "Confirm you're on the Base network.",
      "Your wallet address will appear as a badge in the navbar.",
      "No wallet? You can still attend — you'll receive an off-chain badge instead of an on-chain POAP."
    ],
    tip: "Make sure you're connected to Base network for on-chain minting. You can switch networks in MetaMask.",
  },
  {
    icon: Search,
    title: "Browsing & applying for events",
    steps: [
      "Visit the 'Browse Events' page to see all available events.",
      "Use the search bar to filter by name, category, or location.",
      "Click on any event card to view full details.",
      "Write a short message explaining why you want to attend (optional).",
      "Submit your application — you'll receive a confirmation notification."
    ],
    tip: "You can see all your applications in the 'Joined Events' page with real-time status updates.",
  },
  {
    icon: FileCheck,
    title: "Approval & waitlist",
    steps: [
      "Organizers review applications and approve or reject them.",
      "If the event is full, you'll be placed on the waitlist.",
      "You'll receive a notification when you're promoted from the waitlist.",
      "Approved attendees get a QR code to use for check-in.",
      "Check your application status anytime in 'Joined Events'."
    ],
    tip: "Waitlist positions are first-come, first-served. A spot might open up if someone cancels!",
  },
  {
    icon: QrCode,
    title: "QR code & check-in",
    steps: [
      "Approved attendees receive a unique, encrypted QR code.",
      "On event day, present your QR code at the entrance.",
      "The organizer or volunteer scans it using the EventChain scanner.",
      "Once scanned, you're marked as 'Checked In' — your attendance is verified.",
      "QR codes never expire, but they can only be used once."
    ],
    tip: "Your QR code is valid forever, but can only be used once — keep it safe and show it only to authorized personnel.",
  },
  {
    icon: Hexagon,
    title: "NFT & certificate",
    steps: [
      "After check-in, you can download your Certificate of Attendance.",
      "Certificates are available immediately after check-in — no need to wait!",
      "Visit the NFT Gallery to view all your badges.",
      "Off-chain badges are available immediately after check-in.",
      "On-chain minting (coming soon) will let you claim POAPs on Base.",
      "Connect your wallet to mint NFTs when the feature launches."
    ],
    tip: "Certificates are available right after check-in. Old certificates are automatically replaced when you download a new one.",
  },
  {
    icon: Users,
    title: "Organizer & volunteer guide",
    steps: [
      "Create events from your dashboard — add title, venue, capacity, and dates.",
      "Review applications in the 'Applications' tab of each event.",
      "Approve or reject applicants with one click.",
      "Assign volunteers to help manage the event.",
      "Use the 'Scan' page to check in attendees at the venue.",
      "The scan page only shows events you organize or volunteer for."
    ],
    tip: "You can add team members with different roles: Owner, Admin, Volunteer, or QR Scanner.",
  },
  {
    icon: HelpCircle,
    title: "FAQ & troubleshooting",
    steps: [
      "Q: I didn't receive the reset link. A: Check your spam folder or request a new link.",
      "Q: My QR code isn't scanning. A: Make sure you're on the correct event in the scanner.",
      "Q: Can I cancel my application? A: Yes, from the 'Joined Events' page.",
      "Q: What's the difference between off-chain and on-chain? A: Off-chain badges are free and instant. On-chain POAPs are NFTs minted on Base (coming soon).",
      "Q: I'm having technical issues. A: Contact us via the 'Contact' page for support."
    ],
    tip: "If you need immediate help, reach out to the event organizer directly or use the Contact page.",
  }
];

export default function GuidePage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-base-500/10 px-4 py-1.5 text-xs font-medium text-base-400">
          <Sparkles size={14} />
          User Guide
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">Everything you need to know</h1>
        <p className="mt-2 text-fg-muted">From sign-up to on-chain proof — here's your complete guide.</p>
      </div>

      <div className="mt-10 space-y-3">
        {sections.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-panel overflow-hidden rounded-2xl"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
            >
              <span className="flex items-center gap-3 font-medium text-gray-900 dark:text-white">
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
                  className="px-6 pb-5"
                >
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    {s.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-base-400 text-xs font-bold mt-0.5">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                  {s.tip && (
                    <div className="mt-3 rounded-xl border border-base-500/20 bg-base-500/5 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                        <span className="font-medium text-base-400 mt-0.5">💡 Tip:</span>
                        {s.tip}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
