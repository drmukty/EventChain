'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, Wallet, Send, CheckCircle2, XCircle, Clock, Copy, Check, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { NETWORKS, DEFAULT_NETWORK, truncateAddress, getExplorerUrl } from '@/lib/wallet';

interface Payment {
  id: string;
  amount: string;
  token: string;
  status: string;
  txHash: string | null;
  networkId: string;
  createdAt: string;
  application: {
    user: {
      name: string | null;
      email: string;
      walletAddress: string | null;
    };
  };
}

export default function TreasuryPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>(DEFAULT_NETWORK);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchTreasuryData();
      fetchApplications();
    }
  }, [status, eventId]);

  const fetchTreasuryData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/treasury`);
      const data = await res.json();
      setData(data);
    } catch (error) {
      toast.error('Failed to load treasury data');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/applications`);
      const data = await res.json();
      const approved = data.applications?.filter((a: any) => a.status === 'APPROVED' && a.user.walletAddress) || [];
      setApplications(approved);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  };

  const handleSendPayment = async () => {
    if (!selectedApplication || !amount) {
      toast.error('Please select an attendee and enter amount');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedApplication,
          amount,
          networkId: selectedNetwork,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPaymentId(data.payment.id);
        setShowConfirmModal(true);
        setShowPaymentForm(false);
        toast.success('Payment initiated! Enter your master password to confirm.');
      } else {
        toast.error(data.error || 'Payment failed');
      }
    } catch (error) {
      toast.error('Failed to send payment');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!masterPassword) {
      toast.error('Please enter your master password');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/payments/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          masterPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTxHash(data.txHash);
        toast.success('Payment sent successfully! 🎉');
        setTimeout(() => {
          setShowConfirmModal(false);
          setMasterPassword('');
          setPaymentId('');
          setTxHash('');
          setSelectedApplication('');
          setAmount('');
          fetchTreasuryData();
        }, 2000);
      } else {
        toast.error(data.error || 'Payment confirmation failed');
        if (data.error === 'Invalid master password') {
          setMasterPassword('');
        }
      }
    } catch (error) {
      toast.error('Failed to confirm payment');
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
      FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return styles[status] || styles.PENDING;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-400" />;
      default: return <Clock className="h-4 w-4 text-blue-400" />;
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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Treasury</h1>
          <p className="text-fg-muted">Manage event funds and send payments</p>
        </div>
        {data?.wallet && (
          <button
            onClick={() => setShowPaymentForm(!showPaymentForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <Send size={18} />
            Send Payment
          </button>
        )}
      </div>

      {/* Wallet Status */}
      {!data?.wallet ? (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mb-6 text-center">
          <p className="text-yellow-400">No wallet found. Please create a wallet first.</p>
          <button
            onClick={() => router.push('/profile/wallets')}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Go to Wallets
          </button>
        </div>
      ) : (
        <>
          {/* Wallet Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Wallet className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-fg-muted">Sending From</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm">{truncateAddress(data.wallet.address)}</p>
                  <button
                    onClick={() => copyToClipboard(data.wallet.address)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mr-2">Network:</label>
              <select
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="rounded border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
              >
                {Object.entries(NETWORKS).map(([id, network]) => (
                  <option key={id} value={id}>{network.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {data.balances && Object.entries(data.balances).map(([networkId, balance]: [string, any]) => {
              const network = NETWORKS[networkId as keyof typeof NETWORKS];
              if (!network) return null;
              return (
                <div key={networkId} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-sm text-fg-muted">{network.name}</p>
                  <p className="text-2xl font-bold">{parseFloat(balance).toFixed(4)} {network.symbol}</p>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
              <p className="text-sm text-fg-muted">Total Paid</p>
              <p className="text-xl font-bold">{data.summary?.totalPaid?.toFixed(4) || '0.0000'} ETH</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
              <p className="text-sm text-fg-muted">Pending</p>
              <p className="text-xl font-bold text-yellow-400">{data.summary?.pendingPayments || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
              <p className="text-sm text-fg-muted">Failed</p>
              <p className="text-xl font-bold text-red-400">{data.summary?.failedPayments || 0}</p>
            </div>
          </div>

          {/* Payment Form */}
          {showPaymentForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Send Payment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Attendee</label>
                  <select
                    value={selectedApplication}
                    onChange={(e) => setSelectedApplication(e.target.value)}
                    className="w-full rounded border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    required
                  >
                    <option value="">Select an attendee...</option>
                    {applications.map((app: any) => (
                      <option key={app.id} value={app.id}>
                        {app.user.name || app.user.email} {app.user.walletAddress ? `(${truncateAddress(app.user.walletAddress)})` : '(No wallet)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Network</label>
                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="w-full rounded border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                  >
                    {Object.entries(NETWORKS).map(([id, network]) => (
                      <option key={id} value={id}>{network.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="0.001"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSendPayment}
                    disabled={sending}
                    className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Send Payment'}
                  </button>
                  <button
                    onClick={() => setShowPaymentForm(false)}
                    className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-fg-muted">
                  💰 Zero platform fee. You only pay gas fees (~0.0001 ETH).
                </p>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <h2 className="text-lg font-semibold p-6 pb-2">Transaction History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase">Attendee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase">Network</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase">Tx Hash</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.payments?.length > 0 ? (
                    data.payments.map((payment: Payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm">
                          {payment.application?.user?.name || payment.application?.user?.email || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">{payment.amount} ETH</td>
                        <td className="px-6 py-4 text-sm">
                          {NETWORKS[payment.networkId as keyof typeof NETWORKS]?.name || payment.networkId}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(payment.status)}`}>
                            {getStatusIcon(payment.status)}
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono">
                          {payment.txHash ? (
                            <a
                              href={getExplorerUrl(payment.txHash, payment.networkId as any)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline flex items-center gap-1"
                            >
                              {payment.txHash.slice(0, 10)}...
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-fg-muted">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-fg-muted">
                        No transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirm Payment Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Confirm Payment</h2>

            {txHash ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Payment Sent! 🎉</h3>
                <p className="text-sm text-fg-muted mb-4">Transaction has been sent successfully.</p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-fg-muted">Tx Hash</p>
                  <div className="flex items-center gap-2 justify-center">
                    <p className="font-mono text-sm break-all">{txHash}</p>
                    <button
                      onClick={() => copyToClipboard(txHash)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <a
                    href={getExplorerUrl(txHash, selectedNetwork as any)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
                  >
                    <ExternalLink size={16} />
                    View on Explorer
                  </a>
                  <button
                    onClick={() => {
                      setShowConfirmModal(false);
                      setMasterPassword('');
                      setPaymentId('');
                      setTxHash('');
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-fg-muted">
                  Enter your master password to decrypt your private key and send this payment.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Master Password</label>
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                    placeholder="Enter master password"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmPayment();
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmPayment}
                    disabled={!masterPassword || sending}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Confirm & Send'}
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmModal(false);
                      setMasterPassword('');
                      setPaymentId('');
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
