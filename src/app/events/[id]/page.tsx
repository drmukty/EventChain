"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { MapPin, Calendar, Users, ShieldCheck, Share2, Check, X, Edit } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Could not load this event");
          return;
        }
        setEvent(data.event);
      })
      .catch(() => setError("Could not load this event"));
  }, [id]);

  async function handleApplySubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${id}/apply`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not apply");
      toast.success(
        data.application.status === "WAITLISTED"
          ? `You're #${data.application.waitlistPosition} on the waitlist`
          : "Application submitted!"
      );
      setShowApplyModal(false);
      setReason("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title || "Event",
          text: `Check out "${event?.title}" on EventChain! 🎉`,
          url: url,
        });
        return;
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Share error:", e);
        }
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard! 📋");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        toast.success("Link copied! 📋");
        setTimeout(() => setCopied(false), 3000);
      } catch {
        toast.error("Could not copy link. Please copy it manually.");
        prompt("Copy this link:", url);
      }
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="text-fg-muted">{error}</p>
      </div>
    );
  }

  if (!event) return <div className="mx-auto max-w-4xl px-6 py-24 text-fg-muted">Loading event…</div>;

  const seatsLeft = Math.max(0, event.capacity - event._count.applications);
  const isOrganizer = session?.user && (session.user as any).id === event.organizerId;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {event.bannerUrl ? (
        <img
          src={event.bannerUrl}
          alt={event.title}
          className="h-56 w-full rounded-3xl object-cover"
        />
      ) : (
        <div className="h-56 w-full rounded-3xl bg-gradient-to-br from-base-500/30 to-violet-500/20" />
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-base-400">{event.category}</span>
            <h1 className="mt-2 font-display text-4xl font-semibold">{event.title}</h1>
            <p className="mt-2 text-fg-muted">Hosted by {event.organizer?.name}</p>
          </div>
          {/* ✅ Edit button - only visible to organizer */}
          {isOrganizer && (
            <Link
              href={`/dashboard/events/${id}/edit`}
              className="flex items-center gap-2 rounded-full border border-base-500/30 px-5 py-2.5 text-sm font-medium text-base-400 hover:bg-base-500/10 transition-colors"
            >
              <Edit size={16} /> Edit Event
            </Link>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-6 text-sm text-fg-muted">
          <span className="flex items-center gap-2"><Calendar size={16} /> {new Date(event.startsAt).toLocaleString()}</span>
          <span className="flex items-center gap-2"><MapPin size={16} /> {event.venue}</span>
          <span className="flex items-center gap-2"><Users size={16} /> {seatsLeft} seats left of {event.capacity}</span>
          <span className="flex items-center gap-2"><ShieldCheck size={16} /> {event.visibility.replace("_", " ")}</span>
        </div>

        <p className="mt-8 max-w-2xl leading-relaxed text-fg-muted">{event.description}</p>

        {event.speakers?.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display font-semibold">Speakers</h2>
            <div className="mt-4 flex flex-wrap gap-4">
              {event.speakers.map((s: any) => (
                <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-fg-muted">{s.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-4">
          <button
            onClick={() => setShowApplyModal(true)}
            disabled={applying}
            className="rounded-full bg-base-500 px-8 py-3 font-medium text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {applying ? "Applying…" : seatsLeft > 0 ? "Apply to attend" : "Join waitlist"}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-medium text-fg-muted hover:bg-white/5 transition-colors"
          >
            {copied ? <Check size={18} className="text-green-400" /> : <Share2 size={18} />}
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </motion.div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900 shadow-2xl"
          >
            <button
              onClick={() => {
                setShowApplyModal(false);
                setReason("");
              }}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-600 dark:text-gray-300" />
            </button>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Apply to attend</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Tell the organizer why you want to attend this event. (Optional)
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Why do you want to attend? <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="I'm interested in this event because... (optional)"
                rows={4}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-base-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{reason.length}/500 characters</span>
                <span className="text-gray-400">
                  {reason.length === 0 ? "Optional" : `${reason.length} characters`}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setReason("");
                }}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplySubmit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-base-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-base-600 disabled:opacity-60 transition-colors"
              >
                {submitting ? "Submitting..." : "Submit application"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
