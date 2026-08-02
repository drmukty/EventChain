"use client";

import React from "react";

export function Skeleton({ className = "h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" }: { className?: string }) {
  return <div className={`animate-pulse ${className}`} />;
}

export default Skeleton;
