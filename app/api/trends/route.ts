import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const DAY = 86_400_000;
const REGION_MIN_WISHES = 10;
const CITY_MIN_WISHES = 25;

type EventRow = {
  item_id: string | null;
  product_key: string | null;
  title_normalized: string | null;
  retailer: string | null;
  retailer_domain: string | null;
  category: string | null;
  brand: string | null;
  price_cents: number | null;
  geo_country: string | null;
  geo_region: string | null;
  geo_region_code: string | null;
  geo_city: string | null;
  created_at: string;
};

type ItemRow = {
  id: string;
  title: string;
  url: string | null;
  image_url: string | null;
  retailer: string | null;
  retailer_domain: string | null;
  category: string | null;
  brand: string | null;
  price_cents: number | null;
  currency: string;
  priority: number;
  product_key: string | null;
};

function prettyTitle(value: string) {
  return value.replace(/\b\w/g, c => c.toUpperCase());
}

function topEntry(map: Map<string, number>) {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

function leaderboard(map: Map<string, number>, total: number, limit = 8) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count, share: total ? Math.round((count / total) * 1000) / 10 : 0 }));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export async function GET() {
  try {
    const db = supabaseAdmin();
    const now = Date.now();
    const since30 = new Date(now - 30 * DAY).toISOString();
    const since7 = now - 7 * DAY;
    const since14 = now - 14 * DAY;

    const [{ data: eventData, error }, wishCount, listCount] = await Promise.all([
      db.from("trend_events")
        .select("item_id,product_key,title_normalized,retailer,retailer_domain,category,brand,price_cents,geo_country,geo_region,geo_region_code,geo_city,created_at")
        .gte("created_at", since30)
        .eq("event_type", "wish_added")
        .order("created_at", { ascending: false })
        .limit(10000),
      db.from("wish_items").select("id", { count: "exact", head: true }).eq("moderation_status", "active"),
      db.from("wish_lists").select("id", { count: "exact", head: true }).eq("moderation_status", "active"),
    ]);
    if (error) throw error;

    const events = (eventData || []) as EventRow[];
    const itemIds = [...new Set(events.map(e => e.item_id).filter(Boolean))] as string[];

    let items: ItemRow[] = [];
    let claims: Array<{ item_id: string }> = [];
    if (itemIds.length) {
      const [{ data: itemData }, { data: claimData }] = await Promise.all([
        db.from("wish_items")
          .select("id,title,url,image_url,retailer,retailer_domain,category,brand,price_cents,currency,priority,product_key")
          .in("id", itemIds)
          .eq("moderation_status", "active"),
        db.from("gift_claims").select("item_id").in("item_id", itemIds),
      ]);
      items = (itemData || []) as ItemRow[];
      claims = (claimData || []) as Array<{ item_id: string }>;
    }

    const itemMap = new Map(items.map(item => [item.id, item]));
    const claimedItems = new Set(claims.map(c => c.item_id));
    const categoryCounts = new Map<string, number>();
    const retailerCounts = new Map<string, number>();
    const regionBuckets = new Map<string, { name: string; code: string; country: string; count: number; categories: Map<string, number>; retailers: Map<string, number> }>();
    const cityBuckets = new Map<string, { city: string; region: string; country: string; count: number; categories: Map<string, number> }>();
    const productBuckets = new Map<string, { key: string; count: number; recent: number; prior: number; claimCount: number; priorityTotal: number; representative: ItemRow | null; title: string; retailer: string | null; category: string; brand: string | null; price_cents: number | null; latestAt: number }>();
    const prices: number[] = [];

    for (const event of events) {
      const item = event.item_id ? itemMap.get(event.item_id) || null : null;
      const category = item?.category || event.category || "Other";
      const retailer = item?.retailer || event.retailer || "Other retailer";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      retailerCounts.set(retailer, (retailerCounts.get(retailer) || 0) + 1);
      const price = item?.price_cents ?? event.price_cents;
      if (price != null) prices.push(price);

      const key = event.product_key || item?.product_key || event.title_normalized || event.item_id || "unknown";
      const created = new Date(event.created_at).getTime();
      const bucket = productBuckets.get(key) || {
        key,
        count: 0,
        recent: 0,
        prior: 0,
        claimCount: 0,
        priorityTotal: 0,
        representative: item,
        title: item?.title || prettyTitle(event.title_normalized || "Wish"),
        retailer: item?.retailer || event.retailer,
        category,
        brand: item?.brand || event.brand,
        price_cents: price ?? null,
        latestAt: created,
      };
      bucket.count += 1;
      if (created >= since7) bucket.recent += 1;
      else if (created >= since14) bucket.prior += 1;
      if (event.item_id && claimedItems.has(event.item_id)) bucket.claimCount += 1;
      bucket.priorityTotal += item?.priority || 1;
      if (created > bucket.latestAt) {
        bucket.latestAt = created;
        bucket.representative = item || bucket.representative;
        bucket.title = item?.title || bucket.title;
        bucket.retailer = item?.retailer || bucket.retailer;
        bucket.category = item?.category || bucket.category;
        bucket.brand = item?.brand || bucket.brand;
        bucket.price_cents = item?.price_cents ?? bucket.price_cents;
      }
      productBuckets.set(key, bucket);

      if (event.geo_country && event.geo_region) {
        const regionKey = `${event.geo_country}|${event.geo_region_code || event.geo_region}`;
        const region = regionBuckets.get(regionKey) || { name: event.geo_region, code: event.geo_region_code || "", country: event.geo_country, count: 0, categories: new Map(), retailers: new Map() };
        region.count += 1;
        region.categories.set(category, (region.categories.get(category) || 0) + 1);
        region.retailers.set(retailer, (region.retailers.get(retailer) || 0) + 1);
        regionBuckets.set(regionKey, region);
      }

      if (event.geo_country && event.geo_region && event.geo_city) {
        const cityKey = `${event.geo_country}|${event.geo_region_code || event.geo_region}|${event.geo_city}`;
        const city = cityBuckets.get(cityKey) || { city: event.geo_city, region: event.geo_region, country: event.geo_country, count: 0, categories: new Map() };
        city.count += 1;
        city.categories.set(category, (city.categories.get(category) || 0) + 1);
        cityBuckets.set(cityKey, city);
      }
    }

    const products = [...productBuckets.values()]
      .sort((a, b) => b.count - a.count || b.latestAt - a.latestAt)
      .slice(0, 12)
      .map((p, index) => ({
        rank: index + 1,
        productKey: p.key,
        title: p.title,
        retailer: p.retailer,
        category: p.category,
        brand: p.brand,
        imageUrl: p.representative?.image_url || null,
        url: p.representative?.url || null,
        priceCents: p.price_cents,
        currency: p.representative?.currency || "USD",
        count: p.count,
        claimIntent: p.count ? Math.round((p.claimCount / p.count) * 100) : 0,
        wantScore: p.count ? Math.round((p.priorityTotal / p.count) * 10) / 10 : 1,
      }));

    const rising = [...productBuckets.values()]
      .filter(p => p.recent >= 2 && p.recent > p.prior)
      .sort((a, b) => (b.recent - b.prior) - (a.recent - a.prior) || b.recent - a.recent)
      .slice(0, 6)
      .map(p => ({
        title: p.title,
        retailer: p.retailer,
        category: p.category,
        imageUrl: p.representative?.image_url || null,
        recent: p.recent,
        prior: p.prior,
        growthPercent: p.prior ? Math.round(((p.recent - p.prior) / p.prior) * 100) : null,
        newThisWeek: p.prior === 0,
      }));

    const priceBands = [
      { label: "Under $25", min: 0, max: 2499 },
      { label: "$25–$49", min: 2500, max: 4999 },
      { label: "$50–$99", min: 5000, max: 9999 },
      { label: "$100–$249", min: 10000, max: 24999 },
      { label: "$250+", min: 25000, max: Infinity },
    ].map(band => ({ ...band, count: prices.filter(p => p >= band.min && p <= band.max).length }))
      .map(({ label, count }) => ({ label, count, share: prices.length ? Math.round((count / prices.length) * 1000) / 10 : 0 }));

    const regions = [...regionBuckets.values()]
      .filter(r => r.count >= REGION_MIN_WISHES)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(r => ({
        region: r.name,
        regionCode: r.code,
        country: r.country,
        count: r.count,
        topCategory: topEntry(r.categories)?.[0] || null,
        topRetailer: topEntry(r.retailers)?.[0] || null,
      }));

    const cities = [...cityBuckets.values()]
      .filter(c => c.count >= CITY_MIN_WISHES)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(c => ({ city: c.city, region: c.region, country: c.country, count: c.count, topCategory: topEntry(c.categories)?.[0] || null }));

    const uniqueClaims = claimedItems.size;
    const total = events.length;
    const latest = [...productBuckets.values()]
      .sort((a, b) => b.latestAt - a.latestAt)
      .slice(0, 8)
      .map(p => ({ title: p.title, retailer: p.retailer, category: p.category, imageUrl: p.representative?.image_url || null, count: p.count }));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      windowDays: 30,
      totalWishes: wishCount.count || 0,
      totalLists: listCount.count || 0,
      sampleWishes: total,
      products,
      trends: products.filter(p => p.count >= 2).slice(0, 8).map(p => ({ title: p.title, count: p.count, retailer: p.retailer, category: p.category, imageUrl: p.imageUrl })),
      latest,
      rising,
      categories: leaderboard(categoryCounts, total),
      retailers: leaderboard(retailerCounts, total),
      priceBands,
      medianPriceCents: median(prices),
      averagePriceCents: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
      claimIntentPercent: total ? Math.round((uniqueClaims / total) * 100) : 0,
      regions,
      cities,
      geographyThresholds: { regionMinimum: REGION_MIN_WISHES, cityMinimum: CITY_MIN_WISHES },
      methodology: {
        note: "The Wish North Index uses aggregated wishes added during the last 30 days. A claim means a gift-giver marked an item as covered; it is not a confirmed purchase. Geography reflects the broad area where a wish was added and is shown only after minimum sample thresholds are met.",
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      generatedAt: new Date().toISOString(), trends: [], latest: [], products: [], rising: [], categories: [], retailers: [], priceBands: [], regions: [], cities: [], totalWishes: 0, totalLists: 0, sampleWishes: 0, medianPriceCents: null, averagePriceCents: null, claimIntentPercent: 0,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
