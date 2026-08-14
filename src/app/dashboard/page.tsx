"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from "recharts";
import { 
  Users, CheckCircle2, Clock, XCircle, Hexagon, UserX, Plus, FileText, Loader2 
} from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Stats = {
  totalEvents: number;
  registrations: number;
  pending: number;
  approved: number;
  rejected: number;
  checkedIn: number;
  nftsMinted: number;
  noShows: number;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [perEvent, setPerEvent] = useState<{ event: string; checkedIn: number; noShow: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch stats only when authenticated
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetchStats();
    }
  }, [status, session]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch stats");
      }
      const data = await res.json();
      setStats(data.stats);
      setPerEvent(data.perEvent ?? []);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      setError("Could not load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cards = stats
    ? [
        { label: "Total Events", value: stats.totalEvents, icon: Users },
        { label: "Registrations", value: stats.registrations, icon: Users },
        { label: "Pending", value: stats.pending, icon: Clock },
        { label: "Approved", value: stats.approved, icon: CheckCircle2 },
        { label: "Rejected", value: stats.rejected, icon: XCircle },
        { label: "Checked In", value: stats.checkedIn, icon: CheckCircle2 },
        { label: "NFTs Minted", value: stats.nftsMinted, icon: Hexagon },
        { label: "No Shows", value: stats.noShows, icon: UserX },
      ]
    : [];

  const attendanceRate = stats && stats.approved > 0 ? Math.round((stats.checkedIn / stats.approved) * 100) : 0;

  const LoadingCard = () => (
    <Card className="animate-pulse h-32">
      <div className="h-5 w-5 mb-3 bg-gray-200 dark:bg-gray-800 rounded" />
      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
    </Card>
  );

  // Show loading state
  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Welcome back, {session?.user?.name || "Organizer"} 👋
          </h1>
          <p className="mt-2 text-fg-muted">Live numbers across every event you manage.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/reports" className="no-underline">
            <Button variant="secondary" className="inline-flex items-center gap-2 px-4 py-2">
              <FileText size={16} /> Reports
            </Button>
          </Link>
          <Link href="/dashboard/events/new" className="no-underline">
            <Button variant="primary" className="inline-flex items-center gap-2 px-4 py-2">
              <Plus size={16} /> New event
            </Button>
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-10 p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      ) : stats && stats.totalEvents === 0 ? (
        <div className="mt-16 text-center text-fg-muted">
          <p>You're not managing any events yet.</p>
          <Link href="/dashboard/events/new" className="mt-4 inline-block text-base-400 hover:underline">
            Create your first event →
          </Link>
        </div>
      ) : stats && stats.totalEvents > 0 ? (
        <>
          {/* Statistics Cards */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="rounded-2xl p-5 shadow-glass hover:shadow-glow transition-shadow h-36 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <s.icon className="h-5 w-5 text-base-400" />
                    <p className="text-xs text-fg-muted">{s.label}</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-semibold">{s.value}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Manage Events & Reports CTA */}
          <div className="mt-10">
            <Card className="rounded-2xl p-8 shadow-glass text-center">
              <h2 className="font-display text-2xl font-semibold">Manage Your Events</h2>
              <p className="mt-3 text-fg-muted">
                View your events, review applications, assign volunteers,
                manage your team, and monitor live QR check-ins.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <Link href="/dashboard/events">
                  <Button variant="primary" className="px-6 py-3">
                    Manage My Events
                  </Button>
                </Link>
                <Link href="/dashboard/reports">
                  <Button variant="secondary" className="px-6 py-3">
                    <FileText className="h-4 w-4 mr-2 inline" />
                    View Reports
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="glass-panel col-span-2 rounded-2xl p-6 shadow-glass">
              <h2 className="mb-4 font-display font-semibold">Check-ins vs no-shows</h2>
              <div className="h-64">
                {perEvent.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-sm text-fg-muted">
                    <p>No check-in data available yet</p>
                    <p className="text-xs mt-1">Once attendees start checking in, data will appear here</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perEvent}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="event" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "#0b0e17",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="checkedIn" fill="#0052ff" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="noShow" fill="#3a3f56" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 shadow-glass">
              <h2 className="mb-4 font-display font-semibold">Attendance rate</h2>
              <div className="flex items-center justify-center py-6">
                <div className="relative h-32 w-32">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={attendanceRate > 0 ? "#0052ff" : "rgba(255,255,255,0.08)"}
                      strokeWidth="10"
                      strokeDasharray={`${attendanceRate * 2.64} 999`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-display text-xl font-semibold">
                    {attendanceRate}%
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-fg-muted">
                {stats?.approved && stats.approved > 0
                  ? `of ${stats.approved} approved attendees checked in`
                  : "No approved attendees yet"}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
