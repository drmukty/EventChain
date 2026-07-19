"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Users, 
  Trash2, 
  QrCode, 
  UserPlus,
  Clock,
  Tag,
  Home,
  Eye,
  FileText,
  Award
} from "lucide-react";

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

  const getEventStatus = (event: any) => {
    const now = new Date();
    const registrationDeadline = new Date(event.registrationDeadline);
    const startsAt = new Date(event.startsAt);

    if (now > startsAt) {
      return { label: "Ended", color: "bg-gray-500/20 text-gray-400" };
    }
    if (now > registrationDeadline) {
      return { label: "Registration Closed", color: "bg-red-500/20 text-red-400" };
    }
    if (event.status === "SOLD_OUT") {
      return { label: "Sold Out", color: "bg-amber-500/20 text-amber-400" };
    }
    if (event.status === "REGISTRATION_OPEN") {
      return { label: "Registration Open", color: "bg-green-500/20 text-green-400" };
    }
    return { label: event.status || "Draft", color: "bg-gray-500/20 text-gray-400" };
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <p className="text-fg-muted">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <p className="text-fg-muted">Event not found.</p>
      </div>
    );
  }

  const status = getEventStatus(event);
  const seatsLeft = Math.max(0, event.capacity - (event._count?.applications || 0));

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
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
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-sm text-fg-muted flex items-center gap-1">
              <MapPin size={14} /> {event.venue}
            </span>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
        <button
          onClick={deleteEvent}
          className="flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>

      {/* Banner */}
      {event.bannerUrl && (
        <div className="mt-6 rounded-2xl overflow-hidden">
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-56 object-cover"
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-5 text-center"
        >
          <Users className="mx-auto h-6 w-6 text-base-400" />
          <p className="mt-2 font-display text-2xl font-semibold">{event._count?.applications || 0}</p>
          <p className="text-xs text-fg-muted">Applications</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-panel rounded-2xl p-5 text-center"
        >
          <QrCode className="mx-auto h-6 w-6 text-base-400" />
          <p className="mt-2 font-display text-2xl font-semibold">{event._count?.checkIns || 0}</p>
          <p className="text-xs text-fg-muted">Check-ins</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-5 text-center"
        >
          <Users className="mx-auto h-6 w-6 text-base-400" />
          <p className="mt-2 font-display text-2xl font-semibold">{seatsLeft}</p>
          <p className="text-xs text-fg-muted">Seats left</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel rounded-2xl p-5 text-center"
        >
          <Calendar className="mx-auto h-6 w-6 text-base-400" />
          <p className="mt-2 font-display text-2xl font-semibold">
            {new Date(event.startsAt).toLocaleDateString()}
          </p>
          <p className="text-xs text-fg-muted">Event date</p>
        </motion.div>
      </div>

      {/* Event Details */}
      <div className="mt-8 glass-panel rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <FileText size={18} className="text-base-400" /> Event Details
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 text-sm">
            <Tag size={16} className="text-base-400" />
            <span className="text-fg-muted">Category:</span>
            <span className="text-white">{event.category}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Home size={16} className="text-base-400" />
            <span className="text-fg-muted">Venue:</span>
            <span className="text-white">{event.venue}</span>
          </div>
          {event.address && (
            <div className="flex items-center gap-3 text-sm col-span-2">
              <MapPin size={16} className="text-base-400" />
              <span className="text-fg-muted">Address:</span>
              <span className="text-white">{event.address}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={16} className="text-base-400" />
            <span className="text-fg-muted">Starts:</span>
            <span className="text-white">{new Date(event.startsAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={16} className="text-base-400" />
            <span className="text-fg-muted">Ends:</span>
            <span className="text-white">{new Date(event.endsAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock size={16} className="text-base-400" />
            <span className="text-fg-muted">Registration Deadline:</span>
            <span className="text-white">{new Date(event.registrationDeadline).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Users size={16} className="text-base-400" />
            <span className="text-fg-muted">Capacity:</span>
            <span className="text-white">{event.capacity}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Eye size={16} className="text-base-400" />
            <span className="text-fg-muted">Visibility:</span>
            <span className="text-white">{event.visibility}</span>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4 rounded-xl bg-white/5 p-4">
          <p className="text-sm text-fg-muted leading-relaxed">{event.description}</p>
        </div>
      </div>

      {/* Action Buttons */}
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
