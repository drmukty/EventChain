"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
};

export default function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants: Record<string, string> = {
    primary: "bg-gray-900 text-white hover:bg-black px-4 py-2 shadow-sm",
    secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 px-3 py-2",
    ghost: "bg-transparent text-gray-900 hover:bg-gray-100 px-2 py-1",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
