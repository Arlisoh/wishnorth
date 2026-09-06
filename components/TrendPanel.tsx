"use client";

import { useCallback, useEffect, useState } from "react";

type Trend = { title: string; count: number };
type Latest = Trend & { retailer?: string | null };
type TrendResponse = { trends: Trend[]; latest: Latest[]; totalWishes: number; totalLists: number };

export default function TrendPanel() {
  const [data, setData] = useState<TrendResponse>({ trends: [], latest: [], totalWishes: 0, totalLists: 0 });
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/trends?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load Wish Index");
      const next = await res.json();
      setData({
        trends: next.trends || [],
        latest: next.latest || [],
        totalWishes: next.totalWishes || 0,
        totalLists: next.totalLists || 0,
      });
    } catch {
      // Keep the last good result if a refresh fails.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  if (!loaded) return <div className="empty-trends"><span>✦</span><strong>Loading the live Wish Index…</strong></div>;

  if (!data.latest.length) {
    return <div className="empty-trends"><span>✦</span><strong>The Wish Index starts with the first real wish.</strong><p>No fake popularity numbers. As soon as someone adds a wish, it appears here.</p></div>;
  }

  const rows = data.trends.length ? data.trends : data.latest;

  return <>
    <div className="wish-stats">
      <div><strong>{data.totalWishes}</strong><span>Total wishes</span></div>
      <div><strong>{data.totalLists}</strong><span>Wish lists</span></div>
      <div><strong>{data.trends.length}</strong><span>Trending now</span></div>
    </div>
    <div className="trend-mode-label">{data.trends.length ? "TRENDING WISHES" : "LATEST REAL WISHES"}</div>
    <div className="trend-list">{rows.map((t, i) => <div className="trend-row" key={`${t.title}-${i}`}><span className="rank">{String(i + 1).padStart(2, "0")}</span><strong>{t.title}</strong><span>{t.count} {t.count === 1 ? "wish" : "wishes"}</span></div>)}</div>
    {!data.trends.length ? <p className="trend-helper">When the same products begin appearing on multiple lists, this automatically changes from “latest” to true trending rankings.</p> : null}
  </>;
}
