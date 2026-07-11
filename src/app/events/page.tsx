"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar, Users } from "lucide-react";

type EventSummary = {
  id: string;
  title: string;
  slug: string;
  category: string;
  venue: string;
  startsAt: string;
  capacity: number;
  bannerUrl: string | null;
  organizer: { name: string | null };
  _count: { applications: number };
};

export default function EventsPage() {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/events?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Browse events</h1>
      <p className="mt-2 text-fg-muted">Find something worth showing up for.</p>

      <div className="relative mt-8 max-w-lg">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, category, or location…"
          className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm outline-none focus:border-base-500"
        />
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/5" />
          ))}

        {!loading && events.length === 0 && (
          <p className="col-span-full text-center text-fg-muted py-20">
            No events match yet — try a different search, or check back soon.
          </p>
        )}

        {events.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={`/events/${event.id}`}
              className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-transform hover:-translate-y-1 hover:border-base-500/40"
            >
              <div className="h-36 bg-gradient-to-br from-base-500/30 to-violet-500/20" />
              <div className="p-5">
                <span className="text-xs font-medium uppercase tracking-wide text-base-400">
                  {event.category}
                </span>
                <h3 className="mt-1 font-display font-semibold group-hover:text-base-400 transition-colors">
                  {event.title}
                </h3>
                <div className="mt-4 space-y-1.5 text-sm text-fg-muted">
                  <p className="flex items-center gap-2"><Calendar size={14} /> {new Date(event.startsAt).toLocaleDateString()}</p>
                  <p className="flex items-center gap-2"><MapPin size={14} /> {event.venue}</p>
                  <p className="flex items-center gap-2"><Users size={14} /> {event._count.applications}/{event.capacity} applied</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
