"use client";

import { SessionProvider } from "next-auth/react";
import ThemeInit from "@/components/ThemeInit";
import Toasts from "@/components/ui/Toasts";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeInit />
      {children}
      <Toasts />
    </SessionProvider>
  );
}
