import { createHash } from "node:crypto";
import { hostFromUrl } from "@/lib/helpers";

const STORE_NAMES: Record<string, string> = {
  "amazon.com": "Amazon",
  "walmart.com": "Walmart",
  "target.com": "Target",
  "bestbuy.com": "Best Buy",
  "nike.com": "Nike",
  "adidas.com": "Adidas",
  "etsy.com": "Etsy",
  "macys.com": "Macy's",
  "kohls.com": "Kohl's",
  "homedepot.com": "The Home Depot",
  "lowes.com": "Lowe's",
};

export function normalizeProductUrl(value: string | null | undefined) {
  if (!value) return "";
  try {
    const u = new URL(value);
    u.hash = "";
    const drop = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid","msclkid","ref","ref_","tag"];
    drop.forEach(k => u.searchParams.delete(k));
    [...u.searchParams.keys()].filter(k => k.toLowerCase().startsWith("utm_")).forEach(k => u.searchParams.delete(k));
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) u.port = "";
    return u.toString().replace(/\?$/, "").replace(/\/$/, "");
  } catch { return ""; }
}

export function normalizeTitle(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function retailerDomain(url: string | null | undefined) {
  const host = hostFromUrl(url || "").toLowerCase();
  const parts = host.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : host;
}

export function normalizeRetailer(input: string | null | undefined, url?: string | null) {
  const domain = retailerDomain(url);
  if (domain && STORE_NAMES[domain]) return STORE_NAMES[domain];
  const cleaned = String(input || "").replace(/\s+/g, " ").trim();
  if (cleaned && !cleaned.includes(".")) return cleaned.slice(0, 100);
  if (domain) return domain.split(".")[0].replace(/(^|[-_])\w/g, m => m.replace(/[-_]/, "").toUpperCase());
  return cleaned.slice(0, 100);
}

export function productKey(title: string, url?: string | null) {
  const canonical = normalizeProductUrl(url || "");
  const basis = canonical || normalizeTitle(title);
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}
