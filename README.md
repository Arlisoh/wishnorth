# Wish North MVP

A production-shaped MVP for the Metric North holiday campaign.

## What is working

- Create a Christmas/birthday/etc. wishlist without an account wall
- Parent-managed lists with no child login/profile/email
- Private owner key stored in the creating browser
- Paste a product URL and attempt Open Graph / JSON-LD product import
- Manual fallback when a retailer blocks automated fetching
- Add title, retailer, price, image, size, color, notes, and 1–3 heart priority
- Generate one private share URL
- Shared list needs no login
- Gift claims are hidden from the owner view and visible to other shoppers as "Taken"
- Race-safe unique claim protection in the database
- Real-only Wish Index endpoint: trends appear only after actual repeated wishes
- Metric North attribution / business CTA

## 1. Create Supabase project

Create a Supabase project, open **SQL Editor**, and run `supabase/schema.sql`.

Then open **Project Settings → API** and copy:

- Project URL
- `service_role` key (server secret; never expose in client code)

## 2. Environment

Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 4. Deploy to Netlify

1. Push this folder to a GitHub repo.
2. Create a new Netlify site from that repo.
3. Add the three environment variables above in Netlify.
4. Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS URL.
5. Deploy.
6. Add `wish.metricnorth.ai` as the custom domain and create the DNS record Netlify requests.

## Security architecture

The browser never has a Supabase key in this MVP. All database access goes through Next.js server routes using the service role. RLS is enabled and browser roles are explicitly revoked.

Each list has a random 256-bit owner key stored only in the creating browser. Only the SHA-256 hash is stored in the database. A separate high-entropy share token is used for read/claim links.

## Before broad public launch

- Add adult email recovery / magic-link ownership.
- Add production-grade distributed rate limiting / bot protection.
- Add abuse reporting and admin takedown tools.
- Add privacy policy / terms and final COPPA/privacy review.
- Add image proxying/storage rather than indefinitely hotlinking retailer images.
- Add claim release / transfer using the generated claim code.
- Add edit/delete wish endpoints.
- Add QR sharing and Web Share API.
- Add retailer/product normalization before using trends for press claims.

## Important MVP limitation

Some large retailers intentionally block automated requests. The importer falls back to manual entry rather than pretending it succeeded. URL importing also blocks localhost, private networks, private DNS resolutions, credentialed URLs, and unsafe redirects.


## Version note

This package pins Next.js 16.3.3, the Active LTS security release published August 25, 2026. Node 22 is specified for Netlify and is compatible with current Supabase client requirements.
