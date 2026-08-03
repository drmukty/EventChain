"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar, Users, Share2, Check, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import Input from "@/components/ui/Input";

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
  const { data: session, status } = useSession();
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ✅ Only fetch events if user is logged in
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/events?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query, session, status]);

  const handleShare = async (event: EventSummary, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}/events/${event.id}`;
    const text = `Join me at ${event.title} on ${new Date(event.startsAt).toLocaleDateString()} at ${event.venue}! 🎉`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: text,
          url: url,
        });
        return;
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Share error:", e);
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(event.id);
      toast.success("Link copied! Share it with friends 📋");
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  // ✅ If not logged in, show login prompt
  if (status === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 text-center">
        <p className="text-fg-muted">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-3xl p-12 shadow-glass">
          <h1 className="font-display text-3xl font-semibold">Sign in to browse events</h1>
          <p className="mt-3 text-fg-muted">Create an account or sign in to explore events, apply, and earn POAP badges.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/login">
              <Button variant="primary" className="px-8 py-3">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary" className="px-8 py-3">Create account</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Browse events</h1>
      <p className="mt-2 text-fg-muted">Find something worth showing up for.</p>

      <div className="relative mt-8 max-w-lg">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <Input
          value={query}
          onChange={(e: any) => setQuery(e.target.value)}
          placeholder="Search by name, category, or location…"
          className="w-full rounded-full"
          id="events-search"
        />
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Card className="h-64 overflow-hidden">
                <div className="h-36 bg-white/5" />
                <div className="p-5">
                  <Skeleton className="h-5 w-32 mb-3" />
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </Card>
            </div>
          ))}

        {!loading && events.length === 0 && (
          <p className="col-span-full text-center text-fg-muted py-20">No events match yet — try a different search, or check back soon.</p>
        )}

        {events.map((event, i) => (
          <motion.div key={event.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="relative group">
            <Link href={`/events/${event.id}`} className="no-underline">
              <Card className="overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-glow">
                <div
                  className="h-36 bg-center bg-cover relative"
                  style={event.bannerUrl ? { backgroundImage: `url(${event.bannerUrl})` } : undefined}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 dark:to-black/20" />
                  <div className="absolute top-3 right-3 z-10">
                    <Button variant="ghost" className="p-2" onClick={(e: any) => handleShare(event, e)} aria-label="Share event">
                      {copiedId === event.id ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
                    </Button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <Badge className="mr-2">{event.category}</Badge>
                    <div className="ml-auto text-xs text-fg-muted">{new Date(event.startsAt).toLocaleDateString()}</div>
                  </div>

                  <h3 className="mt-2 font-display text-lg font-semibold group-hover:text-base-400 transition-colors">{event.title}</h3>

                  <div className="mt-3 space-y-1 text-sm text-fg-muted">
                    <p className="flex items-center gap-2"><Calendar size={14} /> {new Date(event.startsAt).toLocaleDateString()}</p>
                    <p className="flex items-center gap-2"><MapPin size={14} /> {event.venue}</p>
                    <p className="flex items-center gap-2"><Users size={14} /> {event._count.applications}/{event.capacity} applied</p>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Link href={`/events/${event.id}`} onClick={(e: any) => e.stopPropagation()} className="no-underline">
                      <Button variant="primary" className="inline-flex items-center gap-2 px-4 py-2">
                        Apply now <ArrowRight size={14} />
                      </Button>
                    </Link>
                    <Link href={`/events/${event.id}`} onClick={(e: any) => e.stopPropagation()} className="ml-auto text-sm text-fg-muted hover:underline no-underline">
                      View details
                    </Link>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
