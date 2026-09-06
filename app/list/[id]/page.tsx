"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { authHeaders } from "@/lib/client-auth";
import { supabaseBrowser } from "@/lib/supabase-browser";
import Header from "@/components/Header";
import ItemCard from "@/components/ItemCard";
import type { WishItem, WishList } from "@/lib/types";

export default function OwnerList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [list, setList] = useState<WishList | null>(null);
  const [ownerKey, setOwnerKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<WishItem | null | undefined>(undefined);
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
    } catch { load(key).catch(e => setError(e.message)).finally(() => setLoading(false)); }
  }, [id]);

  async function deleteItem(itemId: string, title: string) {
    if (!confirm(`Delete “${title}” from this list?`)) return;
    const headers = await authHeaders(ownerKey ? { "x-owner-key": ownerKey } : {});
    const res = await fetch(`/api/lists/${id}/items/${itemId}`, { method: "DELETE", headers });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Could not delete wish"); return; }
    await load(ownerKey);
  }

  return <main><Header/><section className="owner-hero shell">
    {loading?<div className="loading">Opening your list…</div>:error?<div className="error-box">{error}</div>:list?<>
      <div className="owner-title-row"><div><div className="eyebrow">{list.occasion.toUpperCase()} LIST</div><h1>{list.subject_name}’s wishes <span>✨</span></h1><p>{list.items.length} {list.items.length===1?"wish":"wishes"} so far</p></div><div className="owner-buttons"><button className="button button-ghost" onClick={()=>setShowShare(true)}>Share list</button><button className="button button-primary" onClick={()=>setEditing(null)}>+ Add a wish</button></div></div>
      {!signedIn&&ownerKey?<div className="account-nudge"><div><strong>Keep this list on every device.</strong><span>Create a free adult Wish North account and this list will attach automatically.</span></div><Link href="/account" className="button button-ghost">Save to account</Link></div>:null}
      {list.items.length?<div className="gift-grid">{list.items.map(item=><ItemCard key={item.id} item={item} onEdit={()=>setEditing(item)} onDelete={()=>deleteItem(item.id,item.title)}/>)}</div>:<div className="empty-list"><div>🎁</div><h2>The list is ready.</h2><p>Add the first wish from any store on the internet.</p><button className="button button-primary button-big" onClick={()=>setEditing(null)}>Add the first wish</button></div>}
      {editing!==undefined?<WishModal listId={id} ownerKey={ownerKey} item={editing} onClose={()=>setEditing(undefined)} onSaved={async()=>{await load(ownerKey);setEditing(undefined);}}/>:null}
      {showShare?<ShareModal list={list} onClose={()=>setShowShare(false)}/>:null}
    </>:null}
  </section></main>;
}

