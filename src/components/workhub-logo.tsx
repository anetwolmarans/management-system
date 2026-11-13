"use client";

import { cn } from "@/lib/utils";

export function WorkhubLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-8 w-8", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="10" fill="currentColor" className="text-slate-900 dark:text-slate-100" />
      <rect x="6" y="11" width="36" height="4.5" rx="2.25" fill="#22d3ee" />
      <rect x="6" y="22" width="36" height="4.5" rx="2.25" fill="#34d399" />
      <rect x="6" y="33" width="22" height="4.5" rx="2.25" fill="#f59e0b" />
      <circle cx="37" cy="35.25" r="3.25" fill="#f43f5e" />
    </svg>
  );
}
