// src/lib/keys.ts
// MAIN NAIJA API KEY GENERATOR - 38 CHAR SECURE

import crypto from 'crypto';

export interface GeneratedKey {
  fullKey: string; // mn_live_ + 38 chars = 46 total - SHOW ONCE!
  hash: string;    // SHA-256 for DB
  prefix: string;  // First 12 chars for list: mn_live_aB3k
  hint: string;    // Last 4 chars for ...MnOp
}

/**
 * Generate secure API key - 38 base64url chars
 * Example: mn_live_aB3k9XyZ7LmN0pQrStUvWx2AbCdEfGhIjKlMnOpQrSt
 */
export function generateApiKey(): GeneratedKey {
  // mn_live_ + 38 base64url characters ≈ 46 chars total
  const randomPart = crypto.randomBytes(29).toString("base64url").slice(0, 38);
  const fullKey = `mn_live_${randomPart}`;
  const hash = crypto.createHash("sha256").update(fullKey).digest("hex");
  const prefix = fullKey.slice(0, 12);  // for list view
  const hint  = fullKey.slice(-4);      // last 4 chars

  return { fullKey, hash, prefix, hint };
}

/**
 * Hash incoming key for validation
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Mask key for display: mn_live_aB3k...MnOp
 */
export function maskKey(prefix: string, hint: string): string {
  return `${prefix}...${hint}`;
}