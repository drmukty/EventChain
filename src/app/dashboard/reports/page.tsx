'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, FileText, Calendar, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  status: string;
}

export default function ReportsOverviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetch('/api/events?mine=true')
        .then((r) => r.json())
        .then((data) => {
          setEvents(data.events || []);
          setLoading(false);
        })
        .catch(() => {
          toast.error('Failed to load events');
          setLoading(false);
        });
    }
  }, [status, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">No events found</h2>
        <p className="text-gray-500 mt-2">You need to organize or have access to an event to generate reports.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Reports</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Select an event to generate and download reports. Works for all events – active, completed, or cancelled.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 cursor-pointer"
            onClick={() => router.push(`/dashboard/events/${event.id}/reports`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{event.title}</h3>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {event.venue}
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(event.startsAt).toLocaleDateString()}
                </div>
                <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                  event.status === 'COMPLETED' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                    : event.status === 'LIVE'
                    ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    : event.status === 'CANCELLED'
                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                }`}>
                  {event.status}
                </span>
              </div>
              <FileText className="h-6 w-6 text-blue-500 flex-shrink-0" />
            </div>
            <div className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Generate Report →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
