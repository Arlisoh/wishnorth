"use client";

import { accessToken } from "@/lib/client-auth";

export async function syncLocalAccess() {
  const token = await accessToken();
  if (!token || typeof window === "undefined") return { lists: 0, claims: 0 };
  let lists = 0;
  let claims = 0;

  const ownerEntries = Object.keys(localStorage)
    .filter(key => key.startsWith("wishnorth_owner_"))
    .map(key => ({ listId: key.replace("wishnorth_owner_", ""), ownerKey: localStorage.getItem(key) || "" }))
    .filter(entry => entry.listId && entry.ownerKey);

  for (const entry of ownerEntries) {
    try {
      const res = await fetch("/api/account/attach-list", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(entry),
      });
      if (res.ok) lists += 1;
    } catch {}
  }

  const claimKeys = new Set([
    ...Object.keys(localStorage).filter(key => key.startsWith("wishnorth_claim_")),
    ...Object.keys(sessionStorage).filter(key => key.startsWith("wishnorth_claim_")),
  ]);
  const claimEntries = [...claimKeys]
    .map(key => {
      const claimCode = localStorage.getItem(key) || sessionStorage.getItem(key) || "";
      if (claimCode) localStorage.setItem(key, claimCode); // migrate v0.1 session-only claims
      return { itemId: key.replace("wishnorth_claim_", ""), claimCode };
    })
    .filter(entry => entry.itemId && entry.claimCode);

  for (const entry of claimEntries) {
    try {
      const res = await fetch("/api/account/attach-claim", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(entry),
      });
      if (res.ok) claims += 1;
    } catch {}
  }

  return { lists, claims };
}
