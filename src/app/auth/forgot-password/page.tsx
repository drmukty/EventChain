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
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Check your email
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            We've sent a reset link to <strong>{email}</strong>.<br />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              It expires in 1 hour.
            </span>
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 text-sm text-base-500 hover:underline"
          >
            <ArrowLeft size={16} /> Back to login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to login
        </Link>

        <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-white">
          Forgot password?
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Enter your email – we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-base-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-base-500 py-3 font-medium text-white transition hover:bg-base-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
