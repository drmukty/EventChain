"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

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
    const interval = setInterval(load, 20000);
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
      {/* Bell Button */}
      <Button
        variant="ghost"
        className="relative p-2 rounded-full"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && (
          <Badge className="absolute -right-1 -top-1 h-4 w-4 min-w-[16px] rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </Badge>
        )}
      </Button>

      {/* Dropdown Panel – using Card for consistent styling */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-80 z-50"
          >
            <Card className="p-3 glass-panel">
              {/* Header with Close Button */}
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Notifications</p>
                <div className="flex items-center gap-2">
                  {items.length > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Mark all read
                    </button>
                  )}
                  <Button variant="ghost" className="p-1" onClick={() => setOpen(false)} aria-label="Close notifications">
                    <X size={14} />
                  </Button>
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {items.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-gray-500 dark:text-gray-400">Nothing yet.</p>
                )}
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-xl px-3 py-2 text-sm ${!n.readAt ? "bg-gray-100 dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{n.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{n.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
