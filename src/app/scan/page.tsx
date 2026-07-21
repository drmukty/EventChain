"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import jsQR from "jsqr";
import toast from "react-hot-toast";
import { Loader2, Camera, RefreshCw } from "lucide-react";

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

type PermissionState = "prompt" | "granted" | "denied" | "unsupported";

export default function ScanPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [scanState, setScanState] = useState<ScanState>({
    status: "idle",
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cameraPermission, setCameraPermission] = useState<PermissionState>("unsupported");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPayloadRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const checkPermission = async () => {
    if (!navigator.permissions || !navigator.permissions.query) {
      setCameraPermission("unsupported");
      return;
    }
    try {
      const result = await navigator.permissions.query({ name: "camera" as PermissionName });
      setCameraPermission(result.state as PermissionState);
      result.onchange = () => {
        setCameraPermission(result.state as PermissionState);
        if (result.state === "granted") {
          startCamera();
        }
      };
    } catch {
      setCameraPermission("unsupported");
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraPermission("granted");
      scanLoop();
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraPermission("denied");
        setCameraError(
          "Camera access was denied. Please allow camera access in your browser settings and try again."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError("Failed to start camera: " + err.message);
      }
      toast.error(cameraError || "Could not access camera");
    }
  };

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(image.data, image.width, image.height);

      if (qr && qr.data !== lastPayloadRef.current && !busy) {
        lastPayloadRef.current = qr.data;
        handleScan(qr.data);
      }
    }

    animationRef.current = requestAnimationFrame(scanLoop);
  };

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

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

  // Load events
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

  // Check permission and start camera when eventId changes
  useEffect(() => {
    if (!eventId) return;
    checkPermission();
    // If permission already granted, start camera
    if (cameraPermission === "granted") {
      startCamera();
    }
    // For "prompt" or "unsupported", we'll let the user click a button
    return () => {
      stopCamera();
    };
  }, [eventId]);

  // Handle permission change to start camera if granted
  useEffect(() => {
    if (cameraPermission === "granted") {
      startCamera();
    } else if (cameraPermission === "denied") {
      stopCamera();
    }
  }, [cameraPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Camera size={24} /> QR Scanner
        </h1>
        <p className="text-sm text-fg-muted">Scan QR codes to check in attendees.</p>

        <label className="block text-sm font-medium">Select Event</label>
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

        {/* Camera Preview */}
        <div className="relative w-full aspect-square overflow-hidden rounded-xl border">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-6 border-2 border-green-500 rounded-xl pointer-events-none"></div>

          {/* Permission/Error overlays */}
          {cameraPermission === "denied" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
              <p className="text-center text-red-400 font-medium">Camera access blocked</p>
              <p className="text-sm text-gray-300 text-center mt-2">
                Please allow camera access in your browser settings, then click Retry.
              </p>
              <button
                onClick={async () => {
                  // Simply call startCamera – it will handle the prompt if permission changes
                  await startCamera();
                }}
                className="mt-4 flex items-center gap-2 rounded-full bg-base-500 px-4 py-2 text-white"
              >
                <RefreshCw size={16} /> Retry
              </button>
            </div>
          )}

          {cameraPermission === "prompt" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
              <p className="text-center font-medium">Camera permission required</p>
              <p className="text-sm text-gray-300 text-center mt-2">
                Click the button below to allow camera access.
              </p>
              <button
                onClick={async () => {
                  await startCamera();
                }}
                className="mt-4 flex items-center gap-2 rounded-full bg-base-500 px-4 py-2 text-white"
              >
                <Camera size={16} /> Allow Camera
              </button>
            </div>
          )}
        </div>

        {/* Scan Result */}
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
