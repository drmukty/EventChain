"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { UserMinus, ShieldCheck } from "lucide-react";

type Member = {
  id: string;
  role: "OWNER" | "ADMIN" | "VOLUNTEER" | "QR_SCANNER";
  user: { id: string; name: string | null; email: string; image: string | null };
};

export default function EventTeamPage() {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch(`/api/events/${id}/team`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function remove(userId: string) {
    const res = await fetch(`/api/events/${id}/team`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Could not remove member");
    toast.success("Removed from team");
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Team</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Volunteers get QR scanner access for this event only. Assign them from an approved
        applicant on the Applications page.
      </p>

      {loading && <p className="mt-10 text-fg-muted">Loading…</p>}

      <div className="mt-8 space-y-3">
        {members.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass-panel flex items-center justify-between rounded-2xl p-5 shadow-glass"
          >
            <div>
              <p className="font-medium">{m.user.name ?? m.user.email}</p>
              <p className="text-xs text-fg-muted">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-fg-muted">
                <ShieldCheck size={12} /> {m.role}
              </span>
              {m.role !== "OWNER" && (
                <button
                  onClick={() => remove(m.user.id)}
                  className="flex items-center gap-1 rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25"
                >
                  <UserMinus size={14} /> Remove
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
