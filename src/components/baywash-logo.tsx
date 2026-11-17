"use client";

import { cn } from "@/lib/utils";

/**
 * BAYWASH Group brand mark — two cupped hands holding a water drop.
 * variant "color":   navy drop + cyan hands — for light surfaces.
 * variant "inverse": white drop + cyan hands — for the navy sidebar / dark brand surfaces.
 */
export function BaywashLogo({
  className,
  variant = "color",
}: {
  className?: string;
  variant?: "color" | "inverse";
}) {
  const drop = variant === "inverse" ? "#FFFFFF" : "#01205E";
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Water drop */}
      <path
        d="M32 3.5 C27.5 11 19.5 22.5 19.5 32.5 C19.5 40.6 25.1 46.2 32 46.2 C38.9 46.2 44.5 40.6 44.5 32.5 C44.5 22.5 36.5 11 32 3.5 Z"
        fill={drop}
      />
      <circle cx="32" cy="33.5" r="4.6" fill="#00AEEF" />
      {/* Left hand */}
      <g fill="#00AEEF">
        <ellipse cx="18" cy="52" rx="10.5" ry="6.5" />
        <rect x="5" y="29" width="6.4" height="25" rx="3.2" transform="rotate(-24 8.2 54)" />
        <rect x="11.5" y="22.5" width="6.4" height="27" rx="3.2" transform="rotate(-14 14.7 50)" />
        <rect x="17.5" y="18.5" width="6.4" height="28" rx="3.2" transform="rotate(-6 20.7 53)" />
      </g>
      {/* Right hand — mirrored */}
      <g fill="#00AEEF" transform="translate(64,0) scale(-1,1)">
        <ellipse cx="18" cy="52" rx="10.5" ry="6.5" />
        <rect x="5" y="29" width="6.4" height="25" rx="3.2" transform="rotate(-24 8.2 54)" />
        <rect x="11.5" y="22.5" width="6.4" height="27" rx="3.2" transform="rotate(-14 14.7 50)" />
        <rect x="17.5" y="18.5" width="6.4" height="28" rx="3.2" transform="rotate(-6 20.7 53)" />
      </g>
    </svg>
  );
}
