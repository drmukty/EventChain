"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Calendar, MapPin, Users, Trash2, QrCode, UserPlus } from "lucide-react";

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

    const res = await fetch(`/api/events/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Failed to delete");
      return;
    }

    toast.success("Event deleted");
    router.push("/dashboard/events");
  }

  // ✅ Determine the correct status
  const getEventStatus = (event: any) => {
    const now = new Date();
    const registrationDeadline = new Date(event.registrationDeadline);
    const startsAt = new Date(event.startsAt);

    if (now > startsAt) {
      return { label: "Event Ended", color: "text-gray-400 bg-gray-500/10" };
    }
    if (now > registrationDeadline) {
      return { label: "Registration Closed", color: "text-red-400 bg-red-500/10" };
    }
    if (event.status === "SOLD_OUT") {
      return { label: "Sold Out", color: "text-amber-400 bg-amber-500/10" };
    }
    if (event.status === "REGISTRATION_OPEN") {
      return { label: "Registration Open", color: "text-green-400 bg-green-500/10" };
    }
    return { label: event.status || "Draft", color: "text-gray-400 bg-gray-500/10" };
  };

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

  const status = getEventStatus(event);
  const seatsLeft = Math.max(0, event.capacity - (event._count?.applications || 0));

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to events
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{event.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-sm text-fg-muted flex items-center gap-1">
              <MapPin size={14} /> {event.venue}
            </span>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {/* ✅ Edit button REMOVED - only Delete remains */}
          <button
            onClick={deleteEvent}
            className="flex items-center gap-1.5 rounded-full border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {event.bannerUrl && (
        <img
          src={event.bannerUrl}
          alt={event.title}
          className="mt-6 h-48 w-full rounded-2xl object-cover"
        />
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-xl p-4 text-center">
          <Users className="mx-auto h-5 w-5 text-base-400" />
          <p className="mt-2 font-display text-xl font-semibold">{event._count?.applications || 0}</p>
          <p className="text-xs text-fg-muted">Applications</p>
        </div>
        <div className="glass-panel rounded-xl p-4 text-center">
          <QrCode className="mx-auto h-5 w-5 text-base-400" />
          <p className="mt-2 font-display text-xl font-semibold">{event._count?.checkIns || 0}</p>
          <p className="text-xs text-fg-muted">Check-ins</p>
        </div>
        <div className="glass-panel rounded-xl p-4 text-center">
          <Users className="mx-auto h-5 w-5 text-base-400" />
          <p className="mt-2 font-display text-xl font-semibold">{seatsLeft}</p>
          <p className="text-xs text-fg-muted">Seats left</p>
        </div>
        <div className="glass-panel rounded-xl p-4 text-center">
          <Calendar className="mx-auto h-5 w-5 text-base-400" />
          <p className="mt-2 font-display text-xl font-semibold">
            {new Date(event.startsAt).toLocaleDateString()}
          </p>
          <p className="text-xs text-fg-muted">Event date</p>
        </div>
      </div>

      <div className="mt-8 glass-panel rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Event Details</h2>
        <div className="mt-4 space-y-2 text-sm text-fg-muted">
          <p><span className="font-medium text-white">Category:</span> {event.category}</p>
          <p><span className="font-medium text-white">Venue:</span> {event.venue}</p>
          {event.address && <p><span className="font-medium text-white">Address:</span> {event.address}</p>}
          <p><span className="font-medium text-white">Starts:</span> {new Date(event.startsAt).toLocaleString()}</p>
          <p><span className="font-medium text-white">Ends:</span> {new Date(event.endsAt).toLocaleString()}</p>
          <p><span className="font-medium text-white">Registration Deadline:</span> {new Date(event.registrationDeadline).toLocaleString()}</p>
          <p><span className="font-medium text-white">Capacity:</span> {event.capacity}</p>
          <p><span className="font-medium text-white">Visibility:</span> {event.visibility}</p>
        </div>
        <div className="mt-4 rounded-xl bg-white/5 p-4">
          <p className="text-sm text-fg-muted">{event.description}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/dashboard/events/${id}/applications`}
          className="flex items-center gap-2 rounded-full bg-base-500 px-6 py-2.5 text-sm font-medium text-white shadow-glow hover:opacity-90 transition-opacity"
        >
          <Users size={16} /> View Applications
        </Link>
        <Link
          href={`/dashboard/events/${id}/team`}
          className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
        >
          <UserPlus size={16} /> Manage Team
        </Link>
        <Link
          href={`/dashboard/events/${id}/live`}
          className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
        >
          <QrCode size={16} /> Live Check-in
        </Link>
      </div>
    </div>
  );
}
