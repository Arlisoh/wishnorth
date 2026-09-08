"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/helpers";

type Product = {
  rank: number; title: string; retailer?: string | null; category?: string | null; brand?: string | null;
  imageUrl?: string | null; url?: string | null; priceCents?: number | null; currency?: string; count: number;
  wishVelocity: number; wishShare: number; wishShareChange: number; coveredPercent: number; uncoveredCount: number;
  giftGapPercent: number; recent: number; prior: number; growthPercent: number | null; newThisWeek: boolean; wantScore?: number;
};
type Leader = { name: string; count: number; share: number };
type PriceBand = { label: string; count: number; share: number };
type Region = { region: string; regionCode?: string; country: string; count: number; topCategory?: string | null; topRetailer?: string | null };
type City = { city: string; region: string; country: string; count: number; topCategory?: string | null };
type RetailerInsight = { name: string; count: number; share: number; medianPriceCents: number | null; coveredPercent: number; wishShareChange: number; topCategory: string | null; topProducts: Array<{ title: string; count: number }> };
type HistoryPoint = { snapshot_date: string; sample_wishes: number; total_wishes: number; total_lists: number; median_price_cents: number | null; claim_intent_percent: number };
type TrendResponse = {
  generatedAt?: string; windowDays?: number; products: Product[]; rising: Product[]; categories: Leader[]; retailers: Leader[];
  retailerInsights: RetailerInsight[]; priceBands: PriceBand[]; regions: Region[]; cities: City[]; history: HistoryPoint[];
  totalWishes: number; totalLists: number; sampleWishes: number; medianPriceCents: number | null; averagePriceCents: number | null;
  claimIntentPercent: number; giftGap: { uncoveredWishes: number; coveredWishes: number; uncoveredPercent: number };
  filterOptions: { categories: string[]; retailers: string[] };
  newsroom?: { label: string; headline: string; summary: string; highlights: string[]; generatedAt: string };
  methodology?: { note?: string; velocity?: string; wishShare?: string; giftGap?: string };
};
type SortMode = "top" | "velocity" | "rising" | "gap" | "covered" | "price";

const EMPTY: TrendResponse = { products: [], rising: [], categories: [], retailers: [], retailerInsights: [], priceBands: [], regions: [], cities: [], history: [], totalWishes: 0, totalLists: 0, sampleWishes: 0, medianPriceCents: null, averagePriceCents: null, claimIntentPercent: 0, giftGap: { uncoveredWishes: 0, coveredWishes: 0, uncoveredPercent: 0 }, filterOptions: { categories: [], retailers: [] } };

