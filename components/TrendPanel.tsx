"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/helpers";

type Product = {
  rank: number;
  title: string;
  retailer?: string | null;
  category?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  url?: string | null;
  priceCents?: number | null;
  currency?: string;
  count: number;
  claimIntent?: number;
  wantScore?: number;
};
type Leader = { name: string; count: number; share: number };
type Rising = { title: string; retailer?: string | null; category?: string | null; imageUrl?: string | null; recent: number; prior: number; growthPercent: number | null; newThisWeek: boolean };
type Region = { region: string; regionCode?: string; country: string; count: number; topCategory?: string | null; topRetailer?: string | null };
type City = { city: string; region: string; country: string; count: number; topCategory?: string | null };
type TrendResponse = {
  generatedAt?: string;
  windowDays?: number;
  products: Product[];
  rising: Rising[];
  categories: Leader[];
  retailers: Leader[];
  priceBands: Leader[];
  regions: Region[];
  cities: City[];
  totalWishes: number;
  totalLists: number;
  sampleWishes: number;
  medianPriceCents: number | null;
  averagePriceCents: number | null;
  claimIntentPercent: number;
  methodology?: { note?: string };
};

const EMPTY: TrendResponse = { products: [], rising: [], categories: [], retailers: [], priceBands: [], regions: [], cities: [], totalWishes: 0, totalLists: 0, sampleWishes: 0, medianPriceCents: null, averagePriceCents: null, claimIntentPercent: 0 };

