"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { authHeaders } from "@/lib/client-auth";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function NewList() {
  const router = useRouter();
  const [subjectName, setSubjectName] = useState("");
  const [occasion, setOccasion] = useState("Christmas");
  const [managed, setManaged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      const supabase = supabaseBrowser();
      supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
      const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
      return () => data.subscription.unsubscribe();
    } catch { return; }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const headers = await authHeaders({ "content-type": "application/json" });
      const res = await fetch("/api/lists", { method: "POST", headers, body: JSON.stringify({ subjectName, occasion, isManaged: managed }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create list");
      localStorage.setItem(`wishnorth_owner_${data.id}`, data.ownerKey);
      router.push(`/list/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main><Header />
      <section className="form-shell shell-narrow">
        <div className="eyebrow">START A LIST</div>
        <h1>Who are we wishing for?</h1>
        <p className="form-intro">{signedIn ? "This list will be saved to your Wish North account automatically." : "Create the list now. You can make a free account afterward to keep it available on every device."}</p>
        <form onSubmit={submit} className="big-form">
          <label><span>First name</span><input required maxLength={80} value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="Carter" autoFocus /></label>
          <label><span>Occasion</span><select value={occasion} onChange={e => setOccasion(e.target.value)}><option>Christmas</option><option>Birthday</option><option>Graduation</option><option>Wedding</option><option>Other</option></select></label>
          <label className="choice-card"><input type="checkbox" checked={managed} onChange={e => setManaged(e.target.checked)} /><div><strong>I manage this list for someone else</strong><small>Perfect for a parent creating a child’s list. They do not get a login, email profile, messaging, or public account.</small></div></label>
          {error ? <div className="error-box">{error}</div> : null}
          <button className="button button-primary button-big full" disabled={loading}>{loading ? "Creating…" : `Create ${subjectName ? subjectName + "’s" : "the"} list →`}</button>
        </form>
      </section>
    </main>
  );
}
