"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders } from "@/lib/client-auth";
import { supabaseBrowser } from "@/lib/supabase-browser";
import Header from "@/components/Header";
import ItemCard from "@/components/ItemCard";
import type { WishList } from "@/lib/types";

export default function OwnerList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [list, setList] = useState<WishList | null>(null);
  const [ownerKey, setOwnerKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  async function load(key: string) {
    const headers = await authHeaders(key ? { "x-owner-key": key } : {});
    const res = await fetch(`/api/lists/${id}`, { headers, cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load list");
    setList(data.list);
  }

  useEffect(() => {
    const key = localStorage.getItem(`wishnorth_owner_${id}`) || "";
    setOwnerKey(key);
    try {
      const supabase = supabaseBrowser();
      supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
      const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
      load(key).catch(e => setError(e.message)).finally(() => setLoading(false));
      return () => data.subscription.unsubscribe();
    } catch {
      load(key).catch(e => setError(e.message)).finally(() => setLoading(false));
    }
  }, [id]);

  async function deleteItem(itemId: string, title: string) {
    if (!confirm(`Delete “${title}” from this list?`)) return;
    setError("");
    try {
      const headers = await authHeaders(ownerKey ? { "x-owner-key": ownerKey } : {});
      const res = await fetch(`/api/lists/${id}/items/${itemId}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete wish");
      await load(ownerKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete wish");
    }
  }

  return <main><Header />
    <section className="owner-hero shell">
      {loading ? <div className="loading">Opening your list…</div> : error ? <div className="error-box">{error}</div> : list ? <>
        <div className="owner-title-row"><div><div className="eyebrow">{list.occasion.toUpperCase()} LIST</div><h1>{list.subject_name}’s wishes <span>✨</span></h1><p>{list.items.length} {list.items.length === 1 ? "wish" : "wishes"} so far</p></div><div className="owner-buttons"><button className="button button-ghost" onClick={() => setShowShare(true)}>Share list</button><button className="button button-primary" onClick={() => setShowAdd(true)}>+ Add a wish</button></div></div>
        {!signedIn && ownerKey ? <div className="account-nudge"><div><strong>Keep this list on every device.</strong><span>Create a free Wish North account and this list will be attached automatically.</span></div><Link href="/account" className="button button-ghost">Save to account</Link></div> : null}
        {list.items.length ? <div className="gift-grid">{list.items.map(item => <ItemCard key={item.id} item={item} onDelete={() => deleteItem(item.id, item.title)} />)}</div> : <div className="empty-list"><div>🎁</div><h2>The list is ready.</h2><p>Add the first wish from any store on the internet.</p><button className="button button-primary button-big" onClick={() => setShowAdd(true)}>Add the first wish</button></div>}
        {showAdd ? <AddWishModal listId={id} ownerKey={ownerKey} onClose={() => setShowAdd(false)} onAdded={async () => { await load(ownerKey); setShowAdd(false); }} /> : null}
        {showShare ? <ShareModal list={list} onClose={() => setShowShare(false)} /> : null}
      </> : null}
    </section>
  </main>;
}

function AddWishModal({ listId, ownerKey, onClose, onAdded }: { listId: string; ownerKey: string; onClose: () => void; onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [retailer, setRetailer] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState(2);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function importUrl() {
    if (!url) return;
    setImporting(true); setError("");
    try {
      const res = await fetch("/api/import-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read that page");
      setTitle(data.title || "");
      setRetailer(data.retailer || "");
      setImageUrl(data.imageUrl || "");
      setPrice(data.price || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import. You can still enter the details manually.");
    } finally { setImporting(false); }
  }

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const headers = await authHeaders({ "content-type": "application/json", ...(ownerKey ? { "x-owner-key": ownerKey } : {}) });
      const res = await fetch(`/api/lists/${listId}/items`, { method: "POST", headers, body: JSON.stringify({ url, title, retailer, imageUrl, price, size, color, notes, priority }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save wish");
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal"><button className="modal-x" onClick={onClose}>×</button><div className="eyebrow">ADD A WISH</div><h2>Paste it. We’ll do the boring part.</h2><div className="url-import"><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://store.com/product…" /><button type="button" className="button button-dark" onClick={importUrl} disabled={importing}>{importing ? "Reading…" : "Import"}</button></div><p className="helper">Some retailers block automated reading. If that happens, the form below still works.</p><form onSubmit={save} className="compact-form"><label><span>Item name *</span><input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Nike Air Force 1" /></label><div className="two-col"><label><span>Store</span><input value={retailer} onChange={e => setRetailer(e.target.value)} placeholder="Nike" /></label><label><span>Price</span><input value={price} onChange={e => setPrice(e.target.value)} placeholder="115.00" inputMode="decimal" /></label></div><label><span>Image URL</span><input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…/image.jpg" /></label><div className="two-col"><label><span>Size</span><input value={size} onChange={e => setSize(e.target.value)} placeholder="11" /></label><label><span>Color</span><input value={color} onChange={e => setColor(e.target.value)} placeholder="White" /></label></div><label><span>Notes</span><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Low, not mids" rows={2} /></label><label><span>How much do you want it?</span><div className="priority-buttons">{[1,2,3].map(n => <button type="button" key={n} className={priority === n ? "selected" : ""} onClick={() => setPriority(n)}>{"♥".repeat(n)}</button>)}</div></label>{error ? <div className="error-box">{error}</div> : null}<button className="button button-primary button-big full" disabled={saving}>{saving ? "Adding…" : "Add to list →"}</button></form></div></div>;
}

function ShareModal({ list, onClose }: { list: WishList; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => setShareUrl(`${window.location.origin}/share/${list.share_token}`), [list.share_token]);
  async function copy() { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); }
  const text = encodeURIComponent(`${list.subject_name} made a ${list.occasion} wish list 🎁 ${shareUrl}`);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal modal-small"><button className="modal-x" onClick={onClose}>×</button><div className="share-icon">🎄</div><h2>Share {list.subject_name}’s list</h2><p>Anyone with this private link can see the list. They do not need an account to claim a gift.</p><div className="share-url">{shareUrl}</div><button className="button button-primary full" onClick={copy}>{copied ? "Copied! ✓" : "Copy private link"}</button><a className="button button-ghost full" href={`sms:?&body=${text}`}>Text it</a><p className="helper centered">Claims stay hidden from {list.subject_name}’s list view so surprises stay surprises.</p></div></div>;
}
