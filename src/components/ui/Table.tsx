"use client";

import React from "react";

export function Table({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto bg-transparent ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">{children}</table>
    </div>
  );
}

export default Table;
