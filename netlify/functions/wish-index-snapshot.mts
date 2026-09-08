import type { Config, Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export default async function snapshotWishIndex(_req: Request, context: Context) {
  const supabaseUrl = Netlify.env.get("SUPABASE_URL");
  const serviceRoleKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Wish Index snapshot skipped: Supabase environment variables are missing.");
    return;
  }

  const response = await fetch(`${context.site.url}/api/trends?snapshot=1`, {
    headers: { "User-Agent": "WishNorthIndexSnapshot/1.0" },
  });
  if (!response.ok) throw new Error(`Wish Index API returned ${response.status}`);

  const payload = await response.json();
  const generatedAt = String(payload.generatedAt || new Date().toISOString());
  const snapshotDate = generatedAt.slice(0, 10);
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await db.from("wish_index_snapshots").upsert({
    snapshot_date: snapshotDate,
    generated_at: generatedAt,
    sample_wishes: Number(payload.sampleWishes || 0),
    total_wishes: Number(payload.totalWishes || 0),
    total_lists: Number(payload.totalLists || 0),
    median_price_cents: payload.medianPriceCents ?? null,
    claim_intent_percent: Number(payload.claimIntentPercent || 0),
    payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: "snapshot_date" });

  if (error) throw error;
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1_000).toISOString();
  const [{ error: currentLimitCleanupError }, { error: legacyLimitCleanupError }] = await Promise.all([
    db.from("api_rate_limits").delete().lt("updated_at", cutoff),
    db.from("rate_limit_buckets").delete().lt("updated_at", cutoff),
  ]);
  if (currentLimitCleanupError || legacyLimitCleanupError) {
    console.error("Rate-limit cleanup failed", currentLimitCleanupError || legacyLimitCleanupError);
  }
  console.log(`Wish Index snapshot stored for ${snapshotDate}.`);
}

export const config: Config = {
  schedule: "15 5 * * *",
};
