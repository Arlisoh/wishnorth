import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashKey } from "@/lib/security";
import { userFromRequest } from "@/lib/auth";
import { enforceRateLimit, rejectBot } from "@/lib/rateLimit";
import { cacheProductImage } from "@/lib/imageCache";
import { normalizeProductUrl, normalizeRetailer, retailerDomain, normalizeTitle, productKey } from "@/lib/normalize";
import { categorizeWish } from "@/lib/category";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await enforceRateLimit(req, "add-wish", 40, 3600);
    const { id } = await params;
    const key = req.headers.get("x-owner-key") || "";
    const user = await userFromRequest(req);
    const body = await req.json();
    rejectBot(body);

    const db = supabaseAdmin();
    const { data: list, error: listError } = await db
      .from("wish_lists")
      .select("owner_key_hash,owner_user_id")
      .eq("id", id)
      .single();
    if (listError || !list) return NextResponse.json({ error: "List not found." }, { status: 404 });

    const ownerKeyMatches = Boolean(key) && hashKey(key) === list.owner_key_hash;
    const accountMatches = Boolean(user && list.owner_user_id === user.id);
    if (!ownerKeyMatches && !accountMatches) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Item name is required." }, { status: 400 });

    const priceNumber = body.price === "" || body.price == null ? null : Number(String(body.price).replace(/[^0-9.]/g, ""));
    const priceCents = typeof priceNumber === "number" && Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : null;
    const url = normalizeProductUrl(body.url || "");
    const cached = await cacheProductImage(body.imageUrl || null);
    const normalized = normalizeTitle(title);
    const domain = retailerDomain(url);
    const store = normalizeRetailer(body.retailer, url) || null;
    const keyProduct = productKey(title, url);
    const category = categorizeWish({ title, retailer: store, url, rawCategory: body.category });
    const brand = String(body.brand || "").trim().slice(0, 120) || null;

    const itemPayload = {
      list_id: id,
      title: title.slice(0, 300),
      url: url || null,
      normalized_url: url || null,
      image_url: cached.imageUrl,
      image_source_url: body.imageSourceUrl || cached.sourceUrl,
      image_cached_at: cached.imageUrl ? new Date().toISOString() : null,
      retailer: store,
      retailer_domain: domain || null,
      normalized_title: normalized,
      product_key: keyProduct,
      category,
      brand,
      price_cents: priceCents,
      size: body.size || null,
      color: body.color || null,
      notes: body.notes || null,
      priority: Math.min(3, Math.max(1, Number(body.priority) || 1)),
    };

    const { data: item, error } = await db.from("wish_items").insert(itemPayload).select("*").single();
    if (error) throw error;

    await db.from("trend_events").insert({
      item_id: item.id,
      title_normalized: normalized,
      retailer: store,
      retailer_domain: domain || null,
      product_key: keyProduct,
      category,
      brand,
      price_cents: priceCents,
      geo_country: req.headers.get("x-wish-geo-country") || null,
      geo_region: req.headers.get("x-wish-geo-region") || null,
      geo_region_code: req.headers.get("x-wish-geo-region-code") || null,
      geo_city: req.headers.get("x-wish-geo-city") || null,
    });

    return NextResponse.json({ item });
  } catch (e) {
    const status = (e as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: status === 429 ? "Too many wishes added too quickly. Please try again shortly." : "Could not add that wish." }, { status });
  }
}
