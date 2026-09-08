import { createHash } from "node:crypto";

export class UnsafePasswordError extends Error {
  constructor() {
    super("UNSAFE_PASSWORD");
  }
}

export async function assertPasswordNotCompromised(password: string) {
  const digest = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "add-padding": "true", "user-agent": "WishNorth-Password-Security/1.0" },
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    if (!response.ok) return;
    const compromised = (await response.text()).split("\n").some(line => line.split(":", 1)[0]?.trim() === suffix);
    if (compromised) throw new UnsafePasswordError();
  } catch (error) {
    if (error instanceof UnsafePasswordError) throw error;
    // Availability failures must not lock every user out. Supabase still applies
    // its normal password rules, and the breach check will run on the next change.
  }
}
