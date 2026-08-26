"use client";

import { money } from "@/lib/helpers";
import type { WishItem } from "@/lib/types";

export default function ItemCard({ item, publicView = false, onClaim }: { item: WishItem; publicView?: boolean; onClaim?: (item: WishItem) => void }) {
  return (
    <article className={`gift-card ${item.claimed ? "gift-card-claimed" : ""}`}>
      <div className="gift-image-wrap">
        {item.image_url ? <img src={item.image_url} alt="" className="gift-image" /> : <div className="gift-placeholder">🎁</div>}
        {item.claimed && publicView ? <div className="claimed-stamp">TAKEN</div> : null}
      </div>
      <div className="gift-content">
        <div className="eyebrow">{item.retailer || "Wish"}</div>
        <h3>{item.title}</h3>
        {item.price_cents != null ? <div className="price">{money(item.price_cents, item.currency)}</div> : null}
        <div className="chips">
          {item.size ? <span>Size: {item.size}</span> : null}
          {item.color ? <span>{item.color}</span> : null}
          <span>{"♥".repeat(item.priority)}</span>
        </div>
        {item.notes ? <p className="gift-notes">{item.notes}</p> : null}
        <div className="gift-actions">
          {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="text-link">View item ↗</a> : null}
          {publicView && !item.claimed && onClaim ? <button className="button button-dark" onClick={() => onClaim(item)}>I’m getting this</button> : null}
          {publicView && item.claimed ? <span className="taken-copy">Someone has this covered ✨</span> : null}
        </div>
      </div>
    </article>
  );
}
