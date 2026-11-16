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
      <rect width="48" height="48" rx="11" fill="currentColor" className="text-primary" />
      <rect x="6" y="11" width="36" height="4.5" rx="2.25" fill="#ffffff" opacity="0.95" />
      <rect x="6" y="22" width="28" height="4.5" rx="2.25" fill="#ffffff" opacity="0.75" />
      <rect x="6" y="33" width="20" height="4.5" rx="2.25" fill="#ffffff" opacity="0.55" />
      <circle cx="39" cy="35.25" r="3.5" fill="#fbbf24" />
    </svg>
  );
}
