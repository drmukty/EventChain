"use client";

import React from "react";
import { Toaster } from "react-hot-toast";

export default function Toasts() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "rgb(var(--bg-elevated))",
          color: "rgb(var(--fg))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 6px 18px rgba(2,6,23,0.3)",
          backdropFilter: "blur(6px)",
        },
      }}
    />
  );
}
