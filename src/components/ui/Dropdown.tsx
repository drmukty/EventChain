"use client";

import React from "react";

export default function Dropdown({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`relative inline-block text-left ${className}`}>{children}</div>;
}
