import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateIpv6(ip: string) {
  const value = ip.toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
}

export async function assertPublicHttpUrl(raw: string) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only public HTTP(S) URLs are allowed");
  if (url.username || url.password) throw new Error("URLs with embedded credentials are not allowed");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private hosts are not allowed");
  if (net.isIP(host)) {
    if ((net.isIPv4(host) && isPrivateIpv4(host)) || (net.isIPv6(host) && isPrivateIpv6(host))) throw new Error("Private IP addresses are not allowed");
    return url;
  }
  const resolved = await dns.lookup(host, { all: true, verbatim: true });
  if (!resolved.length) throw new Error("Host could not be resolved");
  for (const r of resolved) {
    if ((r.family === 4 && isPrivateIpv4(r.address)) || (r.family === 6 && isPrivateIpv6(r.address))) throw new Error("Host resolves to a private address");
  }
  return url;
}
