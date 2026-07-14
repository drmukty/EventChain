"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

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

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        Loading...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        Event not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold">{event.title}</h1>

      <p className="mt-2 text-gray-400">{event.venue}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/events/${event.id}`}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          View Event
        </Link>

        <Link
          href={`/dashboard/events/${event.id}/applications`}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Applications
        </Link>

        <Link
          href={`/dashboard/events/${event.id}/team`}
          className="rounded bg-purple-600 px-4 py-2 text-white"
        >
          Team
        </Link>

        <Link
          href={`/dashboard/events/${event.id}/live`}
          className="rounded bg-green-600 px-4 py-2 text-white"
        >
          Live Check-in
        </Link>

        <button
          onClick={deleteEvent}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          Delete Event
        </button>
      </div>

      <div className="mt-10 rounded-xl border p-6">
        <h2 className="text-xl font-semibold">Event Details</h2>

        <p className="mt-4">
          <strong>Category:</strong> {event.category}
        </p>

        <p className="mt-2">
          <strong>Capacity:</strong> {event.capacity}
        </p>

        <p className="mt-2">
          <strong>Status:</strong> {event.status}
        </p>

        <p className="mt-2">
          <strong>Starts:</strong>{" "}
          {new Date(event.startsAt).toLocaleString()}
        </p>

        <p className="mt-2">
          <strong>Ends:</strong>{" "}
          {new Date(event.endsAt).toLocaleString()}
        </p>

        <p className="mt-6 whitespace-pre-wrap">
          {event.description}
        </p>
      </div>
    </div>
  );
}
