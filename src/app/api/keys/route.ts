import crypto from "node:crypto";

export function generateApiKey() {
const fullKey = "mnp_${crypto.randomBytes(32).toString("hex")}";

const hash = crypto
.createHash("sha256")
.update(fullKey)
.digest("hex");

const prefix = fullKey.slice(0, 12);
const hint = fullKey.slice(-4);

return {
fullKey,
hash,
prefix,
hint,
};
}

export function hashKey(key: string) {
return crypto
.createHash("sha256")
.update(key)
.digest("hex");
}