"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Users, UserPlus, Trash2, Edit } from "lucide-react";

export default function ManageEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => setEvent(data.event))
      .finally(() => setLoading(false));
  }, [id]);

  async function deleteEvent() {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to delete");
      return;
    }
    toast.success("Event deleted");
    router.push("/dashboard/events");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-fg-muted">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-fg-muted">Event not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Back Button */}
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back to events
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{event.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{event.venue}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/events/${id}/edit`}
            className="flex items-center gap-2 rounded-full border border-base-500/30 px-4 py-2 text-sm font-medium text-base-400 hover:bg-base-500/10 transition-colors"
          >
            <Edit size={16} /> Edit Event
          </Link>
          <button
            onClick={deleteEvent}
            className="flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Banner Image - KEPT */}
      {event.bannerUrl && (
        <div className="mt-6 rounded-2xl overflow-hidden">
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Two Buttons Only */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href={`/dashboard/events/${id}/applications`}
          className="flex items-center gap-3 rounded-2xl glass-panel px-8 py-4 text-center hover:shadow-glow transition-all hover:-translate-y-1 flex-1 min-w-[200px] justify-center"
        >
          <Users size={24} className="text-base-400" />
          <div className="text-left">
            <p className="font-display text-lg font-semibold">View Attendees</p>
            <p className="text-xs text-fg-muted">Review and manage applications</p>
          </div>
        </Link>

        <Link
          href={`/dashboard/events/${id}/team`}
          className="flex items-center gap-3 rounded-2xl glass-panel px-8 py-4 text-center hover:shadow-glow transition-all hover:-translate-y-1 flex-1 min-w-[200px] justify-center"
        >
          <UserPlus size={24} className="text-base-400" />
          <div className="text-left">
            <p className="font-display text-lg font-semibold">Manage Team</p>
            <p className="text-xs text-fg-muted">Add or remove volunteers</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
