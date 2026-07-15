"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, CheckCircle2, Clock, XCircle, Hexagon, UserX, Plus } from "lucide-react";
import Link from "next/link";

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
  const [stats, setStats] = useState<Stats | null>(null);
  const [perEvent, setPerEvent] = useState<{ event: string; checkedIn: number; noShow: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setPerEvent(d.perEvent ?? []);
      })
      .catch((error) => {
        console.error("Failed to fetch dashboard stats:", error);
      })
      .finally(() => setLoading(false));
  }, []);

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

  const attendanceRate =
    stats && stats.approved > 0 ? Math.round((stats.checkedIn / stats.approved) * 100) : 0;

  // Loading skeleton for cards
  const LoadingCard = () => (
    <div className="glass-panel rounded-2xl p-5 shadow-glass animate-pulse">
      <div className="h-5 w-5 mb-3 bg-gray-700 rounded" />
      <div className="h-8 w-16 bg-gray-700 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-700 rounded" />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Organizer dashboard</h1>
          <p className="mt-2 text-fg-muted">Live numbers across every event you manage.</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="flex items-center gap-2 rounded-full bg-base-500 px-5 py-2.5 text-sm font-medium text-white shadow-glow hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> New event
        </Link>
      </div>

      {loading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <LoadingCard key={i} />
          ))}
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
                className="glass-panel rounded-2xl p-5 shadow-glass hover:shadow-glow transition-shadow"
              >
                <s.icon className="mb-3 h-5 w-5 text-base-400" />
                <p className="font-display text-2xl font-semibold">{s.value}</p>
                <p className="text-xs text-fg-muted">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Manage Events CTA */}
          <div className="mt-10">
            <div className="glass-panel rounded-2xl p-8 shadow-glass text-center">
              <h2 className="font-display text-2xl font-semibold">
                Manage Your Events
              </h2>
              <p className="mt-3 text-fg-muted">
                View your events, review applications, assign volunteers,
                manage your team, and monitor live QR check-ins.
              </p>
              <Link
                href="/dashboard/events"
                className="mt-6 inline-flex items-center rounded-full bg-base-500 px-6 py-3 font-medium text-white shadow-glow hover:opacity-90 transition-opacity"
              >
                Manage My Events
              </Link>
            </div>
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
                          borderRadius: "8px"
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
                {stats.approved > 0 
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
