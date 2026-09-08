"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { accessToken } from "@/lib/client-auth";

type Report = {
  id: string;
  target_type: "list" | "item";
  reason: string;
  details: string | null;
  reporter_email: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  wish_lists?: { subject_name?: string; occasion?: string; share_token?: string } | null;
  wish_items?: { title?: string; url?: string | null; retailer?: string | null } | null;
};

export default function AdminPage(){
  const [reports,setReports]=useState<Report[]>([]);
  const [error,setError]=useState("");
  const [maintenance,setMaintenance]=useState("");
  const [loading,setLoading]=useState(true);
  const [notes,setNotes]=useState<Record<string,string>>({});
  async function load(){setLoading(true);setError("");try{const token=await accessToken();if(!token)throw new Error("Sign in with the admin account first.");const res=await fetch("/api/admin/reports",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not load reports");setReports(data.reports||[]);}catch(e){setError(e instanceof Error?e.message:"Could not load reports");}finally{setLoading(false);}}
  useEffect(()=>{load();},[]);
  async function act(id:string,action:string){const token=await accessToken();if(!token)return;const res=await fetch(`/api/admin/reports/${id}`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify({action,note:notes[id]||""})});const data=await res.json();if(!res.ok){setError(data.error||"Moderation action failed");return;}await load();}
  async function cacheLegacyImages(){setError("");setMaintenance("Caching up to five legacy images…");const token=await accessToken();if(!token){setError("Sign in with the admin account first.");setMaintenance("");return;}const res=await fetch("/api/admin/images/backfill",{method:"POST",headers:{Authorization:`Bearer ${token}`}});const data=await res.json();if(!res.ok){setError(data.error||"Image maintenance failed");setMaintenance("");return;}setMaintenance(`${data.cached} images cached, ${data.failed} failed, ${data.remaining} remaining.`);}
  return <main><Header/><section className="admin-shell"><div className="admin-top"><div><div className="eyebrow">WISH NORTH ADMIN</div><h1>Abuse & takedowns</h1><p>Review reports, hide content immediately, restore it, dismiss reports, or permanently delete content.</p></div><div className="admin-actions"><button className="button button-ghost" onClick={cacheLegacyImages}>Cache legacy images</button><button className="button button-ghost" onClick={load}>Refresh</button></div></div>{maintenance?<div className="success-box">{maintenance}</div>:null}{error?<div className="error-box">{error}</div>:null}{loading?<div className="loading">Loading reports…</div>:<div className="admin-grid">{reports.length?reports.map(r=><article className="admin-card" key={r.id}><div className="admin-card-head"><div><span className="status-pill">{r.status}</span><h3>{r.target_type==="item"?(r.wish_items?.title||"Reported item"):`${r.wish_lists?.subject_name||"Reported"} list`}</h3><div className="admin-meta"><span>{r.reason}</span><span>{new Date(r.created_at).toLocaleString()}</span>{r.reporter_email?<span>{r.reporter_email}</span>:null}</div></div></div>{r.details?<p>{r.details}</p>:null}{r.wish_items?.url?<p><a className="text-link" href={r.wish_items.url} target="_blank" rel="noreferrer">Open retailer item ↗</a></p>:null}{r.wish_lists?.share_token?<p><a className="text-link" href={`/share/${r.wish_lists.share_token}`} target="_blank" rel="noreferrer">Open shared list ↗</a></p>:null}<textarea className="admin-note" placeholder="Internal moderation note" value={notes[r.id]||""} onChange={e=>setNotes(v=>({...v,[r.id]:e.target.value}))}/><div className="admin-actions"><button className="button button-dark" onClick={()=>act(r.id,"hide")}>Hide content</button><button className="button button-ghost" onClick={()=>act(r.id,"restore")}>Restore</button><button className="button button-ghost" onClick={()=>act(r.id,"dismiss")}>Dismiss report</button><button className="plain-link danger-link" onClick={()=>confirm("Permanently delete this content? This cannot be undone.")&&act(r.id,"delete")}>Delete permanently</button></div></article>):<div className="mini-empty">No abuse reports yet.</div>}</div>}</section></main>;
}
