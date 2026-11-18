"use client";

import { cn } from "@/lib/utils";

/**
 * Management System brand mark — three ascending bars on a rounded tile.
 * Neutral, company-agnostic glyph in the brand palette (navy + cyan).
 * variant "color":   navy tile + cyan bars — for light surfaces.
 * variant "inverse": bars only (white/cyan) — for navy / dark brand surfaces.
 */
export function BrandLogo({
  className,
  variant = "color",
}: {
  className?: string;
  variant?: "color" | "inverse";
}) {
  if (variant === "inverse") {
    return (
      <svg
        viewBox="0 0 64 64"
        className={cn("h-8 w-8", className)}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="14" y="38" width="8" height="14" rx="4" fill="#00AEEF" />
        <rect x="28" y="30" width="8" height="22" rx="4" fill="#7FCBEC" />
        <rect x="42" y="20" width="8" height="32" rx="4" fill="#FFFFFF" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#01205E" />
      <rect x="14" y="38" width="8" height="14" rx="4" fill="#7FCBEC" />
      <rect x="28" y="30" width="8" height="22" rx="4" fill="#018DC5" />
      <rect x="42" y="20" width="8" height="32" rx="4" fill="#00AEEF" />
    </svg>
  );
}
