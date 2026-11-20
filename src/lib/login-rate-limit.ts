// Simple in-memory login rate limiter for the employee portal.
//
// Tracks failed attempts per identifier (employee number or email,
// normalized). After MAX_FAILED attempts within the WINDOW, the
// identifier is locked out for LOCK_MINUTES. Successful logins reset
// the counter. In-memory means a server restart clears the state —
// acceptable for this app's single-instance scale. For multi-instance
// deployments, swap this for a Redis-backed limiter.
//
// A periodic sweep removes stale entries so the map doesn't grow
// unbounded.

const MAX_FAILED = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15-minute rolling window
const LOCK_MS = 15 * 60 * 1000; // lock duration after threshold

interface AttemptRecord {
  failures: number[]; // timestamps of recent failures
  lockedUntil: number | null;
}

const store = new Map<string, AttemptRecord>();

function normalize(identifier: string): string {
  return identifier.trim().toLowerCase();
}

/** Removes failure timestamps older than the rolling window. */
function pruneOld(record: AttemptRecord, now: number): void {
  const cutoff = now - WINDOW_MS;
  record.failures = record.failures.filter((t) => t > cutoff);
}

/**
 * Checks whether the identifier may attempt a login.
 * Returns { allowed, retryAfterSec } — when allowed is false,
 * retryAfterSec tells the client how long to wait.
 */
export function checkRateLimit(
  identifier: string,
): { allowed: boolean; retryAfterSec: number } {
  const key = normalize(identifier);
  const now = Date.now();
  const record = store.get(key);

  if (!record) return { allowed: true, retryAfterSec: 0 };

  if (record.lockedUntil && record.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  pruneOld(record, now);
  if (record.failures.length >= MAX_FAILED) {
    // Lock now — threshold reached.
    record.lockedUntil = now + LOCK_MS;
    store.set(key, record);
    return { allowed: false, retryAfterSec: Math.ceil(LOCK_MS / 1000) };
  }

  return { allowed: true, retryAfterSec: 0 };
}

/** Records a failed login attempt for the identifier. */
export function recordFailure(identifier: string): void {
  const key = normalize(identifier);
  const now = Date.now();
  const record = store.get(key) ?? { failures: [], lockedUntil: null };
  pruneOld(record, now);
  record.failures.push(now);
  if (record.failures.length >= MAX_FAILED) {
    record.lockedUntil = now + LOCK_MS;
  }
  store.set(key, record);
}

/** Clears the failure counter on a successful login. */
export function recordSuccess(identifier: string): void {
  store.delete(normalize(identifier));
}

// Periodic cleanup — removes fully-stale entries every 5 minutes.
// Runs only in long-lived server processes; the timer is harmless in
// serverless cold starts (it just never fires before the instance dies).
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store) {
      pruneOld(record, now);
      if (record.failures.length === 0 && (!record.lockedUntil || record.lockedUntil <= now)) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}
