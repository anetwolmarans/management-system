// PIN hashing for the employee portal.
//
// PINs are short (typically 4 digits) so they're weak on their own.
// We hash them with scrypt + a per-employee random salt to protect
// against DB leakage. To stay backward-compatible with existing
// plaintext PINs, verifyPin() detects the old format (no "$" separator)
// and treats it as plaintext — then login upgrades it to a hash on
// the next successful authentication.
import crypto from "crypto";

const SEPARATOR = "$";
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

/** Returns "salt$hash" — both hex-encoded. */
export function hashPin(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(plain, salt, 32, SCRYPT_PARAMS)
    .toString("hex");
  return `${salt}${SEPARATOR}${hash}`;
}

/**
 * Verifies a plaintext PIN against the stored value.
 * Supports both hashed ("salt$hash") and legacy plaintext formats.
 * Returns true on a match.
 */
export function verifyPin(plain: string, stored: string): boolean {
  if (!stored) return false;
  if (stored.includes(SEPARATOR)) {
    const [salt, hash] = stored.split(SEPARATOR);
    const computed = crypto
      .scryptSync(plain, salt, 32, SCRYPT_PARAMS)
      .toString("hex");
    // timingSafeEqual on equal-length buffers
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(computed, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  // Legacy plaintext — direct comparison (will be upgraded on next login).
  return plain === stored;
}

/** True if the stored value is a hashed PIN (not legacy plaintext). */
export function isHashedPin(stored: string): boolean {
  return stored?.includes(SEPARATOR) ?? false;
}
