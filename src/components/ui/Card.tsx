"use client";

import React from "react";

export default function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm p-4 ${className}`}>
      {children}
    </div>
  );
}
