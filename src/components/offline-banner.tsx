"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

/**
 * Full-width banner shown whenever the device drops its connection,
 * so users understand why data is not loading / not syncing.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (online) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-bold text-white shadow-lg"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M2 8.5a14.5 14.5 0 0 1 20 0" />
        <path d="M5.5 12a10 10 0 0 1 13 0" />
        <path d="M9 15.5a5.5 5.5 0 0 1 6 0" />
        <circle cx="12" cy="19.5" r="0.5" fill="currentColor" />
      </svg>
      You&apos;re offline — data can&apos;t sync right now. Actions will go through when you reconnect.
    </div>
  );
}
