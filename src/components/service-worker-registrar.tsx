"use client";

import { useEffect } from "react";

/**
 * Registers the Management System service worker so the app keeps its shell
 * (and any previously visited pages) available when the device is offline.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW is an enhancement; ignore failures (e.g. insecure context)
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
