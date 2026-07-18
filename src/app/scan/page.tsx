"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import toast from "react-hot-toast";

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
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [scanState, setScanState] = useState<ScanState>({
    status: "idle",
  });
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    fetch("/api/events?live=true")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        if (data.events?.length) {
          setEventId(data.events[0].id);
        }
      })
      .catch(() => toast.error("Failed to load live events"));
  }, []);

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

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
        <h1 className="text-2xl font-bold">QR Scanner</h1>

        <label className="block text-sm font-medium">
          Event ID
        </label>

        <input
          type="text"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="Paste Event ID"
          className="w-full rounded border p-2"
        />

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
          <div className="rounded bg-green-100 p-3 text-green-700">
            <p>{scanState.message}</p>
            {scanState.attendee && (
              <p>{scanState.attendee.name || scanState.attendee.email}</p>
            )}
          </div>
        )}

        {scanState.status === "error" && (
          <div className="rounded bg-red-100 p-3 text-red-700">
            {scanState.message}
          </div>
        )}
      </div>
    </div>
  );
}
