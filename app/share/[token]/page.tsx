"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Logo from "@/components/Logo";
import ItemCard from "@/components/ItemCard";
import type { WishItem, WishList } from "@/lib/types";

export default function SharedList({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [list, setList] = useState<WishList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claimItem, setClaimItem] = useState<WishItem | null>(null);
  async function load() {
    const res = await fetch(`/api/share/${token}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not open list");
    setList(data.list);
  }
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, [token]);
  return <main className="shared-page"><header className="shared-header shell"><Logo /><div className="shared-note">Private shared list</div></header><section className="shared-hero shell-narrow">{loading ? <div className="loading">Unwrapping the list…</div> : error ? <div className="error-box">{error}</div> : list ? <><div className="shared-title"><div className="eyebrow">{list.occasion.toUpperCase()}</div><h1>{list.subject_name} has a few ideas. 🎁</h1><p>Pick something you love. Claiming a gift tells everyone else it is covered without spoiling the surprise for {list.subject_name}.</p></div><div className="gift-grid">{list.items.map(item => <ItemCard key={item.id} item={item} publicView onClaim={setClaimItem} />)}</div>{!list.items.length ? <div className="empty-list"><div>✨</div><h2>Nothing here yet.</h2><p>{list.subject_name} is still thinking.</p></div> : null}{claimItem ? <ClaimModal token={token} item={claimItem} onClose={() => setClaimItem(null)} onClaimed={async () => { await load(); setClaimItem(null); }} /> : null}</> : null}</section><div className="shared-footer">Wish anything. From anywhere. <a href="/new">Make your own Wish North list →</a></div></main>;
}

function ClaimModal({ token, item, onClose, onClaimed }: { token: string; item: WishItem; onClose: () => void; onClaimed: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function claim(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const res = await fetch(`/api/share/${token}/claim`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemId: item.id, name }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Could not claim gift"); setLoading(false); return; }
    if (data.claimCode) sessionStorage.setItem(`wishnorth_claim_${item.id}`, data.claimCode);
    onClaimed();
  }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal modal-small"><button className="modal-x" onClick={onClose}>×</button><div className="share-icon">🎁</div><h2>You’ve got this one?</h2><p><strong>{item.title}</strong> will be marked as taken for everyone else. The list owner won’t be shown your name.</p><form onSubmit={claim} className="compact-form"><label><span>Your first name</span><input required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Grandma" autoFocus /></label>{error ? <div className="error-box">{error}</div> : null}<button className="button button-primary button-big full" disabled={loading}>{loading ? "Claiming…" : "Yes, I’m getting this →"}</button></form><p className="helper centered">No account required.</p></div></div>;
}
