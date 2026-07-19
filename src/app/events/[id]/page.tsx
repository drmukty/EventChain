"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { MapPin, Calendar, Users, ShieldCheck, Share2, Check } from "lucide-react";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function handleApply() {
    setApplying(true);
    try {
      const res = await fetch(`/api/events/${id}/apply`, { method: "POST", body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not apply");
      toast.success(
        data.application.status === "WAITLISTED"
          ? `You're #${data.application.waitlistPosition} on the waitlist`
          : "Application submitted!"
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setApplying(false);
    }
  }

  async function handleShare() {
    const url = window.location.href;

    // Use Web Share API (mobile)
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

    // Fallback: Copy link to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard! 📋");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Ultimate fallback
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
        <span className="text-xs font-medium uppercase tracking-wide text-base-400">{event.category}</span>
        <h1 className="mt-2 font-display text-4xl font-semibold">{event.title}</h1>
        <p className="mt-2 text-fg-muted">Hosted by {event.organizer?.name}</p>

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

        {/* ✅ Buttons: Apply + Share side by side */}
        <div className="mt-10 flex flex-wrap gap-4">
          <button
            onClick={handleApply}
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
    </div>
  );
}
