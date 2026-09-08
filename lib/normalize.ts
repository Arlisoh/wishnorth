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
  "cincyshirts.com": "Cincy Shirts",
  "flaviar.com": "Flaviar",
  "costco.com": "Costco",
  "samsclub.com": "Sam's Club",
  "wayfair.com": "Wayfair",
  "sephora.com": "Sephora",
  "ulta.com": "Ulta Beauty",
  "apple.com": "Apple",
  "lego.com": "LEGO",
};

const TRACKING_KEYS = new Set([
  "gclid", "dclid", "fbclid", "msclkid", "gbraid", "wbraid", "yclid", "gad_source", "gad_campaignid",
  "ref", "ref_", "tag", "affiliate", "affiliate_id", "affid", "irclickid", "campaignid", "source",
]);

function isTrackingKey(key: string) {
  const lower = key.toLowerCase();
  return TRACKING_KEYS.has(lower) || ["utm_", "nb_", "mc_", "pk_"].some(prefix => lower.startsWith(prefix));
}

function canonicalRetailerPath(url: URL) {
  const host = url.hostname;
  if (host === "amazon.com" || host.endsWith(".amazon.com")) {
    const match = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (match) url.pathname = `/dp/${match[1].toUpperCase()}`;
  }
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
}

export function normalizeProductUrl(value: string | null | undefined) {
  if (!value) return "";
  try {
    const u = new URL(value);
    u.hash = "";
    [...u.searchParams.keys()].filter(isTrackingKey).forEach(k => u.searchParams.delete(k));
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) u.port = "";
    canonicalRetailerPath(u);
    u.searchParams.sort();
    return u.toString().replace(/\?$/, "").replace(/\/$/, "");
  } catch { return ""; }
}

export function normalizeTitle(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function retailerDomain(url: string | null | undefined) {
  const host = hostFromUrl(url || "").toLowerCase();
  const parts = host.split(".");
  const multipartSuffixes = new Set(["co.uk", "org.uk", "com.au", "com.br", "com.mx", "co.jp", "co.nz"]);
  const suffix = parts.slice(-2).join(".");
  return parts.length > 2 ? parts.slice(multipartSuffixes.has(suffix) ? -3 : -2).join(".") : host;
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
