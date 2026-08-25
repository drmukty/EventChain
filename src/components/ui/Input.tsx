"use client";

import React from "react";

export default function Input({ label, id, className = "", ...props }: any) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-bold text-black font-mono uppercase">
          {label}
        </label>
      )}
      <input
        id={id}
        className="px-4 py-3 rounded-[9px] border-2 border-black bg-surface text-black font-body focus:outline-none focus:ring-0 focus:border-lime focus:shadow-[0_0_0_3px_rgba(198,248,62,0.2)] placeholder-muted transition-all duration-150"
        {...props}
      />
    </div>
  );
}
