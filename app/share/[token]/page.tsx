"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import ItemCard from "@/components/ItemCard";
import type { WishItem, WishList } from "@/lib/types";
import { authHeaders } from "@/lib/client-auth";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function SharedList({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [list, setList] = useState<WishList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claimItem, setClaimItem] = useState<WishItem | null>(null);
  async function load() {
    const res = await fetch(`/api/share/${token}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not open list");
    setList(data.list);
  }
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, [token]);
  return <main className="shared-page"><header className="shared-header shell"><Logo /><div className="shared-header-actions"><Link href="/my-gifts" className="shared-note">My Gifts</Link><Link href="/account" className="button button-ghost button-small">Account</Link></div></header><section className="shared-hero shell-narrow">{loading ? <div className="loading">Unwrapping the list…</div> : error ? <div className="error-box">{error}</div> : list ? <><div className="shared-title"><div className="eyebrow">{list.occasion.toUpperCase()}</div><h1>{list.subject_name} has a few ideas. 🎁</h1><p>Pick something you love. Claiming a gift tells everyone else it is covered without spoiling the surprise for {list.subject_name}.</p></div><div className="gift-grid">{list.items.map(item => <ItemCard key={item.id} item={item} publicView onClaim={setClaimItem} />)}</div>{!list.items.length ? <div className="empty-list"><div>✨</div><h2>Nothing here yet.</h2><p>{list.subject_name} is still thinking.</p></div> : null}{claimItem ? <ClaimModal token={token} item={claimItem} onClose={() => setClaimItem(null)} onClaimed={load} /> : null}</> : null}</section><div className="shared-footer">Wish anything. From anywhere. <a href="/new">Make your own Wish North list →</a></div></main>;
}

function ClaimModal({ token, item, onClose, onClaimed }: { token: string; item: WishItem; onClose: () => void; onClaimed: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const supabase = supabaseBrowser();
      supabase.auth.getSession().then(({ data }) => {
        setSignedIn(Boolean(data.session));
        const first = String(data.session?.user?.user_metadata?.first_name || "");
        if (first) setName(first);
      });
    } catch {}
  }, []);

  async function claim(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const headers = await authHeaders({ "content-type": "application/json" });
      const res = await fetch(`/api/share/${token}/claim`, { method: "POST", headers, body: JSON.stringify({ itemId: item.id, name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not claim gift");
      if (data.claimCode) localStorage.setItem(`wishnorth_claim_${item.id}`, data.claimCode);
      setSignedIn(Boolean(data.savedToAccount));
      setSuccess(true);
      await onClaimed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not claim gift");
    } finally {
      setLoading(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal modal-small"><button className="modal-x" onClick={onClose}>×</button>{success ? <ClaimSuccess item={item} signedIn={signedIn} onClose={onClose} /> : <><div className="share-icon">🎁</div><h2>You’ve got this one?</h2><p><strong>{item.title}</strong> will be marked as taken for everyone else. The list owner won’t be shown your name.</p><form onSubmit={claim} className="compact-form"><label><span>Your first name</span><input required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Grandma" autoFocus /></label>{error ? <div className="error-box">{error}</div> : null}<button className="button button-primary button-big full" disabled={loading}>{loading ? "Claiming…" : "Yes, I’m getting this →"}</button></form><p className="helper centered">Claim first. An account is optional, and we’ll offer one afterward so you can remember everything you’re buying.</p></>}</div></div>;
}

function ClaimSuccess({ item, signedIn, onClose }: { item: WishItem; signedIn: boolean; onClose: () => void }) {
  return <div className="claim-success"><div className="success-check">✓</div><h2>It’s yours to give.</h2><p><strong>{item.title}</strong> is now marked as taken for everyone else.</p>{signedIn ? <><div className="success-box">Saved automatically to your Wish North account.</div><Link href="/my-gifts" className="button button-primary button-big full">Open My Gifts →</Link><button className="plain-link" onClick={onClose}>Keep browsing this list</button></> : <><div className="account-offer"><strong>Want to remember what you claimed?</strong><span>Create a free Wish North account. This gift will automatically move into <b>My Gifts</b>, along with anything else you claim.</span></div><Link href="/account?from=claim" className="button button-primary button-big full">Create free account & save this gift →</Link><button className="plain-link" onClick={onClose}>Not now</button></>}</div>;
}
