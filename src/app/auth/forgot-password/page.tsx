"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Something went wrong"); return; }
      setSent(true);
      toast.success("Check your email for the reset link.");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="mt-3 text-fg-muted">We’ve sent a reset link to <strong>{email}</strong>.<br/><span className="text-xs text-fg-muted/60">It expires in 1 hour.</span></p>
          <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm text-base-400 hover:underline"><ArrowLeft size={16} /> Back to login</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-white transition-colors"><ArrowLeft size={16} /> Back to login</Link>
        <h1 className="mt-6 text-2xl font-semibold">Forgot password?</h1>
        <p className="mt-2 text-fg-muted">Enter your email – we'll send you a link to reset your password.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-muted">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-fg-muted/50 focus:outline-none focus:ring-2 focus:ring-base-500" required />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-base-500 py-3 font-medium text-white transition hover:bg-base-600 disabled:opacity-60">
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
