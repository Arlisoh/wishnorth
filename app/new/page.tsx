"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function NewList() {
  const router = useRouter();
  const [subjectName, setSubjectName] = useState("");
  const [occasion, setOccasion] = useState("Christmas");
  const [managed, setManaged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/lists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subjectName, occasion, isManaged: managed }) });
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
        <p className="form-intro">No account wall. Create the list first, then share it when you are ready.</p>
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