function WishModal({listId,ownerKey,item,onClose,onSaved}:{listId:string;ownerKey:string;item:WishItem|null;onClose:()=>void;onSaved:()=>void}){
  const[url,setUrl]=useState(item?.url||"");const[title,setTitle]=useState(item?.title||"");const[retailer,setRetailer]=useState(item?.retailer||"");const[imageUrl,setImageUrl]=useState(item?.image_url||"");const[imageSourceUrl,setImageSourceUrl]=useState(item?.image_source_url||"");const[price,setPrice]=useState(item?.price_cents!=null?(item.price_cents/100).toFixed(2):"");const[size,setSize]=useState(item?.size||"");const[color,setColor]=useState(item?.color||"");const[notes,setNotes]=useState(item?.notes||"");const[priority,setPriority]=useState(item?.priority||2);const[website,setWebsite]=useState("");const[working,setWorking]=useState(false);const[error,setError]=useState("");
  async function importUrl(){if(!url)return;setWorking(true);setError("");try{const res=await fetch("/api/import-url",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url,website})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not read that page");setUrl(data.finalUrl||url);setTitle(data.title||title);setRetailer(data.retailer||retailer);setImageUrl(data.imageUrl||"");setImageSourceUrl(data.imageSourceUrl||"");setPrice(data.price||price);}catch(e){setError(e instanceof Error?e.message:"Could not import");}finally{setWorking(false);}}
  async function save(e:FormEvent){e.preventDefault();setWorking(true);setError("");try{const headers=await authHeaders({"content-type":"application/json",...(ownerKey?{"x-owner-key":ownerKey}:{})});const path=item?`/api/lists/${listId}/items/${item.id}`:`/api/lists/${listId}/items`;const res=await fetch(path,{method:item?"PATCH":"POST",headers,body:JSON.stringify({url,title,retailer,imageUrl,imageSourceUrl,price,size,color,notes,priority,website})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not save wish");onSaved();}catch(e){setError(e instanceof Error?e.message:"Could not save wish");setWorking(false);}}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal"><button className="modal-x" onClick={onClose}>×</button><div className="eyebrow">{item?"EDIT WISH":"ADD A WISH"}</div><h2>{item?"Change the details.":"Paste it. We’ll do the boring part."}</h2><div className="url-import"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://store.com/product…"/><button type="button" className="button button-dark" onClick={importUrl} disabled={working}>Import</button></div><form onSubmit={save} className="compact-form"><label><span>Item name *</span><input required value={title} onChange={e=>setTitle(e.target.value)}/></label><div className="two-col"><label><span>Store</span><input value={retailer} onChange={e=>setRetailer(e.target.value)}/></label><label><span>Price</span><input value={price} onChange={e=>setPrice(e.target.value)} inputMode="decimal"/></label></div><label><span>Image URL</span><input value={imageUrl} onChange={e=>setImageUrl(e.target.value)}/></label><div className="two-col"><label><span>Size</span><input value={size} onChange={e=>setSize(e.target.value)}/></label><label><span>Color</span><input value={color} onChange={e=>setColor(e.target.value)}/></label></div><label><span>Notes</span><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)}/></label><label><span>How much do you want it?</span><div className="priority-buttons">{[1,2,3].map(n=><button type="button" key={n} className={priority===n?"selected":""} onClick={()=>setPriority(n)}>{"♥".repeat(n)}</button>)}</div></label><label className="honeypot" aria-hidden="true"><span>Website</span><input tabIndex={-1} value={website} onChange={e=>setWebsite(e.target.value)}/></label>{error?<div className="error-box">{error}</div>:null}<button className="button button-primary button-big full" disabled={working}>{working?"Saving…":item?"Save changes →":"Add to list →"}</button></form></div></div>;
}

function ShareModal({list,onClose}:{list:WishList;onClose:()=>void}){
  const[copied,setCopied]=useState(false);const[shareUrl,setShareUrl]=useState("");const[qr,setQr]=useState("");
  useEffect(()=>{const url=`${window.location.origin}/share/${list.share_token}`;setShareUrl(url);QRCode.toDataURL(url,{width:320,margin:1}).then(setQr).catch(()=>{});},[list.share_token]);
  async function copy(){await navigator.clipboard.writeText(shareUrl);setCopied(true);setTimeout(()=>setCopied(false),1600);}
  async function nativeShare(){if(navigator.share){await navigator.share({title:`${list.subject_name}’s Wish North list`,text:`${list.subject_name} made a ${list.occasion} wish list 🎁`,url:shareUrl});}else await copy();}
  const text=encodeURIComponent(`${list.subject_name} made a ${list.occasion} wish list 🎁 ${shareUrl}`);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal modal-small"><button className="modal-x" onClick={onClose}>×</button><div className="share-icon">🎄</div><h2>Share {list.subject_name}’s list</h2><p>Anyone with this unlisted link can see the list. Keep the link within the people you intend to invite.</p>{qr?<div className="qr-wrap"><img src={qr} alt="QR code for this wish list"/></div>:null}<div className="share-url">{shareUrl}</div><div className="share-tools"><button className="button button-primary full" onClick={nativeShare}>Share</button><button className="button button-ghost" onClick={copy}>{copied?"Copied! ✓":"Copy link"}</button><a className="button button-ghost" href={`sms:?&body=${text}`}>Text it</a></div><p className="helper centered">Gift claims remain hidden from the list owner.</p></div></div>;
}
