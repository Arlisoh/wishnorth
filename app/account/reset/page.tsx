"use client";

import { FormEvent, useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setMessage("");
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    if (error) setError(error.message);
    else setMessage("Password updated. You can return to your account now.");
  }

  return <main><Header /><section className="form-shell shell-narrow"><div className="eyebrow">ACCOUNT RECOVERY</div><h1>Choose a new password</h1>{ready ? <form onSubmit={submit} className="big-form auth-form"><label><span>New password</span><input type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>{error ? <div className="error-box">{error}</div> : null}{message ? <div className="success-box">{message}</div> : null}<button className="button button-primary button-big full">Update password →</button></form> : <div className="loading">Opening your secure reset link…</div>}</section></main>;
}
