"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [reset, setReset] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Something went wrong"); return; }
      setReset(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (reset) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
          <div className="mb-6 flex justify-center"><div className="rounded-full bg-green-500/10 p-4"><CheckCircle className="h-10 w-10 text-green-400" /></div></div>
          <h1 className="text-2xl font-semibold">Password reset!</h1>
          <p className="mt-3 text-fg-muted">Your password has been reset. Redirecting to login...</p>
          <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm text-base-400 hover:underline"><ArrowLeft size={16} /> Go to login</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-2 text-fg-muted">Enter your new password below.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-muted">New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-fg-muted/50 focus:outline-none focus:ring-2 focus:ring-base-500" required minLength={8} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-muted">Confirm password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your new password" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-fg-muted/50 focus:outline-none focus:ring-2 focus:ring-base-500" required />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-base-500 py-3 font-medium text-white transition hover:bg-base-600 disabled:opacity-60">
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
