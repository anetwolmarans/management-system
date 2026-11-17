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
      {/* Rounded square — deep ocean blue */}
      <rect width="48" height="48" rx="12" fill="#146B8F" />
      {/* Teal bars */}
      <rect x="6" y="11" width="36" height="4.5" rx="2.25" fill="#2EB5AC" />
      <rect x="6" y="22" width="28" height="4.5" rx="2.25" fill="#2EB5AC" opacity="0.7" />
      <rect x="6" y="33" width="20" height="4.5" rx="2.25" fill="#2EB5AC" opacity="0.45" />
      {/* Sunshine yellow dot */}
      <circle cx="39" cy="35.25" r="3.5" fill="#FFC53D" />
    </svg>
  );
}
