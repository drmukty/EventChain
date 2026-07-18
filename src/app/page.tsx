"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { QrCode, ShieldCheck, Ticket, Hexagon, ArrowRight } from "lucide-react";

const steps = [
  { icon: Ticket, label: "Apply", desc: "Browse an event and submit your application in seconds." },
  { icon: ShieldCheck, label: "Get approved", desc: "Organizers review and approve — or you land on the waitlist." },
  { icon: QrCode, label: "Check in", desc: "A single-use, encrypted QR code confirms you were really there." },
  { icon: Hexagon, label: "Own the proof", desc: "A Proof-of-Attendance NFT mints straight to your wallet on Base." },
];

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pt-24 pb-32">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-base-500/20 blur-[140px]" />

        <div className="relative grid items-center gap-16 lg:grid-cols-2">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-fg-muted"
            >
              🚀 Coming soon on Base
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
            >
              Attendance you can
              <br />
              <span className="gradient-text">actually prove.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 max-w-md text-lg text-fg-muted"
            >
              EventChain turns every check-in into an encrypted, QR
              code — and every verified attendee into an off‑chain badge or on‑chain NFT.
              No spreadsheets. No fake claims.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-9 flex flex-wrap gap-4"
            >
              <Link
                href="/events"
                className="group inline-flex items-center gap-2 rounded-full bg-base-500 px-6 py-3 font-medium text-white shadow-glow transition-transform hover:scale-[1.03]"
              >
                Browse events
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 font-medium text-fg-muted hover:text-white hover:border-white/20 transition-colors"
              >
                Organizer dashboard
              </Link>
            </motion.div>
          </div>

          {/* Signature element: QR → hex POAP badge morph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative mx-auto flex h-80 w-80 items-center justify-center"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-base-500/20 to-violet-500/10 blur-2xl" />
            <motion.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="hex-badge glass-panel flex h-64 w-64 flex-col items-center justify-center gap-3 shadow-glass animate-float"
            >
              <Hexagon className="h-10 w-10 text-base-400" strokeWidth={1.5} />
              <p className="font-display text-sm font-medium text-fg-muted">Proof of Attendance</p>
              {/* Removed the address and Base Sepolia line */}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Flow */}
      <section className="mx-auto max-w-7xl px-6 pb-32">
        <h2 className="mb-12 text-center font-display text-2xl font-semibold text-fg-muted">
          From application to on-chain proof
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-panel rounded-2xl p-6 shadow-glass"
            >
              <step.icon className="mb-4 h-6 w-6 text-base-400" />
              <p className="font-display font-medium">{step.label}</p>
              <p className="mt-2 text-sm text-fg-muted">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
