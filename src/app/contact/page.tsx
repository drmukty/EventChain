"use client";

import { motion } from "framer-motion";
import { Send } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="mx-auto flex min-h-[75vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full rounded-3xl p-12 shadow-glass"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-base-500/15"
        >
          <Send className="h-7 w-7 text-base-400" />
        </motion.div>

        <h1 className="font-display text-2xl font-semibold">Get in touch</h1>
        <p className="mt-2 text-fg-muted">
          The fastest way to reach the EventChain team is Telegram.
        </p>

        <a
          href="https://t.me/drmukty"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-base-500 px-8 py-3 font-medium text-white shadow-glow transition-transform hover:scale-[1.03]"
        >
          <Send size={16} /> Contact on Telegram
        </a>
      </motion.div>
    </div>
  );
}
