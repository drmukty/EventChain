"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { User, Mail, Lock, Save, Loader2 } from "lucide-react";
import Image from "next/image";
import { AvatarUpload } from "@/components/Profile/AvatarUpload";
import { StatsCard } from "@/components/Profile/StatsCard";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ events: 0, nfts: 0, certificates: 0 });
  const [telegramId, setTelegramId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      router.push("/login");
      return;
    }
    const user = session.user as any;
    setName(user.name || "");
    setEmail(user.email || "");
    setAvatarUrl(user.avatarUrl || user.image || null);
    setTelegramId(user.telegramId || null);

    fetch("/api/user/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, router]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Update failed");
        return;
      }
      toast.success("Profile updated!");
      await update();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-base-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Profile</h1>
      <p className="mt-2 text-fg-muted">Manage your account details.</p>

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="glass-panel rounded-2xl p-6 text-center">
            <div className="relative mx-auto h-32 w-32">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  fill
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-base-500/20">
                  <User className="h-16 w-16 text-base-500" />
                </div>
              )}
              <AvatarUpload
                currentAvatar={avatarUrl}
                onAvatarUpdate={(url) => {
                  setAvatarUrl(url);
                  update();
                }}
              />
            </div>
            <p className="mt-4 font-medium">{name || "User"}</p>
            <p className="text-sm text-fg-muted">{email}</p>
            <StatsCard stats={stats} />
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Account Settings</h2>
            <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-muted">Full Name</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-base-500"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-muted">Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-base-500"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-base-500 py-3 text-sm font-medium text-white transition hover:bg-base-600 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="text-lg font-semibold">Security</h3>
              <Link
                href="/profile/change-password"
                className="mt-4 inline-flex items-center gap-2 text-sm text-base-400 hover:underline"
              >
                <Lock className="h-4 w-4" /> Change Password
              </Link>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="text-lg font-semibold">Telegram</h3>
              <p className="text-sm text-fg-muted mt-2">
                {telegramId ? (
                  <>Connected to <span className="text-base-400">@{telegramId}</span></>
                ) : (
                  "Not connected"
                )}
              </p>
              <button
                onClick={() => {
                  toast.info("Telegram connection coming soon");
                }}
                className="mt-3 rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
              >
                {telegramId ? "Disconnect" : "Connect Telegram"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
