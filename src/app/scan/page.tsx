"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Html5Qrcode } from "html5-qrcode";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

type Event = {
  id: string;
  title: string;
};

export default function ScanPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; attendee?: any } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load events
  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    fetch("/api/events?mine=true")
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events || []);
        if (data.events?.length) setEventId(data.events[0].id);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load events");
        setLoading(false);
      });
  }, [session]);

  // Start/stop scanner when event changes
  useEffect(() => {
    if (!eventId || !containerRef.current) return;
    startScanner();
    return () => {
      stopScanner();
    };
  }, [eventId]);

  const startScanner = async () => {
    if (scannerRef.current) return;
    try {
      const scanner = new Html5Qrcode(containerRef.current!.id);
      scannerRef.current = scanner;
      setScanning(true);
      setResult(null);

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 300, height: 300 },
        },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      console.error("Scanner start error:", err);
      toast.error("Could not start camera – please check permissions");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch {}
      setScanning(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    // Stop scanning immediately to avoid multiple calls
    await stopScanner();
    setScanning(false);

    // Send to the check-in API
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: decodedText, eventId }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: "Check-in successful!", attendee: data.attendee });
        toast.success("Checked in!");
      } else {
        setResult({ success: false, message: data.error || "Check-in failed" });
        toast.error(data.error || "Check-in failed");
      }
    } catch (err) {
      setResult({ success: false, message: "Network error" });
      toast.error("Network error");
    }

    // Restart scanner after 2 seconds
    setTimeout(() => {
      setResult(null);
      startScanner();
    }, 3000);
  };

  const onScanError = (err: any) => {
    // Ignore – it will keep trying
  };

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-fg-muted">Please sign in to scan attendees.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Loader2 size={40} className="animate-spin text-base-400" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <p className="text-fg-muted">You don't have any events to scan for.</p>
          <p className="mt-2 text-sm text-fg-muted">
            Only events you organize or volunteer for appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4 glass-panel">
        <h1 className="text-2xl font-bold">QR Scanner</h1>
        <p className="text-sm text-fg-muted">
          {scanning ? "🔍 Scanning..." : "Select an event and allow camera."}
        </p>

        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full rounded border p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>

        {/* Scanner container */}
        <div
          id="qr-reader"
          ref={containerRef}
          className="w-full aspect-square rounded-xl overflow-hidden bg-black/20"
        />

        {result && (
          <div
            className={`rounded p-3 border ${
              result.success
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            <p>{result.message}</p>
            {result.attendee && (
              <p className="text-sm mt-1 font-medium">
                {result.attendee.name || result.attendee.email}
              </p>
            )}
          </div>
        )}

        {!scanning && !result && (
          <button
            onClick={startScanner}
            className="w-full rounded bg-base-500 py-2 text-white"
          >
            Start Camera
          </button>
        )}
      </div>
    </div>
  );
}
