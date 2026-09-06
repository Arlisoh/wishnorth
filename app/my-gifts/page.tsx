"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { accessToken } from "@/lib/client-auth";
import { syncLocalAccess } from "@/lib/client-sync";
import { money } from "@/lib/helpers";

type Claim = {
  id: string;
  created_at: string;
  item: { id: string; title: string; url: string | null; image_url: string | null; retailer: string | null; price_cents: number | null; currency: string; size?: string | null; color?: string | null; notes?: string | null };
  list: { id: string; subject_name: string; occasion: string; share_token: string };
};

export default function MyGiftsPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [localCount, setLocalCount] = useState(0);

  const load = useCallback(async () => {
    const token = await accessToken();
    if (!token) return;
    setLoading(true);
    try {
      await syncLocalAccess();
      const res = await fetch("/api/account", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load gifts");
      setClaims(data.claims || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load gifts"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setLocalCount(new Set([...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(key => key.startsWith("wishnorth_claim_"))).size);
    try {
      const supabase = supabaseBrowser();
      supabase.auth.getSession().then(({ data }) => {
        const yes = Boolean(data.session);
        setSignedIn(yes);
        if (yes) load();
      });
      const { data } = supabase.auth.onAuthStateChange((_e, session) => {
        const yes = Boolean(session);
        setSignedIn(yes);
        if (yes) setTimeout(load, 0);
      });
      return () => data.subscription.unsubscribe();
    } catch { setSignedIn(false); }
  }, [load]);

  async function release(claim: Claim) {
    if (!confirm(`Release “${claim.item.title}”? Someone else will be able to claim it.`)) return;
    const token = await accessToken();
    const res = await fetch(`/api/account/claims/${claim.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      localStorage.removeItem(`wishnorth_claim_${claim.item.id}`);
      await load();
    }
  }

  return <main><Header /><section className="form-shell shell-narrow"><div className="eyebrow">SHOPPER DASHBOARD</div><h1>My Gifts</h1><p className="form-intro">Everything you’ve claimed from other people’s lists, in one place. The recipients still won’t see your surprise.</p>
    {signedIn === null ? <div className="loading">Checking your account…</div> : !signedIn ? <div className="account-gate"><div className="share-icon">🎁</div><h2>{localCount ? `You have ${localCount} claimed ${localCount === 1 ? "gift" : "gifts"} on this device.` : "Keep every claimed gift in one place."}</h2><p>Create or sign in to a free account and Wish North will attach any claims already saved in this browser automatically.</p><Link href="/account?from=my-gifts" className="button button-primary button-big">Sign in or create account →</Link></div> : <>{error ? <div className="error-box">{error}</div> : null}{loading && !claims.length ? <div className="loading">Gathering your gifts…</div> : claims.length ? <div className="my-gifts-grid">{claims.map(claim => <article className="my-gift-card" key={claim.id}>{claim.item.image_url ? <img src={claim.item.image_url} alt="" /> : <div className="my-gift-placeholder">🎁</div>}<div className="my-gift-body"><div className="eyebrow">FOR {claim.list.subject_name.toUpperCase()} · {claim.list.occasion.toUpperCase()}</div><h2>{claim.item.title}</h2><p>{claim.item.retailer || "Wish"}{claim.item.price_cents != null ? ` · ${money(claim.item.price_cents, claim.item.currency)}` : ""}</p>{claim.item.size || claim.item.color ? <div className="chips">{claim.item.size ? <span>Size: {claim.item.size}</span> : null}{claim.item.color ? <span>{claim.item.color}</span> : null}</div> : null}<div className="my-gift-actions">{claim.item.url ? <a className="button button-dark" href={claim.item.url} target="_blank" rel="noreferrer">View / buy item ↗</a> : null}<a className="button button-ghost" href={`/share/${claim.list.share_token}`}>Back to {claim.list.subject_name}’s list</a><button className="plain-link danger-link" onClick={() => release(claim)}>Release claim</button></div></div></article>)}</div> : <div className="empty-list"><div>🎁</div><h2>No gifts claimed yet.</h2><p>When you claim something from a shared Wish North list, it will appear here automatically.</p></div>}</>}
  </section></main>;
}
