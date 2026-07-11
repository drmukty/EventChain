"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

export default function EventApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch(`/api/events/${id}/applications?status=${filter}`)
      .then((r) => r.json())
      .then((d) => setApplications(d.applications ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id, filter]);

  async function act(applicationId: string, action: "approve" | "reject") {
    const res = await fetch(`/api/applications/${applicationId}/${action}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success(action === "approve" ? "Approved — QR sent" : "Rejected");
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Applications</h1>

      <div className="mt-6 flex gap-2">
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

      {loading && <p className="mt-10 text-fg-muted">Loading…</p>}
      {!loading && applications.length === 0 && <p className="mt-16 text-center text-fg-muted">Nothing here.</p>}

      <div className="mt-8 space-y-3">
        {applications.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass-panel flex items-center justify-between rounded-2xl p-5 shadow-glass"
          >
            <div>
              <p className="font-medium">{app.user.name ?? app.user.email}</p>
              <p className="text-xs text-fg-muted">
                {app.user.email}{app.user.walletAddress && ` · ${app.user.walletAddress.slice(0, 6)}…${app.user.walletAddress.slice(-4)}`}
              </p>
            </div>
            {app.status === "PENDING" && (
              <div className="flex gap-2">
                <button onClick={() => act(app.id, "approve")} className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25">
                  <Check size={14} /> Approve
                </button>
                <button onClick={() => act(app.id, "reject")} className="flex items-center gap-1 rounded-full bg-red-500/15 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/25">
                  <X size={14} /> Reject
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
