import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { cacheProductImage } from "@/lib/imageCache";
import { categorizeWish } from "@/lib/category";
import { enforceRateLimit } from "@/lib/rateLimit";
import { normalizeProductUrl, normalizeRetailer, normalizeTitle, productKey, retailerDomain } from "@/lib/normalize";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    await enforceRateLimit(req, "admin-image-backfill", 20, 3_600);
    const db = supabaseAdmin();
    const { data: items, error } = await db
      .from("wish_items")
      .select("id,title,url,image_url,image_source_url,retailer,category")
      .is("image_cached_at", null)
      .not("image_source_url", "is", null)
      .order("created_at", { ascending: true })
      .limit(5);
    if (error) throw error;

    let cachedCount = 0;
    let failedCount = 0;
    for (const item of items || []) {
      const sourceUrl = item.image_source_url || item.image_url;
      const cached = await cacheProductImage(sourceUrl);
      const url = normalizeProductUrl(item.url || "");
      const retailer = normalizeRetailer(item.retailer, url) || null;
      const normalizedTitle = normalizeTitle(item.title);
      const update = {
        image_url: cached.imageUrl,
        image_source_url: cached.sourceUrl || sourceUrl,
        image_cached_at: cached.imageUrl ? new Date().toISOString() : null,
        normalized_url: url || null,
        normalized_title: normalizedTitle,
        retailer,
        retailer_domain: retailerDomain(url) || null,
        product_key: productKey(item.title, url),
        category: categorizeWish({ title: item.title, retailer, url, rawCategory: item.category }),
        updated_at: new Date().toISOString(),
      };
      const { error: updateError } = await db.from("wish_items").update(update).eq("id", item.id);
      if (updateError) throw updateError;
      if (cached.imageUrl) cachedCount += 1;
      else failedCount += 1;
    }

    const { count: remaining } = await db
      .from("wish_items")
      .select("id", { count: "exact", head: true })
      .is("image_cached_at", null)
      .not("image_source_url", "is", null);
    return NextResponse.json({ processed: items?.length || 0, cached: cachedCount, failed: failedCount, remaining: remaining || 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = (error as Error & { status?: number }).status || (message === "ADMIN_REQUIRED" ? 403 : 500);
    return NextResponse.json({ error: status === 403 ? "Admin access required." : status === 429 ? "Too many maintenance requests." : status === 503 ? "Maintenance is temporarily unavailable." : "Could not cache legacy images." }, { status });
  }
}
