import { randomBytes } from "crypto";

export function generateApiKey(): string {
  const bytes = randomBytes(28);
  return `mnp_${bytes.toString("base64url").slice(0, 34)}`;
}

export function hashApiKey(key: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(key).digest("hex");
}