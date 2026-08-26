import crypto from "crypto";

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
