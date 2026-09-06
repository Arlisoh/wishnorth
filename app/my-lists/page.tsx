"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import type { WishList } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { accessToken } from "@/lib/client-auth";
import { syncLocalAccess } from "@/lib/client-sync";

type SavedList = Pick<WishList, "id" | "subject_name" | "occasion" | "created_at"> & { itemCount: number };

export default function MyListsPage() {
  const [lists, setLists] = useState<SavedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const token = await accessToken();
    if (token) {
      try {
        await syncLocalAccess();
        const res = await fetch("/api/account", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setLists((data.lists || []).map((list: any) => ({ id: list.id, subject_name: list.subject_name, occasion: list.occasion, created_at: list.created_at, itemCount: list.itemCount || 0 })));
          setLoading(false);
          return;
        }
      } catch {}
    }

    const saved = Object.keys(localStorage)
      .filter(key => key.startsWith("wishnorth_owner_"))
      .map(key => ({ id: key.replace("wishnorth_owner_", ""), ownerKey: localStorage.getItem(key) || "" }))
      .filter(entry => entry.id && entry.ownerKey);

    const results = await Promise.all(saved.map(async entry => {
      try {
        const res = await fetch(`/api/lists/${entry.id}`, { headers: { "x-owner-key": entry.ownerKey }, cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        return { id: data.list.id, subject_name: data.list.subject_name, occasion: data.list.occasion, created_at: data.list.created_at, itemCount: data.list.items?.length || 0 } as SavedList;
      } catch { return null; }
    }));
    setLists(results.filter((item): item is SavedList => Boolean(item)).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    setLoading(false);
  }, []);

  useEffect(() => {
    try {
      const supabase = supabaseBrowser();
      supabase.auth.getSession().then(({ data }) => { setSignedIn(Boolean(data.session)); load(); });
      const { data } = supabase.auth.onAuthStateChange((_e, session) => { setSignedIn(Boolean(session)); setTimeout(load, 0); });
      return () => data.subscription.unsubscribe();
    } catch { load(); }
  }, [load]);

  return <main><Header /><section className="form-shell shell-narrow"><div className="eyebrow">YOUR WISH NORTH</div><h1>My Lists</h1><p className="form-intro">{signedIn ? "These lists are saved to your account and available anywhere you sign in." : "Lists created in this browser appear here. Create a free account to make them available on every device."}</p>
    {!signedIn && lists.length ? <div className="account-nudge"><div><strong>Don’t lose these lists.</strong><span>Creating an account will attach them automatically without changing your share links.</span></div><Link href="/account" className="button button-primary">Save to account</Link></div> : null}
    {loading ? <div className="loading">Finding your lists…</div> : lists.length ? <div className="my-lists-grid">{lists.map(list => <Link href={`/list/${list.id}`} className="my-list-card" key={list.id}><div><div className="eyebrow">{list.occasion.toUpperCase()}</div><h2>{list.subject_name}’s list</h2><p>{list.itemCount} {list.itemCount === 1 ? "wish" : "wishes"}</p></div><span>Manage →</span></Link>)}</div> : <div className="empty-list"><div>🎁</div><h2>No lists yet.</h2><p>Create one and it will automatically appear here.</p><Link href="/new" className="button button-primary button-big">Start a list</Link></div>}
  </section></main>;
}
