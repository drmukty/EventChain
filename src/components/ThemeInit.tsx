"use client";

import { useEffect } from "react";

export default function ThemeInit() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

      const html = document.documentElement;

      if (stored === "dark") {
        html.classList.add("dark");
      } else if (stored === "light") {
        html.classList.remove("dark");
      } else if (prefersDark) {
        // preserve existing default which is dark, but adapt to system if no stored preference
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }

      // ensure body uses css variables immediately
      const root = getComputedStyle(document.documentElement);
      // no-op; access triggers style calculation
    } catch (e) {
      // ignore in SSR or restricted environments
      // preserve default (server-provided) theme
    }
  }, []);

  return null;
}
