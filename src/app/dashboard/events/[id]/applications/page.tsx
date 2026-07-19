"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Check, X, UserPlus, Loader2, MessageSquare } from "lucide-react";

export default function EventApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/events/${id}/applications?status=${filter}`)
      .then((r) => r.json())
      .then((d) => setApplications(d.applications ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id, filter]);

  async function act(applicationId: string, action: "approve" | "reject") {
    setActingOn(applicationId);
    try {
      const res = await fetch(`/api/applications/${applicationId}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Failed to ${action} application`);
        return;
      }
      toast.success(action === "approve" ? "Approved — QR sent" : "Rejected");
      load();
    } finally {
      setActingOn(null);
    }
  }

  async function assignVolunteer(userId: string) {
    setActingOn(userId);
    try {
      const res = await fetch(`/api/events/${id}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: "VOLUNTEER" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not assign volunteer");
        return;
      }
      toast.success("Assigned as Volunteer for this event");
      load();
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-gray-900 dark:text-white">Applications</h1>

      <div className="mt-6 flex gap-2 flex-wrap">
        {["PENDING", "APPROVED", "REJECTED", "WAITLISTED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              filter === s ? "bg-base-500 text-white" : "border border-white/10 text-fg-muted hover:bg-white/5"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-16 flex justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 size={32} className="text-base-400" />
          </motion.div>
        </div>
      )}
      {!loading && applications.length === 0 && <p className="mt-16 text-center text-fg-muted">Nothing here.</p>}

      <div className="mt-8 space-y-3">
        {applications.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass-panel flex flex-col rounded-2xl p-5 shadow-glass"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{app.user.name ?? app.user.email}</p>
                <p className="text-xs text-gray-500 dark:text-fg-muted">
                  {app.user.email}
                  {app.user.walletAddress && ` · ${app.user.walletAddress.slice(0, 6)}…${app.user.walletAddress.slice(-4)}`}
                </p>
              </div>
              {app.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => act(app.id, "approve")}
                    disabled={actingOn === app.id}
                    className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    {actingOn === app.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {actingOn === app.id ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => act(app.id, "reject")}
                    disabled={actingOn === app.id}
                    className="flex items-center gap-1 rounded-full bg-red-500/15 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/25 disabled:opacity-50"
                  >
                    {actingOn === app.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    {actingOn === app.id ? "…" : "Reject"}
                  </button>
                </div>
              )}
              {app.status === "APPROVED" && (
                <button
                  onClick={() => assignVolunteer(app.userId ?? app.user.id)}
                  disabled={actingOn === (app.userId ?? app.user.id)}
                  className="flex items-center gap-1 rounded-full bg-violet-500/15 px-4 py-2 text-xs font-medium text-violet-400 hover:bg-violet-500/25 disabled:opacity-50"
                >
                  {actingOn === (app.userId ?? app.user.id) ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {actingOn === (app.userId ?? app.user.id) ? "…" : "Assign as Volunteer"}
                </button>
              )}
            </div>

            {/* Show the "Why attend?" reason if provided - FIXED for light mode */}
            {app.reason && (
              <div className="mt-3 rounded-lg bg-gray-100 p-3 border border-gray-200 dark:bg-white/5 dark:border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-fg-muted">
                  <MessageSquare size={14} />
                  <span className="font-medium">Why they want to attend:</span>
                </div>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{app.reason}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
