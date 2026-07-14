"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function MyManagedEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events?mine=true")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Events</h1>
          <p className="mt-2 text-gray-400">
            Manage all events you created.
          </p>
        </div>

        <Link
          href="/dashboard/events/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          + New Event
        </Link>
      </div>

      {loading && (
        <p className="mt-10">
          Loading...
        </p>
      )}

      {!loading && events.length === 0 && (
        <div className="mt-12 rounded-xl border p-8 text-center">
          <h2 className="text-xl font-semibold">
            No events found
          </h2>
          <p className="mt-2 text-gray-500">
            Create your first event.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border p-6"
          >
            {event.bannerUrl && (
              <img
                src={event.bannerUrl}
                alt={event.title}
                className="mb-4 h-48 w-full rounded-lg object-cover"
              />
            )}

            <h2 className="text-2xl font-bold">
              {event.title}
            </h2>

            <p className="mt-2 text-gray-500">
              {event.venue}
            </p>

            <p className="mt-1 text-gray-500">
              {new Date(event.startsAt).toLocaleString()}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/events/${event.id}`}
                className="rounded bg-gray-800 px-4 py-2 text-white"
              >
                View
              </Link>

              <Link
                href={`/dashboard/events/${event.id}`}
                className="rounded bg-blue-600 px-4 py-2 text-white"
              >
                Manage
              </Link>

              <Link
                href={`/dashboard/events/${event.id}/applications`}
                className="rounded bg-green-600 px-4 py-2 text-white"
              >
                Applications
              </Link>

              <Link
                href={`/dashboard/events/${event.id}/live`}
                className="rounded bg-purple-600 px-4 py-2 text-white"
              >
                Live Check-in
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
