"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AccountNav() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    try {
      const supabase = supabaseBrowser();
      supabase.auth.getSession().then(({ data }) => { if (active) setSignedIn(Boolean(data.session)); });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (active) setSignedIn(Boolean(session)); });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      setSignedIn(false);
    }
    return () => { active = false; unsubscribe(); };
  }, []);

  return signedIn
    ? <Link href="/account" className="button button-ghost button-small">My Account</Link>
    : <Link href="/account" className="button button-ghost button-small">Sign in</Link>;
}
