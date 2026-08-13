'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, QrCode, Key } from 'lucide-react';
import jsQR from 'jsqr';
import toast from 'react-hot-toast';
import ManualVerification from '@/components/ManualVerification';

export default function EventCheckInPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState('');
  const [scanStatus, setScanStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPayloadRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && eventId) {
      fetch(`/api/events/${eventId}`)
        .then((r) => r.json())
        .then((data) => {
          setEventTitle(data.event?.title || 'Event');
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [status, router, eventId]);

  useEffect(() => {
    if (activeTab === 'qr' && eventId) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, eventId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanLoop();
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Could not access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(image.data, image.width, image.height);

      if (qr && qr.data !== lastPayloadRef.current) {
        lastPayloadRef.current = qr.data;
        handleQRScan(qr.data);
      }
    }

    animationRef.current = requestAnimationFrame(scanLoop);
  };

  const handleQRScan = async (payload: string) => {
    setScanStatus({ type: null, message: '' });

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, eventId })
      });

      const data = await res.json();

      if (res.ok) {
        setScanStatus({
          type: 'success',
          message: `✓ Checked in: ${data.attendee?.name || data.attendee?.email || 'Attendee'}`
        });
        toast.success('Check-in successful!');
      } else {
        setScanStatus({
          type: 'error',
          message: `✗ ${data.error || 'Check-in failed'}`
        });
        toast.error(data.error || 'Check-in failed');
      }
    } catch (err) {
      setScanStatus({
        type: 'error',
        message: '✗ Network error. Please try again.'
      });
      toast.error('Network error');
    }

    setTimeout(() => {
      lastPayloadRef.current = null;
      if (scanStatus.type !== 'error') {
        setScanStatus({ type: null, message: '' });
      }
    }, 3000);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Check-In</h1>
        <p className="text-fg-muted mb-2">
          {eventTitle}
        </p>
        <p className="text-sm text-fg-muted mb-6">
          Scan QR codes or enter manual tokens to check in attendees
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors relative ${
                activeTab === 'qr'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <QrCode size={20} />
                QR Check-In
              </div>
              {activeTab === 'qr' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors relative ${
                activeTab === 'manual'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Key size={20} />
                Manual Verification
              </div>
              {activeTab === 'manual' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'qr' ? (
              <div className="space-y-4">
                <p className="text-sm text-fg-muted text-center">
                  Scan the attendee's QR code to check them in
                </p>
                
                <div className="max-w-md mx-auto">
                  <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-black/5">
                    <div className="aspect-square relative">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-8 border-2 border-blue-500/60 rounded-lg"></div>
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-blue-500/60 animate-pulse"></div>
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-blue-500/60 animate-pulse"></div>
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 w-8 h-0.5 bg-blue-500/60 animate-pulse"></div>
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 w-8 h-0.5 bg-blue-500/60 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {scanStatus.type && (
                  <div className={`p-3 rounded-lg text-center ${
                    scanStatus.type === 'success'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {scanStatus.message}
                  </div>
                )}

                <p className="text-xs text-fg-muted text-center">
                  Scanning continuously — no need to tap anything.
                </p>
              </div>
            ) : (
              <ManualVerification eventId={eventId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