export default function TrendPanel({ full = false }: { full?: boolean }) {
  const [data, setData] = useState<TrendResponse>(EMPTY), [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState(""), [retailer, setRetailer] = useState(""), [price, setPrice] = useState("all");
  const [sort, setSort] = useState<SortMode>("top"), [retailerView, setRetailerView] = useState("");
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/trends");
      if (!res.ok) throw new Error("Could not load Wish Index");
      setData({ ...EMPTY, ...(await res.json()) });
    } catch { /* Keep the last good result. */ } finally { setLoaded(true); }
  }, []);
  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 300000); window.addEventListener("focus", refresh); return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); }; }, [refresh]);
  useEffect(() => { if (!retailerView && data.retailerInsights[0]) setRetailerView(data.retailerInsights[0].name); }, [data.retailerInsights, retailerView]);

  const products = useMemo(() => {
    const filtered = data.products.filter(product => {
      if (category && product.category !== category) return false;
      if (retailer && product.retailer !== retailer) return false;
      if (price === "under50" && (product.priceCents == null || product.priceCents >= 5000)) return false;
      if (price === "under100" && (product.priceCents == null || product.priceCents >= 10000)) return false;
      if (price === "100plus" && (product.priceCents == null || product.priceCents < 10000)) return false;
      return true;
    });
    const sorter: Record<SortMode, (a: Product, b: Product) => number> = {
      top: (a, b) => b.count - a.count || b.wishVelocity - a.wishVelocity,
      velocity: (a, b) => b.wishVelocity - a.wishVelocity,
      rising: (a, b) => b.wishShareChange - a.wishShareChange || b.recent - a.recent,
      gap: (a, b) => b.uncoveredCount - a.uncoveredCount || b.count - a.count,
      covered: (a, b) => b.coveredPercent - a.coveredPercent,
      price: (a, b) => (a.priceCents ?? Number.MAX_SAFE_INTEGER) - (b.priceCents ?? Number.MAX_SAFE_INTEGER),
    };
    return [...filtered].sort(sorter[sort]).map((product, index) => ({ ...product, rank: index + 1 }));
  }, [data.products, category, retailer, price, sort]);
  const selectedRetailer = data.retailerInsights.find(row => row.name === retailerView) || data.retailerInsights[0];
  const exportParams = new URLSearchParams();
  if (category) exportParams.set("category", category); if (retailer) exportParams.set("retailer", retailer); exportParams.set("sort", sort);
  if (price === "under50") exportParams.set("maxPrice", "49.99"); if (price === "under100") exportParams.set("maxPrice", "99.99"); exportParams.set("format", "csv");

  if (!loaded) return <div className="empty-trends"><span>✦</span><strong>Loading the live Wish Index…</strong></div>;
  if (!data.products.length) return <div className="empty-trends"><span>✦</span><strong>The Wish Index starts with real wishes.</strong><p>No fake popularity numbers. Products, categories, retailers and regional patterns appear only as people actually build lists.</p></div>;
  const topProducts = products.slice(0, full ? 18 : 6), topVelocity = Math.max(...data.products.map(product => product.wishVelocity));
  const updated = data.generatedAt ? new Date(data.generatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "live";

  return <div className={`wish-index ${full ? "wish-index-full" : ""}`}>
    <div className="wish-index-kpis">
      <Kpi icon="✦" tone="green" value={data.totalWishes.toLocaleString()} label="Total wishes" />
      <Kpi icon="☰" tone="red" value={data.totalLists.toLocaleString()} label="Wish lists" />
      <Kpi icon="↗" tone="gold" value={`${topVelocity}`} label="Top Wish Velocity" hint="Relative score out of 100" />
      <Kpi icon="○" tone="blue" value={`${data.giftGap.uncoveredPercent}%`} label="Gift Gap" hint={`${data.giftGap.uncoveredWishes} wishes not yet covered`} />
      {full ? <><Kpi icon="$" tone="green" value={data.medianPriceCents != null ? money(data.medianPriceCents) || "Not available" : "Not available"} label="Median wish price" /><Kpi icon="✓" tone="red" value={`${data.claimIntentPercent}%`} label="Marked covered" hint="Gift-giver intent, not confirmed sales" /></> : null}
    </div>

    <IndexVisuals data={data} />

    {full && data.newsroom ? <Newsroom newsroom={data.newsroom} /> : null}
    {full ? <section className="index-filter-panel">
      <div><div className="eyebrow">EXPLORE THE DATA</div><h3>Find the signal that matters to you</h3></div>
      <div className="index-filters">
        <label><span>Category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{data.filterOptions.categories.map(value => <option key={value}>{value}</option>)}</select></label>
        <label><span>Retailer</span><select value={retailer} onChange={event => setRetailer(event.target.value)}><option value="">All retailers</option>{data.filterOptions.retailers.map(value => <option key={value}>{value}</option>)}</select></label>
        <label><span>Price</span><select value={price} onChange={event => setPrice(event.target.value)}><option value="all">Any price</option><option value="under50">Under $50</option><option value="under100">Under $100</option><option value="100plus">$100 and up</option></select></label>
        <label><span>Rank by</span><select value={sort} onChange={event => setSort(event.target.value as SortMode)}><option value="top">Top wishes</option><option value="velocity">Wish Velocity</option><option value="rising">Rising Wish Share</option><option value="gap">Gift Gap</option><option value="covered">Most covered</option><option value="price">Lowest price</option></select></label>
      </div>
      <div className="index-filter-actions"><span>{products.length} matching {products.length === 1 ? "product" : "products"}</span><button type="button" className="text-link" onClick={() => { setCategory(""); setRetailer(""); setPrice("all"); setSort("top"); }}>Reset filters</button><a className="button button-dark" href={`/api/trends?${exportParams.toString()}`} download>Download CSV</a></div>
    </section> : null}

    <div className="index-section-head"><div><div className="eyebrow">TOP PRODUCTS · LAST 30 DAYS</div><h3>What people want right now</h3></div><span className="index-live">● Updated {updated}</span></div>
    {topProducts.length ? <div className="index-product-grid">{topProducts.map(product => <ProductCard key={`${product.rank}-${product.title}`} product={product} />)}</div> : <div className="index-empty-inline">No products match those filters yet.</div>}

    <div className="index-dual"><Leaderboard title="Top categories" eyebrow="WHERE WISHES ARE GOING" rows={data.categories.slice(0, full ? 8 : 5)} /><Leaderboard title="Top retailers" eyebrow="WHERE DEMAND LANDS" rows={data.retailers.slice(0, full ? 8 : 5)} /></div>
    {full ? <>
      <section className="index-block"><div className="index-section-head"><div><div className="eyebrow">MOMENTUM</div><h3>Fastest-rising wishes</h3></div><p>Latest 7 days vs. the previous 7.</p></div>
        {data.rising.length ? <div className="rising-grid">{data.rising.map(item => <div className="rising-card" key={item.title}>{item.imageUrl ? <img src={productImage(item.imageUrl)} alt={item.title} /> : <div className="index-thumb-placeholder">🎁</div>}<div><span>{item.category || "Other"}</span><strong>{item.title}</strong><small>{item.retailer || "Retailer"}</small><b>{item.newThisWeek ? "NEW THIS WEEK" : `${item.wishShareChange > 0 ? "↑" : "↓"} ${Math.abs(item.wishShareChange)} share points`}</b></div></div>)}</div> : <div className="index-empty-inline">More repeat wishes are needed before momentum rankings become statistically meaningful.</div>}
      </section>

      <RetailerView rows={data.retailerInsights} selected={selectedRetailer} value={retailerView} onChange={setRetailerView} />
      <HistoryPanel history={data.history} />
      <div className="index-dual"><Leaderboard title="Price mix" eyebrow="WHAT PEOPLE EXPECT TO SPEND" rows={data.priceBands.filter(row => row.count > 0).map(row => ({ ...row, name: row.label }))} /><section className="index-panel"><div className="eyebrow">REGIONAL PULSE</div><h3>What different areas want</h3>{data.regions.length ? <div className="region-list">{data.regions.map(region => <div key={`${region.country}-${region.region}`}><strong>{region.region}</strong><span>{region.count} wishes · #{region.topCategory || "Mixed"}</span><small>Top retailer: {region.topRetailer || "Mixed"}</small></div>)}</div> : <p className="index-muted">Regional results appear only after a market reaches the privacy threshold. No individual locations are published.</p>}</section></div>
      {data.cities.length ? <section className="index-block"><div className="eyebrow">METRO WATCH</div><h3>Markets with enough activity to report</h3><div className="metro-grid">{data.cities.map(city => <div key={`${city.city}-${city.region}`}><strong>{city.city}</strong><span>{city.region}</span><b>{city.topCategory || "Mixed"}</b><small>{city.count} wishes in the 30-day sample</small></div>)}</div></section> : null}
      <section className="index-methodology"><div><div className="eyebrow">ABOUT THE INDEX</div><h3>Real wish behavior, aggregated for privacy.</h3></div><div className="methodology-copy"><p>{data.methodology?.note}</p><p><strong>Wish Velocity:</strong> {data.methodology?.velocity}</p><p><strong>Wish Share:</strong> {data.methodology?.wishShare}</p><p><strong>Gift Gap:</strong> {data.methodology?.giftGap}</p><p><strong>Current 30-day sample:</strong> {data.sampleWishes.toLocaleString()} wishes.</p></div></section>
    </> : <div className="index-more"><Link href="/wish-index" className="button button-dark">Explore the full Wish North Index →</Link><span>Wish Velocity, Wish Share, Gift Gap, retailers, regions and weekly stories.</span></div>}
  </div>;
}

function Newsroom({ newsroom }: { newsroom: NonNullable<TrendResponse["newsroom"]> }) {
  return <section className="index-newsroom"><div className="newsroom-kicker">● WISH NORTH NEWSROOM</div><div><div className="eyebrow">{newsroom.label}</div><h2>{newsroom.headline}</h2><p>{newsroom.summary}</p>{newsroom.highlights.length ? <ul>{newsroom.highlights.map(item => <li key={item}>{item}</li>)}</ul> : null}</div><div className="newsroom-actions"><button type="button" className="button button-ghost" onClick={() => window.print()}>Print press view</button><a className="button button-dark" href="/api/trends?format=csv" download>Download data</a></div></section>;
}
function RetailerView({ rows, selected, value, onChange }: { rows: RetailerInsight[]; selected?: RetailerInsight; value: string; onChange: (value: string) => void }) {
  return <section className="index-block retailer-intelligence"><div className="index-section-head"><div><div className="eyebrow">RETAILER INTELLIGENCE</div><h3>Competitive demand view</h3></div><label><span>Retailer</span><select value={value} onChange={event => onChange(event.target.value)}>{rows.map(row => <option key={row.name}>{row.name}</option>)}</select></label></div>
    {selected ? <><div className="retailer-kpis"><Kpi value={`${selected.share}%`} label="Wish Share" /><Kpi value={`${selected.wishShareChange > 0 ? "+" : ""}${selected.wishShareChange} pts`} label="Share movement" /><Kpi value={selected.medianPriceCents != null ? money(selected.medianPriceCents) || "Not available" : "Not available"} label="Median wish" /><Kpi value={`${selected.coveredPercent}%`} label="Covered intent" /></div><div className="retailer-products"><strong>Leading category: {selected.topCategory || "Mixed"}</strong>{selected.topProducts.map((product, index) => <div key={product.title}><span>#{index + 1}</span><b>{product.title}</b><small>{product.count} {product.count === 1 ? "wish" : "wishes"}</small></div>)}</div></> : <p className="index-muted">Retailer intelligence appears as wish activity grows.</p>}
  </section>;
}
function HistoryPanel({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) return <section className="index-block"><div className="eyebrow">INDEX HISTORY</div><h3>Daily tracking is now active</h3><p className="index-muted">Wish North now stores one privacy-safe snapshot each day. Trend lines and year-over-year comparisons will appear automatically after enough history is collected.</p></section>;
  const recent = history.slice(-14), max = Math.max(1, ...recent.map(point => point.sample_wishes));
  return <section className="index-block"><div className="index-section-head"><div><div className="eyebrow">INDEX HISTORY</div><h3>Daily wish activity</h3></div><p>{history.length} daily snapshots retained</p></div><div className="history-bars">{recent.map(point => <div key={point.snapshot_date} title={`${point.snapshot_date}: ${point.sample_wishes} wishes`}><i style={{ height: `${Math.max(8, (point.sample_wishes / max) * 100)}%` }} /><span>{new Date(`${point.snapshot_date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>)}</div></section>;
}
function ProductCard({ product }: { product: Product }) {
  return <article className="index-product-card"><div className="index-product-image">{product.imageUrl ? <img src={productImage(product.imageUrl)} alt={product.title} loading="lazy" /> : <div className="index-thumb-placeholder">🎁</div>}<span className="index-rank">#{product.rank}</span></div><div className="index-product-copy"><span className="index-category">{product.category || "Other"}</span><h4>{product.title}</h4><div className="index-retailer">{product.retailer || "Retailer not listed"}</div><div className="index-score-row"><span><b>{product.wishVelocity}</b> Velocity</span><span><b>{product.wishShare}%</b> Share</span><span className={product.wishShareChange > 0 ? "positive" : product.wishShareChange < 0 ? "negative" : ""}><b>{product.wishShareChange > 0 ? "+" : ""}{product.wishShareChange}</b> pts</span></div><div className="index-product-meta"><strong>{product.count} {product.count === 1 ? "wish" : "wishes"}</strong>{product.priceCents != null ? <span>{money(product.priceCents, product.currency || "USD")}</span> : null}<span>{product.uncoveredCount} open</span></div>{product.url ? <a href={product.url} target="_blank" rel="noopener noreferrer">View product ↗</a> : null}</div></article>;
}
function Leaderboard({ title, eyebrow, rows }: { title: string; eyebrow: string; rows: Leader[] }) {
  return <section className="index-panel"><div className="eyebrow">{eyebrow}</div><h3>{title}</h3>{rows.length ? <div className="index-bars">{rows.map((row, index) => <div className="index-bar-row" key={row.name}><span className="bar-rank">{index + 1}</span><div><strong>{row.name}</strong><span><i style={{ width: `${Math.max(4, row.share)}%` }} /></span></div><b>{row.share}%</b></div>)}</div> : <p className="index-muted">Waiting for enough real wish activity.</p>}</section>;
}
function IndexVisuals({ data }: { data: TrendResponse }) {
  const topVelocity = Math.max(0, ...data.products.map(product => product.wishVelocity));
  const maxBand = Math.max(1, ...data.priceBands.map(row => row.count));
  const retailers = data.retailers.slice(0, 4);
  const palette = ["#c8463f", "#d9a84a", "#2d6a57", "#6f88a6"];
  let cursor = 0;
  const segments = retailers.map((row, index) => { const start = cursor; cursor += row.share; return `${palette[index]} ${start}% ${cursor}%`; });
  const donut = segments.length ? `conic-gradient(${segments.join(",")})` : "#e4e7ec";
  return <section className="index-visual-grid">
    <article className="index-visual-card velocity-visual"><div><div className="eyebrow">WISH VELOCITY</div><h3>Demand at a glance</h3><p>Volume, momentum, recency and stated priority, combined.</p></div><div className="velocity-dial" style={{ "--score": `${topVelocity * 3.6}deg` } as React.CSSProperties}><div><strong>{topVelocity}</strong><span>out of 100</span></div></div></article>
    <article className="index-visual-card"><div className="eyebrow">PRICE LANDSCAPE</div><h3>Where wishes fall</h3><div className="price-columns">{data.priceBands.map(row => <div key={row.label}><b style={{ height: `${Math.max(8, (row.count / maxBand) * 100)}%` }}><i>{row.share}%</i></b><span>{row.label.replace("$", "$\u200b")}</span></div>)}</div></article>
    <article className="index-visual-card retailer-share-visual"><div><div className="eyebrow">RETAILER SHARE</div><h3>Where demand lands</h3><div className="donut-legend">{retailers.map((row, index) => <div key={row.name}><i style={{ background: palette[index] }} /><span>{row.name}</span><b>{row.share}%</b></div>)}</div></div><div className="share-donut" style={{ background: donut }}><div><strong>{data.sampleWishes}</strong><span>wishes</span></div></div></article>
  </section>;
}
function productImage(url: string) {
  const secure = url.replace(/^http:\/\//i, "https://");
  return `/.netlify/images?url=${encodeURIComponent(secure)}&w=720&h=720&fit=cover&q=84`;
}
function Kpi({ value, label, hint, icon, tone = "green" }: { value: string; label: string; hint?: string; icon?: string; tone?: string }) { return <div className={`index-kpi tone-${tone}`}><i>{icon}</i><div><strong>{value}</strong><span>{label}</span>{hint ? <small>{hint}</small> : null}</div></div>; }
