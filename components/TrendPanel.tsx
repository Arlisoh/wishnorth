"use client";

import { useEffect, useState } from "react";

type Trend = { title: string; count: number };

export default function TrendPanel() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/trends")
      .then(r => r.ok ? r.json() : { trends: [] })
      .then(data => setTrends(data.trends || []))
      .catch(() => setTrends([]))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !trends.length) {
    return <div className="empty-trends"><span>✦</span><strong>The Wish Index starts with the first real wishes.</strong><p>No fake popularity numbers. Once people begin using Wish North, trends will appear here automatically.</p></div>;
  }

  return <div className="trend-list">{trends.map((t, i) => <div className="trend-row" key={t.title}><span className="rank">{String(i + 1).padStart(2, "0")}</span><strong>{t.title}</strong><span>{t.count} wishes</span></div>)}</div>;
}
