"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Loader2, Wallet, Copy, Check, Plus, Key, ExternalLink, Star, Send, QrCode, History, Clock, 
  CheckCircle2, XCircle, ChevronDown, Settings, Pencil, Trash2, Search, User as UserIcon, Calendar 
} from "lucide-react";
import toast from "react-hot-toast";
import { truncateAddress, NETWORKS, NetworkId, DEFAULT_NETWORK } from "@/lib/wallet";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WalletData {
  id: string;
  address: string;
  name: string | null;
  isDefault: boolean;
  createdAt: string;
  balances?: Record<string, string>;
}

interface Transaction {
  id: string;
  type: 'sent';
  amount: string;
  token: string;
  recipient: string;
  status: string;
  txHash: string | null;
  networkId: string;
  recipientName: string;
  createdAt: string;
  explorerUrl: string | null;
}

interface Event {
  id: string;
  title: string;
}

interface Attendee {
  id: string;
  name: string | null;
  email: string;
  walletAddress: string | null;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function WalletsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string>("");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>(DEFAULT_NETWORK);

  // Dropdowns
  const [showGearDropdown, setShowGearDropdown] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameWalletId, setRenameWalletId] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  // Receive state
  const [receiveAddress, setReceiveAddress] = useState("");

  // Send state
  const [sendWalletId, setSendWalletId] = useState("");
  const [sendWalletAddress, setSendWalletAddress] = useState("");
  const [sendNetwork, setSendNetwork] = useState<NetworkId>(DEFAULT_NETWORK);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendMasterPassword, setSendMasterPassword] = useState("");
  const [sendStep, setSendStep] = useState<"select" | "confirm">("select");
  const [sendPaymentId, setSendPaymentId] = useState("");
  const [sending, setSending] = useState(false);
  const [sendTxHash, setSendTxHash] = useState("");
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  // Create/Import state
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [importPrivateKey, setImportPrivateKey] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [step, setStep] = useState<"password" | "showKey">("password");

  // History state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 300);
      return () => clearTimeout(timer);
    }

    fetchWallets();
    fetchEvents();
  }, [status, session]);

  // ─── API Calls ──────────────────────────────────────────────────────────

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/wallets");
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          return;
        }
        throw new Error("Failed to fetch wallets");
      }
      const data = await res.json();
      if (data.wallets) {
        const walletsWithBalances = await Promise.all(
          data.wallets.map(async (w: any) => {
            try {
              const balRes = await fetch(`/api/user/wallets/${w.id}/balance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              });
              const balData = await balRes.json();
              return { ...w, balances: balData.balances || {} };
            } catch {
              return { ...w, balances: {} };
            }
          })
        );
        setWallets(walletsWithBalances);
        const defaultWallet = walletsWithBalances.find(w => w.isDefault);
        setActiveWalletId(defaultWallet?.id || walletsWithBalances[0]?.id || "");
        setSelectedNetwork(DEFAULT_NETWORK);
      }
    } catch (error) {
      toast.error("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events?mine=true");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {
      // Silent fail
    }
  };

  const fetchAttendees = async (eventId: string) => {
    if (!eventId) return;
    setLoadingAttendees(true);
    try {
      const res = await fetch(`/api/events/${eventId}/applications`);
      if (!res.ok) throw new Error("Failed to fetch attendees");
      const data = await res.json();
      const apps = data.applications || [];
      const attendees: Attendee[] = apps
        .filter((a: any) => a.status === "APPROVED")
        .map((a: any) => ({
          id: a.id,
          name: a.user.name || a.user.email,
          email: a.user.email,
          // 🔥 FIX: use defaultWalletAddress from API, fallback to legacy walletAddress
          walletAddress: a.user.defaultWalletAddress || a.user.walletAddress || null,
        }));
      setAttendees(attendees);
      setSelectedAttendeeId("");
    } catch {
      toast.error("Failed to load attendees");
    } finally {
      setLoadingAttendees(false);
    }
  };

  const fetchHistory = async (walletId: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/user/wallets/${walletId}/transactions`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setTransactions(data.transactions || []);
      setShowHistoryModal(true);
    } catch {
      toast.error("Failed to load transaction history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // ─── Other functions ──────────────────────────────────────────────────────

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const setDefaultWallet = async (walletId: string) => {
    try {
      const res = await fetch(`/api/user/wallets/${walletId}/default`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Default wallet updated");
        await fetchWallets();
      } else {
        toast.error("Failed to update default wallet");
      }
    } catch {
      toast.error("Failed to update default wallet");
    }
  };

  const changeNetwork = (networkId: NetworkId) => {
    setSelectedNetwork(networkId);
  };

  // ─── Create / Import ──────────────────────────────────────────────────────

  const startCreate = () => {
    setStep("password");
    setShowCreateModal(true);
    setShowGearDropdown(false);
  };

  const openImport = () => {
    setShowImportModal(true);
    setShowGearDropdown(false);
  };

  const openRename = () => {
    const wallet = wallets.find(w => w.id === activeWalletId);
    if (wallet) {
      setRenameWalletId(wallet.id);
      setRenameName(wallet.name || "");
      setShowRenameModal(true);
      setShowGearDropdown(false);
    }
  };

  const handleRename = async () => {
    if (!renameName.trim()) {
      toast.error("Please enter a wallet name");
      return;
    }
    try {
      const res = await fetch(`/api/user/wallets/${renameWalletId}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameName.trim() }),
      });
      if (res.ok) {
        toast.success("Wallet renamed!");
        setShowRenameModal(false);
        await fetchWallets();
      } else {
        toast.error("Failed to rename wallet");
      }
    } catch {
      toast.error("Failed to rename wallet");
    }
  };

  const handleDeleteWallet = async () => {
    if (!activeWalletId) return;
    if (!confirm("Are you sure you want to delete this wallet? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/user/wallets/${activeWalletId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Wallet deleted");
        setShowGearDropdown(false);
        await fetchWallets();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete wallet");
      }
    } catch {
      toast.error("Failed to delete wallet");
    }
  };

  const proceedToKey = async () => {
    if (!masterPassword || masterPassword.length < 6) {
      toast.error("Master password must be at least 6 characters");
      return;
    }
    if (masterPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/user/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterPassword }),
      });
      const data = await res.json();
      if (data.privateKey) {
        setNewPrivateKey(data.privateKey);
        setStep("showKey");
      } else {
        toast.error(data.error || "Failed to generate wallet");
      }
    } catch {
      toast.error("Failed to generate wallet");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateWallet = async () => {
    if (!hasSavedKey) {
      toast.error("Please confirm you have saved your private key");
      return;
    }
    await fetchWallets();
    toast.success("Wallet created successfully!");
    setShowCreateModal(false);
    setMasterPassword("");
    setConfirmPassword("");
    setNewPrivateKey("");
    setHasSavedKey(false);
    setStep("password");
  };

  const handleImportWallet = async () => {
    if (!masterPassword || masterPassword.length < 6) {
      toast.error("Master password must be at least 6 characters");
      return;
    }
    if (!importPrivateKey || importPrivateKey.length < 10) {
      toast.error("Please enter a valid private key");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/user/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterPassword,
          importPrivateKey: importPrivateKey.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Wallet imported successfully!");
        await fetchWallets();
        setShowImportModal(false);
        setMasterPassword("");
        setConfirmPassword("");
        setImportPrivateKey("");
      } else {
        toast.error(data.error || "Failed to import wallet");
      }
    } catch {
      toast.error("Failed to import wallet");
    } finally {
      setIsCreating(false);
    }
  };

  // ─── Send Flow ──────────────────────────────────────────────────────────────

  const openSend = () => {
    if (!activeWalletId) return;
    const wallet = wallets.find(w => w.id === activeWalletId);
    if (!wallet) return;

    setSendWalletId(wallet.id);
    setSendWalletAddress(wallet.address);
    setSendNetwork(selectedNetwork);
    setSendStep("select");
    setSendAmount("");
    setSelectedEventId("");
    setSelectedAttendeeId("");
    setAttendees([]);
    setSendMasterPassword("");
    setSendPaymentId("");
    setSendTxHash("");
    setShowSendModal(true);
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedAttendeeId("");
    if (eventId) {
      fetchAttendees(eventId);
    } else {
      setAttendees([]);
    }
  };

  const handleSendDetailsSubmit = async () => {
    if (!selectedEventId || !selectedAttendeeId || !sendAmount) {
      toast.error("Please fill all fields");
      return;
    }
    if (isNaN(parseFloat(sendAmount)) || parseFloat(sendAmount) <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedAttendeeId,
          amount: sendAmount,
          networkId: sendNetwork,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendPaymentId(data.payment.id);
        setSendStep("confirm");
        toast.success("Payment initiated. Enter your master password to confirm.");
      } else {
        toast.error(data.error || "Failed to initiate payment");
      }
    } catch {
      toast.error("Failed to initiate payment");
    } finally {
      setSending(false);
    }
  };

  const handleSendConfirm = async () => {
    if (!sendMasterPassword) {
      toast.error("Please enter your master password");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/payments/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: sendPaymentId,
          masterPassword: sendMasterPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendTxHash(data.txHash);
        toast.success("Payment sent successfully! 🎉");
        await fetchWallets();
        setTimeout(() => {
          setShowSendModal(false);
          setSendStep("select");
          setSendMasterPassword("");
          setSendTxHash("");
        }, 2000);
      } else {
        toast.error(data.error || "Payment confirmation failed");
        if (data.error === "Invalid master password") {
          setSendMasterPassword("");
        }
      }
    } catch {
      toast.error("Failed to confirm payment");
    } finally {
      setSending(false);
    }
  };

  // ─── UI Helpers ─────────────────────────────────────────────────────────

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
      default: return <Clock className="h-4 w-4 text-yellow-400" />;
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const activeWallet = wallets.find(w => w.id === activeWalletId);
  const balance = activeWallet?.balances?.[selectedNetwork] || "0.0";
  const networkInfo = NETWORKS[selectedNetwork];

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Wallets</h1>
          <p className="text-fg-muted">Manage your crypto wallets for event payments</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowGearDropdown(!showGearDropdown)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Settings className="h-6 w-6 text-gray-500" />
          </button>

          {showGearDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              <button
                onClick={startCreate}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus size={16} />
                Create New Wallet
              </button>
              <button
                onClick={openImport}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Key size={16} />
                Import Wallet
              </button>
              {activeWallet && (
                <>
                  <hr className="border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={openRename}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Pencil size={16} />
                    Rename This Wallet
                  </button>
                  <button
                    onClick={handleDeleteWallet}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete This Wallet
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {wallets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-2xl">
          <Wallet className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Wallets Found</h2>
          <p className="text-fg-muted mb-6">
            Create a new wallet or import an existing one to start sending payments.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={startCreate} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Create New Wallet
            </button>
            <button onClick={openImport} className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
              Import Existing
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Wallet Selector Dropdown */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-fg-muted">Select Wallet:</label>
            <select
              value={activeWalletId}
              onChange={(e) => setActiveWalletId(e.target.value)}
              className="rounded-lg border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm flex-1 min-w-[200px]"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || truncateAddress(w.address)} {w.isDefault ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Active Wallet Card */}
          {activeWallet && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-fg-muted">Wallet Name</p>
                    {activeWallet.isDefault && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3 fill-blue-400" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-semibold">{activeWallet.name || "Unnamed Wallet"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-mono text-fg-muted">{activeWallet.address}</p>
                    <button
                      onClick={() => copyToClipboard(activeWallet.address)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {!activeWallet.isDefault && (
                  <button
                    onClick={() => setDefaultWallet(activeWallet.id)}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Set as Default
                  </button>
                )}
              </div>

              {/* Network Selector Dropdown */}
              <div className="mt-4 flex items-center gap-3">
                <label className="text-sm font-medium text-fg-muted">Network:</label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => changeNetwork(e.target.value as NetworkId)}
                  className="rounded-lg border p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm"
                >
                  {Object.values(NETWORKS).map((net) => (
                    <option key={net.id} value={net.id}>{net.name}</option>
                  ))}
                </select>
              </div>

              {/* Balance */}
              <div className="mt-3">
                <p className="text-xs text-fg-muted">Balance on {networkInfo?.name}</p>
                <p className="text-2xl font-bold">
                  {parseFloat(balance).toFixed(4)} {networkInfo?.symbol}
                </p>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={openSend}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  <Send size={16} />
                  Send
                </button>
                <button
                  onClick={() => {
                    setReceiveAddress(activeWallet.address);
                    setShowReceiveModal(true);
                  }}
                  className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  <QrCode size={16} />
                  Receive
                </button>
                <button
                  onClick={() => fetchHistory(activeWallet.id)}
                  className="flex items-center gap-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                >
                  <History size={16} />
                  History
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Rename Wallet</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Wallet Name</label>
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                placeholder="Enter wallet name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                }}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleRename}
                className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Wallet Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Create New Wallet</h2>
            {step === "password" ? (
              <div className="space-y-4">
                <p className="text-sm text-fg-muted">
                  Set a master password to encrypt your private key. This password will be required to send payments.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Master Password</label>
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                    placeholder="Enter master password (min 6 chars)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                    placeholder="Confirm master password"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={proceedToKey}
                    disabled={!masterPassword || masterPassword.length < 6 || masterPassword !== confirmPassword || isCreating}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {isCreating ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Continue →"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setMasterPassword("");
                      setConfirmPassword("");
                      setNewPrivateKey("");
                      setHasSavedKey(false);
                      setStep("password");
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                  <p className="text-sm text-yellow-400 font-medium">⚠️ Save Your Private Key</p>
                  <p className="text-xs text-fg-muted mt-1">
                    This is the ONLY time you will see this private key. Save it securely.
                  </p>
                </div>
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-xs text-fg-muted mb-2">Private Key</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm break-all text-yellow-400">{newPrivateKey}</p>
                    <button
                      onClick={() => copyToClipboard(newPrivateKey)}
                      className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasSavedKey}
                    onChange={(e) => setHasSavedKey(e.target.checked)}
                  />
                  <span className="text-sm">I have saved my private key securely</span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateWallet}
                    disabled={!hasSavedKey || isCreating}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {isCreating ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Confirm & Create"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setMasterPassword("");
                      setConfirmPassword("");
                      setNewPrivateKey("");
                      setHasSavedKey(false);
                      setStep("password");
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

      {/* Import Wallet Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Import Existing Wallet</h2>
            <p className="text-sm text-fg-muted mb-4">
              Enter your private key to import an existing wallet.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Private Key</label>
                <textarea
                  value={importPrivateKey}
                  onChange={(e) => setImportPrivateKey(e.target.value)}
                  className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700 font-mono text-sm"
                  rows={3}
                  placeholder="0x9f86d081884c7d659a9fe1..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Master Password</label>
                <input
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                  placeholder="Set a master password (min 6 chars)"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleImportWallet}
                  disabled={!importPrivateKey || !masterPassword || masterPassword.length < 6 || isCreating}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {isCreating ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Import Wallet"}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setMasterPassword("");
                    setImportPrivateKey("");
                  }}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Receive Funds</h2>
            <p className="text-sm text-fg-muted mb-4">Share this address to receive funds.</p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
              <p className="text-xs text-fg-muted mb-1">Your Wallet Address</p>
              <p className="font-mono text-sm break-all">{receiveAddress}</p>
              <button
                onClick={() => copyToClipboard(receiveAddress)}
                className="mt-2 inline-flex items-center gap-1 text-blue-500 hover:underline text-sm"
              >
                <Copy size={14} /> Copy Address
              </button>
            </div>
            <button
              onClick={() => setShowReceiveModal(false)}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Send Payment</h2>
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSendStep("select");
                  setSendMasterPassword("");
                  setSendTxHash("");
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {sendTxHash ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Payment Sent! 🎉</h3>
                <p className="text-sm text-fg-muted mb-4">Transaction has been sent successfully.</p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-fg-muted">Tx Hash</p>
                  <div className="flex items-center gap-2 justify-center">
                    <p className="font-mono text-sm break-all">{sendTxHash}</p>
                    <button
                      onClick={() => copyToClipboard(sendTxHash)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <a
                    href={`${NETWORKS[sendNetwork].blockExplorer}/tx/${sendTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors inline-flex items-center gap-2 text-sm"
                  >
                    <ExternalLink size={16} />
                    View on Explorer
                  </a>
                </div>
              </div>
            ) : sendStep === "select" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From Wallet</label>
                  <p className="text-sm font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{sendWalletAddress}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Network</label>
                  <select
                    value={sendNetwork}
                    onChange={(e) => setSendNetwork(e.target.value as NetworkId)}
                    className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                  >
                    {Object.values(NETWORKS).map((net) => (
                      <option key={net.id} value={net.id}>{net.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Select Event</label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => handleEventChange(e.target.value)}
                    className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                  >
                    <option value="">Select an event...</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Select Attendee</label>
                  <div className="relative">
                    <select
                      value={selectedAttendeeId}
                      onChange={(e) => setSelectedAttendeeId(e.target.value)}
                      className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                      disabled={!selectedEventId || loadingAttendees || attendees.length === 0}
                    >
                      <option value="">
                        {loadingAttendees
                          ? "Loading attendees..."
                          : attendees.length === 0
                          ? "No approved attendees found"
                          : "Select attendee..."}
                      </option>
                      {attendees.map((att) => (
                        <option
                          key={att.id}
                          value={att.id}
                          disabled={!att.walletAddress}
                        >
                          {att.name || att.email}
                          {att.walletAddress
                            ? ` (${truncateAddress(att.walletAddress)})`
                            : " (No wallet connected)"}
                        </option>
                      ))}
                    </select>
                    {loadingAttendees && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-fg-muted mt-1">
                    {attendees.length > 0
                      ? `Showing ${attendees.length} approved attendees. Those without a wallet are disabled.`
                      : "No approved attendees with a connected wallet."}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                    placeholder="0.001"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSendDetailsSubmit}
                    disabled={sending || !selectedEventId || !selectedAttendeeId || !sendAmount}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Next: Confirm →"}
                  </button>
                  <button
                    onClick={() => {
                      setShowSendModal(false);
                      setSendStep("select");
                      setSendMasterPassword("");
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-fg-muted text-center">
                  💰 Zero platform fee. You only pay gas fees.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">From:</span>
                    <span className="font-mono">{truncateAddress(sendWalletAddress)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">To:</span>
                    <div className="text-right">
                      <div className="font-semibold">
                        {attendees.find(a => a.id === selectedAttendeeId)?.name || "Unknown"}
                      </div>
                      <div className="font-mono text-xs text-fg-muted">
                        {attendees.find(a => a.id === selectedAttendeeId)?.walletAddress && 
                          truncateAddress(attendees.find(a => a.id === selectedAttendeeId)!.walletAddress || "")}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">Amount:</span>
                    <span className="font-bold">{sendAmount} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">Network:</span>
                    <span>{NETWORKS[sendNetwork].name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">Gas Fee:</span>
                    <span className="text-xs text-fg-muted">~0.0001 ETH (estimated)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Master Password</label>
                  <input
                    type="password"
                    value={sendMasterPassword}
                    onChange={(e) => setSendMasterPassword(e.target.value)}
                    className="w-full rounded-lg border p-3 bg-gray-50 dark:bg-gray-700"
                    placeholder="Enter master password"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendConfirm();
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSendConfirm}
                    disabled={!sendMasterPassword || sending}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Confirm & Send"}
                  </button>
                  <button
                    onClick={() => setSendStep("select")}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Transaction History</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-fg-muted">
                <History className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p>No transactions yet.</p>
                <p className="text-sm">Send payments to see them here.</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[60vh]">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-fg-muted">Recipient</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-fg-muted">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-fg-muted">Network</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-fg-muted">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-fg-muted">Tx Hash</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-fg-muted">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{tx.recipientName}</div>
                          <div className="text-xs font-mono text-fg-muted">{truncateAddress(tx.recipient)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {tx.amount} {tx.token}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {NETWORKS[tx.networkId as keyof typeof NETWORKS]?.name || tx.networkId}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(tx.status)}`}>
                            {getStatusIcon(tx.status)}
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {tx.txHash ? (
                            <a
                              href={tx.explorerUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline flex items-center gap-1"
                            >
                              {tx.txHash.slice(0, 10)}...
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-fg-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-fg-muted">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
