"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";

type Notification = {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!session) return;
    const load = () =>
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          setItems(d.notifications ?? []);
          setUnread(d.unreadCount ?? 0);
        })
        .catch(() => {});
    load();
    const interval = setInterval(load, 20000); // simple polling — good enough without a websocket layer
    return () => clearInterval(interval);
  }, [session]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ markAllRead: true }) });
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnread(0);
  }

  if (!session) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-fg-muted hover:bg-white/5"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-base-500 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-panel absolute right-0 mt-2 w-80 rounded-2xl p-3 shadow-glass"
          >
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-sm font-medium">Notifications</p>
              <button onClick={markAllRead} className="text-xs text-base-400 hover:underline">
                Mark all read
              </button>
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-fg-muted">Nothing yet.</p>}
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl px-3 py-2 text-sm ${!n.readAt ? "bg-white/5" : ""}`}
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-fg-muted">{n.message}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
