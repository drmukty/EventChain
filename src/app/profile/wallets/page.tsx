"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet, Copy, Check, Plus, Key, ExternalLink, Star } from "lucide-react";
import toast from "react-hot-toast";
import { truncateAddress, NETWORKS, getWalletBalances } from "@/lib/wallet";

interface WalletData {
  id: string;
  address: string;
  isDefault: boolean;
  createdAt: string;
  balances?: Record<string, string>;
}

export default function WalletsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [importPrivateKey, setImportPrivateKey] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [step, setStep] = useState<"password" | "showKey">("password");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchWallets();
    }
  }, [status]);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/wallets");
      const data = await res.json();
      if (data.wallets) {
        // Fetch balances for each wallet
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
      }
    } catch (error) {
      toast.error("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setStep("password");
    setShowCreateModal(true);
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
    // The wallet was already created in proceedToKey, but we need to refresh the list.
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Wallets</h1>
          <p className="text-fg-muted">Manage your crypto wallets for event payments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Create Wallet
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <Key size={18} />
            Import
          </button>
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
            <button
              onClick={startCreate}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create New Wallet
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Import Existing
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-fg-muted">Wallet Address</p>
                    {wallet.isDefault && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3 fill-blue-400" /> Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-mono text-lg break-all">{wallet.address}</p>
                    <button
                      onClick={() => copyToClipboard(wallet.address)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {!wallet.isDefault && (
                  <button
                    onClick={() => setDefaultWallet(wallet.id)}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Set as Default
                  </button>
                )}
              </div>

              {/* Balances */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {wallet.balances && Object.entries(wallet.balances).map(([network, balance]) => {
                  const networkInfo = NETWORKS[network as keyof typeof NETWORKS];
                  if (!networkInfo) return null;
                  return (
                    <div key={network} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-fg-muted">{networkInfo.name}</p>
                      <p className="text-xl font-bold">{parseFloat(balance).toFixed(4)} {networkInfo.symbol}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex gap-3">
                <a
                  href={`${NETWORKS.baseSepolia.blockExplorer}/address/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                >
                  View on Explorer <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
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
                    If you lose it, your funds CANNOT be recovered.
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
    </div>
  );
}
