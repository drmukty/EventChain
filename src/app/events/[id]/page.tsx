'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Copy, Check, Key, Loader2, QrCode, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  status: string;
  bannerUrl?: string;
}

interface Application {
  id: string;
  status: string;
  eventId: string;
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { data: session, status: sessionStatus } = useSession();

  const [event, setEvent] = useState<Event | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId, sessionStatus]);

  const fetchEventDetails = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      setEvent(data.event);
      
      // If user is logged in, fetch their application status
      if (session?.user) {
        const appRes = await fetch(`/api/me/applications?eventId=${eventId}`);
        const appData = await appRes.json();
        if (appData.applications && appData.applications.length > 0) {
          setApplication(appData.applications[0]);
        }
      }
    } catch (error) {
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchToken = async () => {
    if (!application) return;
    setTokenLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/manual-token/${application.id}`);
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        toast.success('Token ready!');
      } else {
        toast.error(data.error || 'Failed to get token');
      }
    } catch (error) {
      toast.error('Error fetching token');
    } finally {
      setTokenLoading(false);
    }
  };

  const fetchQR = async () => {
    if (!application) return;
    setQrLoading(true);
    try {
      // The QR code endpoint is on the approval API, but we can fetch it from applications
      const res = await fetch(`/api/events/${eventId}/applications`);
      const data = await res.json();
      const app = data.applications?.find((a: any) => a.id === application.id);
      if (app?.qrCode?.dataUrl) {
        setQrDataUrl(app.qrCode.dataUrl);
      } else {
        // Generate QR via approval endpoint (or we can add a separate endpoint)
        // For now, we'll use the existing approval endpoint to generate QR
        const genRes = await fetch(`/api/applications/${application.id}/qr`, {
          method: 'POST',
        });
        const genData = await genRes.json();
        if (genRes.ok && genData.qrDataUrl) {
          setQrDataUrl(genData.qrDataUrl);
        } else {
          toast.error('Could not generate QR code');
        }
      }
    } catch (error) {
      toast.error('Error fetching QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const copyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success('Token copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `qr-${eventId}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <p className="text-gray-500 mt-2">The event you're looking for doesn't exist.</p>
      </div>
    );
  }

  const isApproved = application?.status === 'APPROVED';
  const isPending = application?.status === 'PENDING';
  const isRejected = application?.status === 'REJECTED';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Event Banner */}
      {event.bannerUrl && (
        <div className="w-full h-64 rounded-xl overflow-hidden mb-6">
          <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}

      <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full text-sm">
          {event.status}
        </span>
        <span className="px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full text-sm">
          {event.venue}
        </span>
      </div>

      <div className="prose dark:prose-invert max-w-none mb-6">
        <p>{event.description}</p>
        <p><strong>Starts:</strong> {new Date(event.startsAt).toLocaleString()}</p>
        <p><strong>Ends:</strong> {new Date(event.endsAt).toLocaleString()}</p>
      </div>

      {/* Registration Status & Check-in Tools */}
      {session?.user ? (
        <div className="border-t pt-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Your Registration</h2>
          {application ? (
            <div className="space-y-4">
              <p>
                Status: 
                <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                  isApproved 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                    : isRejected
                    ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    : isPending
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {application.status}
                </span>
              </p>

              {isApproved && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
                  <p className="font-medium text-sm text-gray-600 dark:text-gray-300">
                    Your check-in options:
                  </p>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                    {/* QR Code Section */}
                    <div className="flex items-center gap-2">
                      {qrDataUrl ? (
                        <div className="flex items-center gap-3">
                          <img src={qrDataUrl} alt="QR Code" className="w-16 h-16 object-contain border rounded" />
                          <button
                            onClick={downloadQR}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={fetchQR}
                          disabled={qrLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                          {qrLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4" />
                          )}
                          Show QR Code
                        </button>
                      )}
                    </div>

                    {/* Manual Token Section */}
                    <div className="flex items-center gap-2">
                      {token ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-300 dark:border-gray-600">
                          <span className="font-mono text-lg tracking-wider">{token}</span>
                          <button
                            onClick={copyToken}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="Copy token"
                          >
                            {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={fetchToken}
                          disabled={tokenLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          {tokenLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Key className="h-4 w-4" />
                          )}
                          Get Manual Token
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Use the QR code for quick check‑in, or use the manual token if QR scanning fails.
                  </p>
                </div>
              )}

              {!isApproved && !isPending && !isRejected && (
                <p className="text-gray-500">Your application is being reviewed.</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-500 mb-3">You haven't registered for this event yet.</p>
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                Register Now
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t pt-6 mt-6 text-center">
          <p className="text-gray-500">Sign in to register and view your check‑in options.</p>
          <a href="/login" className="inline-block mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            Sign In
          </a>
        </div>
      )}
    </div>
  );
}
