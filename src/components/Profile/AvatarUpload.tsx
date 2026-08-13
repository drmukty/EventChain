"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { User, Mail, Lock, Save, Loader2, Eye, EyeOff } from "lucide-react";
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

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setChangingPassword(false);
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

        <div className="md:col-span-2 space-y-6">
          {/* Account Settings */}
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
          </div>

          {/* Security - Change Password inline */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold">Security</h3>

            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="mt-4 inline-flex items-center gap-2 text-sm text-base-400 hover:underline"
              >
                <Lock className="h-4 w-4" /> Change Password
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fg-muted">
                    Current Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-base-500"
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-white"
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted">
                    New Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-base-500"
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-white"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-base-500"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="flex-1 rounded-xl bg-base-500 py-2 text-sm font-medium text-white transition hover:bg-base-600 disabled:opacity-60"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="flex-1 rounded-xl border border-white/10 py-2 text-sm font-medium text-fg-muted hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Telegram */}
          <div className="glass-panel rounded-2xl p-6">
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
                toast("Telegram connection coming soon");
              }}
              className="mt-3 rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
            >
              {telegramId ? "Disconnect" : "Connect Telegram"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
