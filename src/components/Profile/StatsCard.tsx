"use client";

import { motion } from "framer-motion";
import { Calendar, Award, FileCheck } from "lucide-react";

interface StatsCardProps {
  stats: {
    events: number;
    nfts: number;
    certificates: number;
  };
}

export default function StatsCard({ stats }: StatsCardProps) {
  const items = [
    { label: "Events Attended", value: stats.events, icon: Calendar },
    { label: "NFTs Minted", value: stats.nfts, icon: Award },
    { label: "Certificates", value: stats.certificates, icon: FileCheck },
  ];

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-panel rounded-xl p-3 text-center"
        >
          <item.icon className="mx-auto h-5 w-5 text-base-400" />
          <p className="mt-1 text-xl font-semibold">{item.value}</p>
          <p className="text-[10px] text-fg-muted">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
