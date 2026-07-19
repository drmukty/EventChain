"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import jsQR from "jsqr";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

type ScanState = {
  status: "idle" | "success" | "error";
  message?: string;
  attendee?: {
    name?: string;
    email?: string;
  };
};

type Event = {
  id: string;
  title: string;
};

export default function ScanPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [scanState, setScanState] = useState<ScanState>({
    status: "idle",
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPayloadRef = useRef<string | null>(null);

  const handleScan = async (payload: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, payload }),
      });

      const data = await response.json();

      if (response.ok) {
        setScanState({
          status: "success",
          message: data.message || "Check-in successful!",
          attendee: data.attendee,
        });
        toast.success("Checked in successfully!");
      } else {
        setScanState({
          status: "error",
          message: data.error || "Failed to check in",
        });
        toast.error(data.error || "Failed to check in");
      }
    } catch {
      setScanState({
        status: "error",
        message: "An error occurred while scanning",
      });
      toast.error("An error occurred while scanning");
    } finally {
      setBusy(false);
      setTimeout(() => {
        lastPayloadRef.current = null;
      }, 2000);
    }
  };

  // ✅ Fetch ONLY events the user manages (organizer OR volunteer)
  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    fetch("/api/events?mine=true")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        if (data.events?.length) {
          setEventId(data.events[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load events");
        setLoading(false);
      });
  }, [session]);

  useEffect(() => {
    if (!eventId) return;

    let stream: MediaStream;
    let animation: number;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        scanLoop();
      } catch {
        toast.error("Camera permission denied");
      }
    }

    function scanLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        video &&
        canvas &&
        video.readyState === video.HAVE_ENOUGH_DATA
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0);

        const image = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

        const qr = jsQR(image.data, image.width, image.height);

        if (
          qr &&
          qr.data !== lastPayloadRef.current &&
          !busy
        ) {
          lastPayloadRef.current = qr.data;
          handleScan(qr.data);
        }
      }

      animation = requestAnimationFrame(scanLoop);
    }

    startCamera();

    return () => {
      cancelAnimationFrame(animation);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [eventId, busy]);

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <p className="text-fg-muted">Please sign in to scan attendees.</p>
        </div>
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
        <p className="text-sm text-fg-muted">Scan QR codes to check in attendees.</p>

        <label className="block text-sm font-medium">
          Select Event
        </label>

        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full rounded border p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>

        <div className="relative w-full aspect-square overflow-hidden rounded-xl border">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-6 border-2 border-green-500 rounded-xl"></div>
        </div>

        {scanState.status === "success" && (
          <div className="rounded bg-green-500/10 p-3 text-green-400 border border-green-500/20">
            <p>{scanState.message}</p>
            {scanState.attendee && (
              <p className="text-sm mt-1 font-medium">
                {scanState.attendee.name || scanState.attendee.email}
              </p>
            )}
          </div>
        )}

        {scanState.status === "error" && (
          <div className="rounded bg-red-500/10 p-3 text-red-400 border border-red-500/20">
            {scanState.message}
          </div>
        )}
      </div>
    </div>
  );
}