export default function TrendPanel({ full = false }: { full?: boolean }) {
  const [data, setData] = useState<TrendResponse>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/trends?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load Wish Index");
      setData({ ...EMPTY, ...(await res.json()) });
    } catch {
      // Keep the last good result if a refresh fails.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [refresh]);

  if (!loaded) return <div className="empty-trends"><span>✦</span><strong>Loading the live Wish Index…</strong></div>;

  if (!data.products.length) {
    return <div className="empty-trends"><span>✦</span><strong>The Wish Index starts with real wishes.</strong><p>No fake popularity numbers. Products, categories, retailers and regional patterns appear only as people actually build lists.</p></div>;
  }

  const topProducts = data.products.slice(0, full ? 12 : 6);
  const updated = data.generatedAt ? new Date(data.generatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "live";

  return <div className={`wish-index ${full ? "wish-index-full" : ""}`}>
    <div className="wish-index-kpis">
      <Kpi value={data.totalWishes.toLocaleString()} label="Total wishes" />
      <Kpi value={data.totalLists.toLocaleString()} label="Wish lists" />
      <Kpi value={data.medianPriceCents != null ? money(data.medianPriceCents) || "—" : "—"} label="Median wish price" />
      <Kpi value={`${data.claimIntentPercent}%`} label="Marked covered" hint="Gift-giver intent, not confirmed sales" />
    </div>

    <div className="index-section-head"><div><div className="eyebrow">TOP PRODUCTS · LAST 30 DAYS</div><h3>What people want right now</h3></div><span className="index-live">● Updated {updated}</span></div>
    <div className="index-product-grid">{topProducts.map(product => <ProductCard key={`${product.rank}-${product.title}`} product={product} />)}</div>

    <div className="index-dual">
      <Leaderboard title="Top categories" eyebrow="WHERE WISHES ARE GOING" rows={data.categories.slice(0, full ? 8 : 5)} />
      <Leaderboard title="Top retailers" eyebrow="WHERE DEMAND LANDS" rows={data.retailers.slice(0, full ? 8 : 5)} />
    </div>

    {full ? <>
      <section className="index-block">
        <div className="index-section-head"><div><div className="eyebrow">MOMENTUM</div><h3>Fastest-rising wishes</h3></div><p>Last 7 days vs. the previous 7.</p></div>
        {data.rising.length ? <div className="rising-grid">{data.rising.map(item => <div className="rising-card" key={item.title}>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <div className="index-thumb-placeholder">🎁</div>}<div><span>{item.category || "Other"}</span><strong>{item.title}</strong><small>{item.retailer || "Retailer"}</small><b>{item.newThisWeek ? "NEW THIS WEEK" : `↑ ${item.growthPercent}%`}</b></div></div>)}</div> : <div className="index-empty-inline">More repeat wishes are needed before momentum rankings become statistically meaningful.</div>}
      </section>

      <div className="index-dual">
        <Leaderboard title="Price mix" eyebrow="WHAT PEOPLE EXPECT TO SPEND" rows={data.priceBands.filter(r => r.count > 0)} />
        <section className="index-panel"><div className="eyebrow">REGIONAL PULSE</div><h3>What different areas want</h3>{data.regions.length ? <div className="region-list">{data.regions.map(r => <div key={`${r.country}-${r.region}`}><strong>{r.region}</strong><span>{r.count} wishes · #{r.topCategory || "Mixed"}</span><small>Top retailer: {r.topRetailer || "Mixed"}</small></div>)}</div> : <p className="index-muted">Regional results appear only after a market reaches the privacy threshold. No individual locations are published.</p>}</section>
      </div>

      {data.cities.length ? <section className="index-block"><div className="eyebrow">METRO WATCH</div><h3>Markets with enough activity to report</h3><div className="metro-grid">{data.cities.map(c => <div key={`${c.city}-${c.region}`}><strong>{c.city}</strong><span>{c.region}</span><b>{c.topCategory || "Mixed"}</b><small>{c.count} wishes in the 30-day sample</small></div>)}</div></section> : null}

      <section className="index-methodology"><div><div className="eyebrow">ABOUT THE INDEX</div><h3>Real wish behavior, aggregated for privacy.</h3></div><p>{data.methodology?.note || "Wish North reports aggregated activity from real wish lists."}</p><p><strong>Current 30-day sample:</strong> {data.sampleWishes.toLocaleString()} wishes. Regional rankings are suppressed until minimum sample thresholds are reached.</p></section>
    </> : <div className="index-more"><Link href="/wish-index" className="button button-dark">Explore the full Wish North Index →</Link><span>Categories, retailers, rising products, price bands and regional trends.</span></div>}
  </div>;
}

function ProductCard({ product }: { product: Product }) {
  return <article className="index-product-card">
    <div className="index-product-image">{product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" /> : <div className="index-thumb-placeholder">🎁</div>}<span className="index-rank">#{product.rank}</span></div>
    <div className="index-product-copy"><span className="index-category">{product.category || "Other"}</span><h4>{product.title}</h4><div className="index-retailer">{product.retailer || "Retailer not listed"}</div><div className="index-product-meta"><strong>{product.count} {product.count === 1 ? "wish" : "wishes"}</strong>{product.priceCents != null ? <span>{money(product.priceCents, product.currency || "USD")}</span> : null}{product.claimIntent != null ? <span>{product.claimIntent}% covered</span> : null}</div>{product.url ? <a href={product.url} target="_blank" rel="noopener noreferrer">View product ↗</a> : null}</div>
  </article>;
}

function Leaderboard({ title, eyebrow, rows }: { title: string; eyebrow: string; rows: Leader[] }) {
  return <section className="index-panel"><div className="eyebrow">{eyebrow}</div><h3>{title}</h3>{rows.length ? <div className="index-bars">{rows.map((row, i) => <div className="index-bar-row" key={row.name}><span className="bar-rank">{i + 1}</span><div><strong>{row.name}</strong><span><i style={{ width: `${Math.max(4, row.share)}%` }} /></span></div><b>{row.share}%</b></div>)}</div> : <p className="index-muted">Waiting for enough real wish activity.</p>}</section>;
}

function Kpi({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return <div className="index-kpi"><strong>{value}</strong><span>{label}</span>{hint ? <small>{hint}</small> : null}</div>;
}
