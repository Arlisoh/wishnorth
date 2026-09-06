"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdultAccountGate({children}:{children:React.ReactNode}){
  const[ready,setReady]=useState(false);const[accepted,setAccepted]=useState(false);const[checked,setChecked]=useState(false);
  useEffect(()=>{const ok=localStorage.getItem("wishnorth_adult_account_confirmed")==="yes";setAccepted(ok);setReady(true);},[]);
  if(!ready)return <div className="loading">Opening Wish North…</div>;
  if(accepted)return <>{children}</>;
  return <main><section className="form-shell shell-narrow"><div className="eyebrow">ADULT ACCOUNTS ONLY</div><h1>Wish North accounts are for adults 18+.</h1><p className="form-intro">Parents and other adults can create and manage wish lists for children. Children do not need and should not create an account.</p><div className="legal-callout"><label className="account-consent"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/><span><strong>I confirm I am at least 18 years old.</strong><small>By continuing, I also agree to the <Link href="/terms">Terms of Use</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</small></span></label></div><button className="button button-primary button-big full" disabled={!checked} onClick={()=>{localStorage.setItem("wishnorth_adult_account_confirmed","yes");setAccepted(true);}}>Continue to account →</button><p className="helper centered">Creating a list for a child? You can manage it from your own adult account.</p></section></main>;
}
