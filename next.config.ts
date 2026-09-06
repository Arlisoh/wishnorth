import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/share/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
      { source: "/list/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
      { source: "/account/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
      { source: "/my-lists/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
      { source: "/my-gifts/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
    ];
  },
};

export default nextConfig;
