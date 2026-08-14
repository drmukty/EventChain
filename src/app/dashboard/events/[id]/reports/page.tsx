'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, FileSpreadsheet, FileText, File } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    checkedIn: '',
    walletConnected: '',
    volunteers: '',
    nftHolders: '',
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && eventId) {
      fetch(`/api/events/${eventId}`)
        .then(r => r.json())
        .then(data => {
          setEventTitle(data.event?.title || 'Event');
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, eventId, router]);

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (filters.status) params.set('status', filters.status);
      if (filters.checkedIn !== '') params.set('checkedIn', filters.checkedIn);
      if (filters.walletConnected !== '') params.set('walletConnected', filters.walletConnected);
      if (filters.volunteers !== '') params.set('volunteers', filters.volunteers);
      if (filters.nftHolders !== '') params.set('nftHolders', filters.nftHolders);

      const url = `/api/events/${eventId}/reports?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Export failed');
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `event-report-${eventId}.${format === 'xlsx' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Report downloaded!');
    } catch (err) {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Reports & Export</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Generate and download reports for {eventTitle}
      </p>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Application Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full rounded border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="WAITLISTED">Waitlisted</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Check-in Status</label>
            <select
              value={filters.checkedIn}
              onChange={(e) => setFilters({ ...filters, checkedIn: e.target.value })}
              className="w-full rounded border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              <option value="true">Checked In</option>
              <option value="false">Not Checked In</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Wallet Connected</label>
            <select
              value={filters.walletConnected}
              onChange={(e) => setFilters({ ...filters, walletConnected: e.target.value })}
              className="w-full rounded border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              <option value="true">Connected</option>
              <option value="false">Not Connected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Volunteers</label>
            <select
              value={filters.volunteers}
              onChange={(e) => setFilters({ ...filters, volunteers: e.target.value })}
              className="w-full rounded border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              <option value="true">Volunteers Only</option>
              <option value="false">Non‑Volunteers Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">NFT Holders</label>
            <select
              value={filters.nftHolders}
              onChange={(e) => setFilters({ ...filters, nftHolders: e.target.value })}
              className="w-full rounded border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All</option>
              <option value="true">NFT Holders</option>
              <option value="false">Non‑NFT Holders</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Export Report</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <FileText size={18} />
            CSV
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet size={18} />
            Excel (XLSX)
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            <File size={18} />
            PDF
          </button>
        </div>
        {exporting && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating report...
          </div>
        )}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Reports include attendee details, application status, check‑in, NFT, certificate, and volunteer information.
          Exports are limited to 5 requests per 10 minutes per user.
        </p>
      </div>
    </div>
  );
}
