"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ScanLine, CheckCircle2, XCircle } from "lucide-react";

type ScanState = { status: "idle" | "success" | "error"; message?: string; attendee?: string };

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanState, setScanState] = useState<ScanState>({ status: "idle" });
  const [busy, setBusy] = useState(false);
  const lastPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    let stream: MediaStream;
    let raf: number;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        toast.error("Camera access denied — allow camera permissions to scan.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data !== lastPayloadRef.current && !busy) {
          lastPayloadRef.current = code.data;
          handleScan(code.data);
        }
      }
      raf = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  async function handleScan(payload: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/checkin", { method: "POST", body: JSON.stringify({ payload }) });
      const data = await res.json();
      if (!res.ok) {
        setScanState({ status: "error", message: data.error });
      } else {
        setScanState({ status: "success", attendee: data.attendee?.name ?? data.attendee?.email });
      }
    } catch {
      setScanState({ status: "error", message: "Network error — try again" });
    } finally {
      setTimeout(() => {
        setBusy(false);
        lastPayloadRef.current = null;
      }, 2500); // brief cooldown so the same frame isn't scanned repeatedly
    }
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-start px-4 py-8 sm:py-16 sm:px-6">
      <div className="w-full max-w-md">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">Scan a check-in QR</h1>
        <p className="mt-2 text-sm text-fg-muted">Point the camera at the attendee's QR code.</p>

        <div className="relative mt-6 sm:mt-8 w-full aspect-square overflow-hidden rounded-3xl border border-white/10">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="pointer-events-none absolute inset-4 sm:inset-8 rounded-2xl border-2 border-base-400/60" />
          <motion.div
            animate={{ y: [0, 200, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute left-4 right-4 sm:left-8 sm:right-8 top-4 sm:top-8 h-0.5 bg-base-400 shadow-glow"
          />
        </div>

        <AnimatePresence mode="wait">
          {scanState.status !== "idle" && (
            <motion.div
              key={scanState.status + (scanState.attendee ?? scanState.message ?? "")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 sm:mt-6 flex items-center justify-center gap-2 rounded-2xl p-3 sm:p-4 text-sm font-medium ${
                scanState.status === "success" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
              }`}
            >
              {scanState.status === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              <span className="truncate">{scanState.status === "success" ? `Checked in: ${scanState.attendee}` : scanState.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-4 sm:mt-6 flex items-center justify-center gap-2 text-xs text-fg-muted">
          <ScanLine size={14} /> Scanning continuously — no need to tap anything.
        </p>
      </div>
    </div>
  );
}
