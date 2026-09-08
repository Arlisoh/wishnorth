import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const DAY = 86_400_000;
const REGION_MIN_WISHES = 10;
const CITY_MIN_WISHES = 25;

type EventRow = {
  item_id: string | null; product_key: string | null; title_normalized: string | null;
  retailer: string | null; retailer_domain: string | null; category: string | null;
  brand: string | null; price_cents: number | null; geo_country: string | null;
  geo_region: string | null; geo_region_code: string | null; geo_city: string | null; created_at: string;
};
type ItemRow = {
  id: string; title: string; url: string | null; image_url: string | null; retailer: string | null;
  retailer_domain: string | null; category: string | null; brand: string | null; price_cents: number | null;
  currency: string; priority: number; product_key: string | null;
};
type ProductBucket = {
  key: string; count: number; recent: number; prior: number; claimCount: number; priorityTotal: number;
  representative: ItemRow | null; title: string; retailer: string | null; category: string;
  brand: string | null; price_cents: number | null; latestAt: number;
};
type RetailerBucket = {
  count: number; recent: number; prior: number; claimed: number; prices: number[];
  categories: Map<string, number>; products: Map<string, number>;
};

function prettyTitle(value: string) { return value.replace(/\b\w/g, c => c.toUpperCase()); }
function topEntry(map: Map<string, number>) { return [...map.entries()].sort((a, b) => b[1] - a[1])[0] || null; }
function leaderboard(map: Map<string, number>, total: number, limit = 20) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([name, count]) => ({ name, count, share: total ? Math.round((count / total) * 1000) / 10 : 0 }));
}
function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
function csvCell(value: unknown) { const text = value == null ? "" : String(value); return `"${text.replace(/"/g, '""')}"`; }
function productCsv(products: Array<Record<string, unknown>>) {
  const fields = ["rank", "title", "retailer", "category", "brand", "priceCents", "count", "wishVelocity", "wishShare", "wishShareChange", "coveredPercent", "uncoveredCount", "url"];
  return [fields.join(","), ...products.map(product => fields.map(field => csvCell(product[field])).join(","))].join("\n");
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const requestedCategory = requestUrl.searchParams.get("category")?.trim() || "";
    const requestedRetailer = requestUrl.searchParams.get("retailer")?.trim() || "";
    const requestedSort = requestUrl.searchParams.get("sort") || "top";
    const maxPriceParam = Number(requestUrl.searchParams.get("maxPrice"));
    const maxPriceCents = Number.isFinite(maxPriceParam) && maxPriceParam > 0 ? Math.round(maxPriceParam * 100) : null;
    const snapshotMode = requestUrl.searchParams.get("snapshot") === "1";
    const db = supabaseAdmin(), now = Date.now();
    const since30 = new Date(now - 30 * DAY).toISOString(), since7 = now - 7 * DAY, since14 = now - 14 * DAY;

    const [eventResult, wishCount, listCount, itemResult, claimResult, snapshotResult] = await Promise.all([
      db.from("trend_events").select("item_id,product_key,title_normalized,retailer,retailer_domain,category,brand,price_cents,geo_country,geo_region,geo_region_code,geo_city,created_at")
        .gte("created_at", since30).eq("event_type", "wish_added").order("created_at", { ascending: false }).limit(10000),
      db.from("wish_items").select("id", { count: "exact", head: true }).eq("moderation_status", "active"),
      db.from("wish_lists").select("id", { count: "exact", head: true }).eq("moderation_status", "active"),
      db.from("wish_items").select("id,title,url,image_url,retailer,retailer_domain,category,brand,price_cents,currency,priority,product_key")
        .eq("moderation_status", "active").limit(10000),
      db.from("gift_claims").select("item_id").limit(10000),
      snapshotMode
        ? Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null })
        : db.from("wish_index_snapshots").select("snapshot_date,generated_at,sample_wishes,total_wishes,total_lists,median_price_cents,claim_intent_percent")
          .order("snapshot_date", { ascending: true }).limit(400),
    ]);
    const queryError = eventResult.error || itemResult.error || claimResult.error || snapshotResult.error;
    if (queryError) throw queryError;
    const events = (eventResult.data || []) as EventRow[];
    const eventItemIds = new Set(events.map(event => event.item_id).filter(Boolean));
    const items = ((itemResult.data || []) as ItemRow[]).filter(item => eventItemIds.has(item.id));
    const claims = ((claimResult.data || []) as Array<{ item_id: string }>).filter(claim => eventItemIds.has(claim.item_id));

    const itemMap = new Map(items.map(item => [item.id, item])), claimedItems = new Set(claims.map(claim => claim.item_id));
    const categoryCounts = new Map<string, number>(), retailerCounts = new Map<string, number>();
    const regionBuckets = new Map<string, { name: string; code: string; country: string; count: number; categories: Map<string, number>; retailers: Map<string, number> }>();
    const cityBuckets = new Map<string, { city: string; region: string; country: string; count: number; categories: Map<string, number> }>();
    const productBuckets = new Map<string, ProductBucket>();
    const retailerBuckets = new Map<string, RetailerBucket>();
    const prices: number[] = []; let totalRecent = 0, totalPrior = 0;

    for (const event of events) {
      const item = event.item_id ? itemMap.get(event.item_id) || null : null;
      const category = item?.category || event.category || "Other", retailer = item?.retailer || event.retailer || "Other retailer";
      const price = item?.price_cents ?? event.price_cents, created = new Date(event.created_at).getTime();
      const isRecent = created >= since7, isPrior = created < since7 && created >= since14;
      const isClaimed = Boolean(event.item_id && claimedItems.has(event.item_id));
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1); retailerCounts.set(retailer, (retailerCounts.get(retailer) || 0) + 1);
      if (price != null) prices.push(price); if (isRecent) totalRecent += 1; if (isPrior) totalPrior += 1;

      const key = event.product_key || item?.product_key || event.title_normalized || event.item_id || "unknown";
      const bucket = productBuckets.get(key) || { key, count: 0, recent: 0, prior: 0, claimCount: 0, priorityTotal: 0, representative: item,
        title: item?.title || prettyTitle(event.title_normalized || "Wish"), retailer: item?.retailer || event.retailer, category,
        brand: item?.brand || event.brand, price_cents: price ?? null, latestAt: created };
      bucket.count += 1; if (isRecent) bucket.recent += 1; if (isPrior) bucket.prior += 1; if (isClaimed) bucket.claimCount += 1;
      bucket.priorityTotal += item?.priority || 1;
      if (created >= bucket.latestAt) {
        bucket.latestAt = created; bucket.representative = item || bucket.representative; bucket.title = item?.title || bucket.title;
        bucket.retailer = item?.retailer || bucket.retailer; bucket.category = item?.category || bucket.category;
        bucket.brand = item?.brand || bucket.brand; bucket.price_cents = item?.price_cents ?? bucket.price_cents;
      }
      productBuckets.set(key, bucket);

      const rb: RetailerBucket = retailerBuckets.get(retailer) || { count: 0, recent: 0, prior: 0, claimed: 0, prices: [], categories: new Map(), products: new Map() };
      rb.count += 1; if (isRecent) rb.recent += 1; if (isPrior) rb.prior += 1; if (isClaimed) rb.claimed += 1; if (price != null) rb.prices.push(price);
      rb.categories.set(category, (rb.categories.get(category) || 0) + 1); rb.products.set(bucket.title, (rb.products.get(bucket.title) || 0) + 1); retailerBuckets.set(retailer, rb);

      if (event.geo_country && event.geo_region) {
        const regionKey = `${event.geo_country}|${event.geo_region_code || event.geo_region}`;
        const region = regionBuckets.get(regionKey) || { name: event.geo_region, code: event.geo_region_code || "", country: event.geo_country, count: 0, categories: new Map(), retailers: new Map() };
        region.count += 1; region.categories.set(category, (region.categories.get(category) || 0) + 1); region.retailers.set(retailer, (region.retailers.get(retailer) || 0) + 1); regionBuckets.set(regionKey, region);
      }
      if (event.geo_country && event.geo_region && event.geo_city) {
        const cityKey = `${event.geo_country}|${event.geo_region_code || event.geo_region}|${event.geo_city}`;
        const city = cityBuckets.get(cityKey) || { city: event.geo_city, region: event.geo_region, country: event.geo_country, count: 0, categories: new Map() };
        city.count += 1; city.categories.set(category, (city.categories.get(category) || 0) + 1); cityBuckets.set(cityKey, city);
      }
    }

    const total = events.length, buckets = [...productBuckets.values()];
    const maxCount = Math.max(1, ...buckets.map(product => product.count)), maxRecent = Math.max(1, ...buckets.map(product => product.recent));
    let products = buckets.map(product => {
      const averagePriority = product.count ? product.priorityTotal / product.count : 1;
      const wishShare = total ? (product.count / total) * 100 : 0, recentShare = totalRecent ? (product.recent / totalRecent) * 100 : 0, priorShare = totalPrior ? (product.prior / totalPrior) * 100 : 0;
      const wishVelocity = Math.min(100, Math.round(45 * (product.count / maxCount) + 30 * (product.recent / maxRecent) + 15 * (product.recent > 0 ? 1 : 0) + 10 * Math.max(0, Math.min(1, (averagePriority - 1) / 2))));
      const uncoveredCount = Math.max(0, product.count - product.claimCount);
      return { rank: 0, productKey: product.key, title: product.title, retailer: product.retailer, category: product.category, brand: product.brand,
        imageUrl: product.representative?.image_url || null, url: product.representative?.url || null, priceCents: product.price_cents,
        currency: product.representative?.currency || "USD", count: product.count, recent: product.recent, prior: product.prior,
        growthPercent: product.prior ? Math.round(((product.recent - product.prior) / product.prior) * 100) : null,
        newThisWeek: product.recent > 0 && product.prior === 0, wishVelocity, wishShare: Math.round(wishShare * 10) / 10,
        wishShareChange: Math.round((recentShare - priorShare) * 10) / 10, coveredPercent: product.count ? Math.round((product.claimCount / product.count) * 100) : 0,
        uncoveredCount, giftGapPercent: product.count ? Math.round((uncoveredCount / product.count) * 100) : 0, wantScore: Math.round(averagePriority * 10) / 10 };
    });
    const filterOptions = { categories: [...categoryCounts.keys()].sort(), retailers: [...retailerCounts.keys()].sort() };
    if (requestedCategory) products = products.filter(product => product.category === requestedCategory);
    if (requestedRetailer) products = products.filter(product => product.retailer === requestedRetailer);
    if (maxPriceCents != null) products = products.filter(product => product.priceCents != null && product.priceCents <= maxPriceCents);
    const sorters: Record<string, (a: typeof products[number], b: typeof products[number]) => number> = {
      rising: (a, b) => b.wishShareChange - a.wishShareChange || b.recent - a.recent,
      velocity: (a, b) => b.wishVelocity - a.wishVelocity || b.count - a.count,
      gap: (a, b) => b.uncoveredCount - a.uncoveredCount || b.count - a.count,
      covered: (a, b) => b.coveredPercent - a.coveredPercent || b.count - a.count,
      price: (a, b) => (a.priceCents ?? Number.MAX_SAFE_INTEGER) - (b.priceCents ?? Number.MAX_SAFE_INTEGER),
      top: (a, b) => b.count - a.count || b.wishVelocity - a.wishVelocity,
    };
    products.sort(sorters[requestedSort] || sorters.top); products = products.slice(0, 50).map((product, index) => ({ ...product, rank: index + 1 }));
    const rising = [...products].filter(product => product.recent >= 2 && product.recent > product.prior).sort(sorters.rising).slice(0, 8);
    const priceBands = [{ label: "Under $25", min: 0, max: 2499 }, { label: "$25–$49", min: 2500, max: 4999 }, { label: "$50–$99", min: 5000, max: 9999 }, { label: "$100–$249", min: 10000, max: 24999 }, { label: "$250+", min: 25000, max: Infinity }]
      .map(band => ({ label: band.label, count: prices.filter(price => price >= band.min && price <= band.max).length }))
      .map(band => ({ ...band, share: prices.length ? Math.round((band.count / prices.length) * 1000) / 10 : 0 }));
    const regions = [...regionBuckets.values()].filter(region => region.count >= REGION_MIN_WISHES).sort((a, b) => b.count - a.count).slice(0, 10)
      .map(region => ({ region: region.name, regionCode: region.code, country: region.country, count: region.count, topCategory: topEntry(region.categories)?.[0] || null, topRetailer: topEntry(region.retailers)?.[0] || null }));
    const cities = [...cityBuckets.values()].filter(city => city.count >= CITY_MIN_WISHES).sort((a, b) => b.count - a.count).slice(0, 8)
      .map(city => ({ city: city.city, region: city.region, country: city.country, count: city.count, topCategory: topEntry(city.categories)?.[0] || null }));
    const retailerInsights = [...retailerBuckets.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 25).map(([name, retailer]) => ({
      name, count: retailer.count, share: total ? Math.round((retailer.count / total) * 1000) / 10 : 0, medianPriceCents: median(retailer.prices),
      coveredPercent: retailer.count ? Math.round((retailer.claimed / retailer.count) * 100) : 0,
      wishShareChange: Math.round(((totalRecent ? retailer.recent / totalRecent : 0) - (totalPrior ? retailer.prior / totalPrior : 0)) * 1000) / 10,
      topCategory: topEntry(retailer.categories)?.[0] || null,
      topProducts: [...retailer.products.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([title, count]) => ({ title, count })),
    }));
    const topCategory = leaderboard(categoryCounts, total, 1)[0], topRetailer = leaderboard(retailerCounts, total, 1)[0];
    const topProduct = [...products].sort(sorters.top)[0], fastestRiser = [...products].sort(sorters.rising)[0], largestGap = [...products].sort(sorters.gap)[0];
    const newsroom = { label: "THIS WEEK IN WISHES",
      headline: fastestRiser?.wishShareChange > 0 ? `${fastestRiser.title} is gaining the most Wish Share` : topProduct ? `${topProduct.title} leads the Wish North Index` : "The next wish trend starts here",
      summary: topCategory && topRetailer ? `${topCategory.name} is the leading category, while ${topRetailer.name} captures the largest share of retailer demand in the current 30-day sample.` : "Wish North is building a real-time view of what people want from verified wish-list activity.",
      highlights: [topProduct ? `${topProduct.title} holds ${topProduct.wishShare}% Wish Share.` : null,
        fastestRiser?.wishShareChange > 0 ? `${fastestRiser.title} gained ${fastestRiser.wishShareChange} share points week over week.` : null,
        largestGap ? `${largestGap.title} has ${largestGap.uncoveredCount} currently uncovered ${largestGap.uncoveredCount === 1 ? "wish" : "wishes"}.` : null].filter(Boolean),
      generatedAt: new Date().toISOString() };
    const history = snapshotMode ? [] : snapshotResult.data || [];
    const response = { generatedAt: newsroom.generatedAt, windowDays: 30, totalWishes: wishCount.count || 0, totalLists: listCount.count || 0, sampleWishes: total,
      products, rising, categories: leaderboard(categoryCounts, total), retailers: leaderboard(retailerCounts, total), retailerInsights, priceBands,
      medianPriceCents: median(prices), averagePriceCents: prices.length ? Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length) : null,
      claimIntentPercent: total ? Math.round((claimedItems.size / total) * 100) : 0,
      giftGap: { uncoveredWishes: Math.max(0, total - claimedItems.size), coveredWishes: claimedItems.size, uncoveredPercent: total ? Math.round(((total - claimedItems.size) / total) * 100) : 0 },
      regions, cities, history, filterOptions, newsroom, appliedFilters: { category: requestedCategory || null, retailer: requestedRetailer || null, maxPrice: maxPriceCents, sort: requestedSort },
      geographyThresholds: { regionMinimum: REGION_MIN_WISHES, cityMinimum: CITY_MIN_WISHES }, methodology: {
        note: "The Wish North Index uses aggregated wishes added during the last 30 days. A covered wish means a gift-giver claimed an item; it is not a confirmed purchase. Geography is shown only after minimum sample thresholds are met.",
        velocity: "Wish Velocity is a 0–100 relative score combining 30-day demand, seven-day momentum, recency and stated priority. Scores are directional and become more meaningful as the sample grows.",
        wishShare: "Wish Share is a product's percentage of wishes in the current sample. Movement compares the latest seven days with the previous seven days in percentage points.",
        giftGap: "Gift Gap measures wishes that have not yet been marked covered. It describes open gifting intent, not inventory or guaranteed sales.",
      } };
    if (requestUrl.searchParams.get("format") === "csv") return new NextResponse(productCsv(products as unknown as Array<Record<string, unknown>>), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="wish-north-index-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store, max-age=0" } });
    const responseHeaders: Record<string, string> = snapshotMode
      ? { "Cache-Control": "no-store, max-age=0" }
      : {
          "Cache-Control": "public, max-age=0, must-revalidate",
          "Netlify-CDN-Cache-Control": "public, durable, max-age=300, stale-while-revalidate=3600",
        };
    return NextResponse.json(response, { headers: responseHeaders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ generatedAt: new Date().toISOString(), products: [], rising: [], categories: [], retailers: [], retailerInsights: [], priceBands: [], regions: [], cities: [], history: [], totalWishes: 0, totalLists: 0, sampleWishes: 0, medianPriceCents: null, averagePriceCents: null, claimIntentPercent: 0, giftGap: { uncoveredWishes: 0, coveredWishes: 0, uncoveredPercent: 0 }, filterOptions: { categories: [], retailers: [] } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
