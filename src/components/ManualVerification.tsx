'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ManualVerificationProps {
  eventId: string;
}

export default function ManualVerification({ eventId }: ManualVerificationProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [attendee, setAttendee] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanToken = token.toUpperCase().trim();
    if (!/^[A-Z0-9]{8}$/.test(cleanToken)) {
      setStatus('error');
      setMessage('Token must be exactly 8 uppercase alphanumeric characters');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');
    setAttendee(null);

    try {
      const res = await fetch(`/api/events/${eventId}/verify-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('Check-in successful! 🎉');
        setAttendee(data.attendee?.name || data.attendee?.email || 'Attendee');
        setToken('');
        router.refresh();
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Manual Verification</h2>
        <p className="text-sm text-fg-muted mt-1">
          Enter the 8-character manual token provided to the attendee
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium mb-2">
            Manual Token
          </label>
          <input
            id="token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="e.g., A7B9C3D5"
            maxLength={8}
            className="w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest uppercase"
            disabled={loading}
            autoFocus
          />
          <p className="text-xs text-fg-muted mt-1">
            Format: 8 uppercase letters and numbers (A-Z, 0-9)
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || token.length !== 8}
          className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Token'
          )}
        </button>
      </form>

      {status !== 'idle' && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          status === 'success' 
            ? 'bg-green-500/10 border border-green-500/20' 
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {status === 'success' ? (
            <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`font-medium ${
              status === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {message}
            </p>
            {attendee && (
              <p className="text-sm text-fg-muted mt-1">
                Checked in: <span className="font-medium">{attendee}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
