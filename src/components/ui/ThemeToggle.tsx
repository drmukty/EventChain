"use client";

import React, { useEffect } from "react";

export default function ThemeToggle() {
  useEffect(() => {
    // ensure theme class is present on first render
    if (!document.documentElement.classList.contains("dark")) return;
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <button onClick={toggle} aria-label="Toggle theme" className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-900 dark:text-gray-50">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
