"use client";

import React from "react";

export default function Input({ label, id, className = "", ...props }: any) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</label>}
      <input id={id} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500" {...props} />
    </div>
  );
}
