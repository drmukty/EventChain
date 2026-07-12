"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  // When middleware redirects an unauthenticated visitor to /login, it
  // appends ?callbackUrl=/original/path so they land back where they were
  // headed after signing in, instead of always being sent to /dashboard.
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) toast.error("Invalid email or password");
    else window.location.href = callbackUrl;
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full rounded-3xl p-8 shadow-glass"
      >
        <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-fg-muted">Sign in to apply for events or manage your own.</p>

        <form onSubmit={handleCredentialsLogin} className="mt-8 space-y-4">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-base-500"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-base-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-base-500 py-3 font-medium text-white shadow-glow disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-fg-muted">
          <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full rounded-xl border border-white/10 py-3 text-sm font-medium hover:bg-white/5"
        >
          Continue with Google
        </button>
        <p className="mt-6 text-center text-sm text-fg-muted">
  Don't have an account?{" "}
  <a
    href="/register"
    className="font-medium text-base-500 hover:underline"
  >
    Sign Up
  </a>
</p>
      </motion.div>
    </div>
  );
}
