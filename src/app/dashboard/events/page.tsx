"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

export default function MyManagedEventsPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  function loadEvents() {
    setLoading(true);
    fetch("/api/events?mine=true")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadEvents, []);

  async function deleteEvent(id: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Event deleted");
      loadEvents();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isAdmin ? "All Events (Admin)" : "My Events"}
          </h1>
          <p className="mt-2 text-gray-400">
            {isAdmin
              ? "You have full access to manage every event."
              : "Manage all events you created."}
          </p>
        </div>

        <Link
          href="/dashboard/events/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
        >
          + New Event
        </Link>
      </div>

      {!loading && events.length === 0 && (
        <div className="mt-12 rounded-xl border p-8 text-center">
          <h2 className="text-xl font-semibold">
            {isAdmin ? "No events in the system" : "No events found"}
          </h2>
          <p className="mt-2 text-gray-500">
            {isAdmin
              ? "Events will appear here once organizers create them."
              : "Create your first event."}
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            {event.bannerUrl && (
              <img
                src={event.bannerUrl}
                alt={event.title}
                className="mb-4 h-48 w-full rounded-lg object-cover"
              />
            )}

            <h2 className="text-2xl font-bold">{event.title}</h2>

            <p className="mt-2 text-gray-500">{event.venue}</p>

            <p className="mt-1 text-gray-500">
              {new Date(event.startsAt).toLocaleString()}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/events/${event.id}`}
                className="rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
              >
                View
              </Link>

              <Link
                href={`/dashboard/events/${event.id}`}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
              >
                Manage
              </Link>

              <Link
                href={`/dashboard/events/${event.id}/applications`}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors"
              >
                Applications
              </Link>

              <Link
                href={`/dashboard/events/${event.id}/live`}
                className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 transition-colors"
              >
                Live Check-in
              </Link>

              {/* ✅ Admin-only actions */}
              {isAdmin && (
                <>
                  <Link
                    href={`/dashboard/events/${event.id}/edit`}
                    className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
