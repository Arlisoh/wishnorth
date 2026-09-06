import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

function requestFingerprint(req: Request) {
  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32);
}

export async function enforceRateLimit(req: Request, action: string, limit: number, windowSeconds: number) {
  const db = supabaseAdmin();
  const bucket = `${action}:${requestFingerprint(req)}`;
  const { data, error } = await db.rpc("consume_rate_limit", { p_bucket_key: bucket, p_limit: limit, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate limit error", error);
    return;
  }
  if (!data) {
    const err = new Error("RATE_LIMITED");
    (err as Error & { status?: number }).status = 429;
    throw err;
  }
}

export function rejectBot(body: Record<string, unknown>) {
  if (String(body.website || "").trim()) {
    const err = new Error("BOT_REJECTED");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
}
