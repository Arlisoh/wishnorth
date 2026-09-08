"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { accessToken } from "@/lib/client-auth";
import { syncLocalAccess } from "@/lib/client-sync";
import { money } from "@/lib/helpers";
import { productImageUrl } from "@/lib/productImage";

type AccountData = {
  user: { id: string; email?: string; firstName?: string };
  lists: Array<{ id: string; subject_name: string; occasion: string; created_at: string; itemCount: number }>;
  claims: Array<{
    id: string;
    created_at: string;
    item: { id: string; title: string; url: string | null; image_url: string | null; retailer: string | null; price_cents: number | null; currency: string };
    list: { id: string; subject_name: string; occasion: string; share_token: string };
  }>;
};

export default function AccountPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const accountLoadInFlight = useRef(false);

  const loadAccount = useCallback(async () => {
    if (accountLoadInFlight.current) return;
    accountLoadInFlight.current = true;
    const token = await accessToken();
    if (!token) { setAccount(null); accountLoadInFlight.current = false; return; }
    setError("");
    setLoadingAccount(true);
    try {
      const consent = await fetch("/api/account/consent", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ age18: true, termsAccepted: true }),
      });
      if (!consent.ok) {
        const consentData = await consent.json();
        throw new Error(consentData.error || "Could not record account consent");
      }
      await syncLocalAccess();
      const res = await fetch("/api/account", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load account");
      setAccount({
        ...data,
        claims: (data.claims || []).map((claim: AccountData["claims"][number]) => ({
          ...claim,
          item: {
            ...claim.item,
            image_url: claim.item.image_url ? productImageUrl(claim.item.image_url) : null,
          },
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load account");
    } finally {
      setLoadingAccount(false);
      accountLoadInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const yes = Boolean(data.session);
      setSignedIn(yes);
      setSessionReady(true);
      if (yes) loadAccount();
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const yes = Boolean(session);
      setSignedIn(yes);
      setSessionReady(true);
      if (yes) setTimeout(() => loadAccount(), 0);
      else setAccount(null);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [loadAccount]);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    setAccount(null);
    setSignedIn(false);
    setNotice("Signed out.");
  }

  return <main><Header /><section className="form-shell shell-narrow">
    {!sessionReady ? <div className="loading">Opening your account…</div> : signedIn ? <>
      <div className="account-heading-row"><div><div className="eyebrow">YOUR WISH NORTH</div><h1>{account?.user.firstName ? `Hi, ${account.user.firstName}.` : "Your account"}</h1><p className="form-intro">Your lists and the gifts you’ve claimed travel with you on any device.</p></div><button className="button button-ghost" onClick={signOut}>Sign out</button></div>
      {error ? <div className="error-box">{error}</div> : null}
      {loadingAccount && !account ? <div className="loading">Gathering your lists and gifts…</div> : account ? <AccountDashboard data={account} onRefresh={loadAccount} /> : null}
    </> : <AuthPanel mode={mode} setMode={setMode} notice={notice} setNotice={setNotice} error={error} setError={setError} />}
  </section></main>;
}

function AuthPanel({ mode, setMode, notice, setNotice, error, setError }: {
  mode: "signin" | "signup" | "forgot";
  setMode: (mode: "signin" | "signup" | "forgot") => void;
  notice: string;
  setNotice: (v: string) => void;
  error: string;
  setError: (v: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setNotice("");
    const supabase = supabaseBrowser();
    try {
      if (mode === "signup") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password, firstName: firstName.trim(), adultConfirmed: localStorage.getItem("wishnorth_adult_account_confirmed") === "yes" }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not create account.");
        setNotice("Check your email to confirm your Wish North account. Your lists and claims on this browser will be waiting when you sign in.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not send reset email.");
        setNotice("If an account exists for that email, a password reset link is on its way. If it does not arrive, check spam or create an account first.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account request failed.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <div className="eyebrow">SAVE YOUR WISH NORTH</div>
    <h1>{mode === "signup" ? "Create your free account" : mode === "forgot" ? "Reset your password" : "Welcome back"}</h1>
    <p className="form-intro">{mode === "signup" ? "One account keeps your own wish lists and every gift you claim for someone else in one place." : mode === "forgot" ? "Enter your email and we’ll send a secure reset link." : "Sign in to see your lists and the gifts you’re buying."}</p>
    <div className="auth-tabs" role="tablist">
      <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(""); setNotice(""); }}>Sign in</button>
      <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setNotice(""); }}>Create account</button>
    </div>
    <form className="big-form auth-form" onSubmit={submit}>
      {mode === "signup" ? <label><span>First name</span><input required maxLength={80} value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" /></label> : null}
      <label><span>Email</span><input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
      {mode !== "forgot" ? <label><span>Password</span><input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /><small>At least 8 characters.</small></label> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {notice ? <div className="success-box">{notice}</div> : null}
      <button className="button button-primary button-big full" disabled={loading}>{loading ? "Working…" : mode === "signup" ? "Create free account →" : mode === "forgot" ? "Send reset link →" : "Sign in →"}</button>
    </form>
    {mode === "signin" ? <button type="button" className="plain-link auth-forgot" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>Forgot your password?</button> : mode === "forgot" ? <button type="button" className="plain-link auth-forgot" onClick={() => setMode("signin")}>Back to sign in</button> : null}
    <div className="access-note"><strong>Already made a list or claimed a gift?</strong><p>Sign in or create your account on this same browser once. Wish North automatically attaches those existing lists and claims to your account.</p></div>
  </>;
}

function AccountDashboard({ data, onRefresh }: { data: AccountData; onRefresh: () => Promise<void> }) {
  async function releaseClaim(id: string, title: string) {
    if (!confirm(`Release “${title}”? It will become available for someone else to claim.`)) return;
    const token = await accessToken();
    const res = await fetch(`/api/account/claims/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const claim = data.claims.find(c => c.id === id);
      if (claim?.item?.id) localStorage.removeItem(`wishnorth_claim_${claim.item.id}`);
      await onRefresh();
    }
  }

  async function deleteAccount() {
    if (!confirm("Permanently delete your Wish North account, every list you own, and every gift claim attached to it? This cannot be undone.")) return;
    const token = await accessToken();
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE MY ACCOUNT" }),
    });
    const result = await res.json();
    if (!res.ok) { alert(result.error || "Could not delete your account."); return; }
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("wishnorth_owner_") || key.startsWith("wishnorth_claim_")) localStorage.removeItem(key);
    }
    await supabaseBrowser().auth.signOut();
    window.location.assign("/");
  }

  return <div className="account-sections">
    <section className="account-section"><div className="account-section-head"><div><div className="eyebrow">MY LISTS</div><h2>Your wish lists</h2></div><Link href="/new" className="button button-primary">+ New list</Link></div>
      {data.lists.length ? <div className="my-lists-grid">{data.lists.map(list => <Link href={`/list/${list.id}`} className="my-list-card" key={list.id}><div><div className="eyebrow">{list.occasion.toUpperCase()}</div><h2>{list.subject_name}’s list</h2><p>{list.itemCount} {list.itemCount === 1 ? "wish" : "wishes"}</p></div><span>Manage →</span></Link>)}</div> : <div className="mini-empty">No lists yet. <Link href="/new">Start your first list →</Link></div>}
    </section>
    <section className="account-section"><div className="account-section-head"><div><div className="eyebrow">MY GIFTS</div><h2>Gifts you’re buying</h2></div><Link href="/my-gifts" className="button button-ghost">Open My Gifts</Link></div>
      {data.claims.length ? <div className="claim-list">{data.claims.slice(0, 4).map(claim => <div className="claim-card" key={claim.id}>{claim.item.image_url ? <img src={claim.item.image_url} alt="" /> : <div className="claim-thumb">🎁</div>}<div className="claim-main"><div className="eyebrow">FOR {claim.list.subject_name.toUpperCase()}</div><strong>{claim.item.title}</strong><span>{claim.item.retailer || "Wish"}{claim.item.price_cents != null ? ` · ${money(claim.item.price_cents, claim.item.currency)}` : ""}</span></div><div className="claim-actions">{claim.item.url ? <a href={claim.item.url} target="_blank" rel="noreferrer" className="text-link">Buy ↗</a> : null}<button className="plain-link danger-link" onClick={() => releaseClaim(claim.id, claim.item.title)}>Release</button></div></div>)}</div> : <div className="mini-empty">Nothing claimed yet. When you claim a gift from someone’s list, it will appear here.</div>}
    </section>
    <section className="account-danger"><div><strong>Delete account and data</strong><p>Permanently removes your account, lists, wishes, and attached gift claims.</p></div><button className="button button-ghost danger-link" onClick={deleteAccount}>Delete my account</button></section>
  </div>;
}
