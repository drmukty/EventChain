"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { QrCode, X, FileDown } from "lucide-react";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useSession } from "next-auth/react";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400",
  APPROVED: "bg-emerald-500/15 text-emerald-400",
  REJECTED: "bg-red-500/15 text-red-400",
  WAITLISTED: "bg-violet-500/15 text-violet-400",
  CANCELLED: "bg-white/10 text-fg-muted",
};

export default function MyEventsPage() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/me/applications")
      .then((r) => r.json())
      .then((d) => setApplications(d.applications ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function cancel(id: string) {
    const res = await fetch(`/api/applications/${id}/cancel`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success("Registration cancelled");
    load();
  }

  async function downloadCertificate(eventId: string) {
    const res = await fetch(`/api/certificates/${eventId}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Certificate not available yet");
    window.open(data.certificate.pdfUrl, "_blank");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">My events</h1>
          <p className="mt-2 text-fg-muted">Track applications, download QR codes, and grab certificates.</p>
        </div>
        <WalletConnectButton currentWallet={(session?.user as any)?.walletAddress} />
      </div>

      {loading && <p className="mt-10 text-fg-muted">Loading…</p>}
      {!loading && applications.length === 0 && (
        <p className="mt-16 text-center text-fg-muted">You haven't applied to anything yet.</p>
      )}

      <div className="mt-10 space-y-4">
        {applications.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-panel w-full flex flex-col gap-4 rounded-2xl p-6 shadow-glass sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-display font-semibold whitespace-normal break-words">{app.event.title}</p>
              <p className="text-xs text-fg-muted">{app.event.venue} · {new Date(app.event.startsAt).toLocaleDateString()}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[app.status]}`}>
                {app.status}{app.waitlistPosition ? ` · #${app.waitlistPosition}` : ""}
              </span>
            </div>

            <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              {app.qrDataUrl && (
                <a
                  href={app.qrDataUrl}
                  download={`eventchain-qr-${app.event.slug}.png`}
                  className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs font-medium hover:bg-white/5"
                >
                  <QrCode size={14} /> Download QR
                </a>
              )}
              {new Date() > new Date(app.event.endsAt) && app.status === "APPROVED" && (
                <button
                  onClick={() => downloadCertificate(app.eventId)}
                  className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs font-medium hover:bg-white/5"
                >
                  <FileDown size={14} /> Certificate
                </button>
              )}
              {["PENDING", "APPROVED", "WAITLISTED"].includes(app.status) && (
                <button
                  onClick={() => cancel(app.id)}
                  className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border border-red-500/20 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10"
                >
                  <X size={14} /> Cancel
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
