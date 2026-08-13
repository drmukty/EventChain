"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { QrCode, X, FileDown, Key, Copy, Check } from "lucide-react";
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
  const [tokenLoading, setTokenLoading] = useState<Record<string, boolean>>({});
  const [tokenDisplay, setTokenDisplay] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});

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
    const loadingToast = toast.loading("Generating certificate...");
    try {
      const res = await fetch(`/api/certificates/${eventId}`, { method: "POST" });
      const data = await res.json();
      toast.dismiss(loadingToast);

      if (!res.ok) {
        return toast.error(data.error ?? "Certificate not available yet");
      }

      const pdfUrl = data.certificate?.pdfUrl;
      if (!pdfUrl) {
        return toast.error("Invalid response from server");
      }

      window.open(pdfUrl, "_blank");
    } catch {
      toast.dismiss(loadingToast);
      toast.error("Network error – please try again");
    }
  }

  const fetchManualToken = async (applicationId: string, eventId: string) => {
    setTokenLoading(prev => ({ ...prev, [applicationId]: true }));
    try {
      const res = await fetch(`/api/events/${eventId}/manual-token/${applicationId}`);
      const data = await res.json();
      if (res.ok) {
        setTokenDisplay(prev => ({ ...prev, [applicationId]: data.token }));
        toast.success('Token ready!');
      } else {
        toast.error(data.error || 'Failed to get token');
      }
    } catch (error) {
      toast.error('Error fetching token');
    } finally {
      setTokenLoading(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  const copyToClipboard = (token: string, applicationId: string) => {
    navigator.clipboard.writeText(token);
    setCopied(prev => ({ ...prev, [applicationId]: true }));
    toast.success('Token copied!');
    setTimeout(() => {
      setCopied(prev => ({ ...prev, [applicationId]: false }));
    }, 2000);
  };

  const isCheckedIn = (app: any) => {
    return app.checkIn && app.checkIn.checkedInAt !== null;
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Joined Events</h1>
          <p className="mt-2 text-fg-muted">
            View your event applications, status, QR codes, and certificates.
          </p>
        </div>
      </div>

      {loading && <p className="mt-10 text-fg-muted">Loading…</p>}
      {!loading && applications.length === 0 && (
        <p className="mt-16 text-center text-fg-muted">You haven't applied to anything yet.</p>
      )}

      <div className="mt-10 space-y-4">
        {applications.map((app, i) => {
          const checkedIn = isCheckedIn(app);
          const canDownloadCertificate = checkedIn;
          const isApproved = app.status === "APPROVED";

          return (
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

                {/* ✅ Manual Token Button - only for APPROVED events */}
                {isApproved && (
                  <div className="flex items-center gap-1.5">
                    {tokenDisplay[app.id] ? (
                      <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-2">
                        <Key size={14} className="text-green-400" />
                        <span className="font-mono text-xs tracking-wider">{tokenDisplay[app.id]}</span>
                        <button
                          onClick={() => copyToClipboard(tokenDisplay[app.id], app.id)}
                          className="hover:bg-white/10 rounded p-1 transition-colors"
                          title="Copy token"
                        >
                          {copied[app.id] ? (
                            <Check size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} className="text-fg-muted hover:text-white" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fetchManualToken(app.id, app.eventId)}
                        disabled={tokenLoading[app.id]}
                        className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border border-green-500/30 px-4 py-2 text-xs font-medium text-green-400 hover:bg-green-500/10 disabled:opacity-50"
                      >
                        {tokenLoading[app.id] ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                        ) : (
                          <Key size={14} />
                        )}
                        Get Token
                      </button>
                    )}
                  </div>
                )}

                {/* ✅ Certificate button - shows after check-in */}
                {canDownloadCertificate && (
                  <button
                    onClick={() => downloadCertificate(app.eventId)}
                    className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border border-base-500/30 px-4 py-2 text-xs font-medium text-base-400 hover:bg-base-500/10"
                  >
                    <FileDown size={14} /> Certificate
                  </button>
                )}

                {/* ✅ Cancel button - hidden after check-in */}
                {["PENDING", "APPROVED", "WAITLISTED"].includes(app.status) && !checkedIn && (
                  <button
                    onClick={() => cancel(app.id)}
                    className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border border-red-500/20 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10"
                  >
                    <X size={14} /> Cancel
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
