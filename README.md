# Wish North v0.3 — Accounts + My Gifts + List Management

Wish North is the Metric North holiday wishlist MVP. v0.3 adds persistent adult accounts while preserving frictionless anonymous list creation and gift claiming.

## What works now

- Create a wishlist with or without an account
- Adult Supabase Auth accounts with email/password
- Email confirmation and password-reset support
- Existing browser-only lists automatically attach after sign-in
- Parent-managed child lists still have no child login/email/profile
- Add products from URLs with manual fallback
- Delete wishes from your own list
- Private share links
- Claim gifts without an account
- Logged-in claims save automatically to **My Gifts**
- Anonymous claims are saved locally, then automatically attach after sign-in/account creation on that browser
- **My Gifts** shopper dashboard remembers what you are buying, recipient, store, price, and source list
- Release a claim so someone else can buy it
- **My Lists** works cross-device for signed-in users
- Real-only Wish Index

## Upgrade an existing Wish North Supabase database

You already ran `supabase/schema.sql` for the original MVP. Do **not** run it again.

Open Supabase → SQL Editor and run this one new file:

`supabase/v0.3-accounts.sql`

It adds:

- `wish_lists.owner_user_id`
- `gift_claims.claimer_user_id`
- indexes for both

It does not delete or replace existing lists, wishes, claims, or share links.

## Supabase Auth settings

In Supabase open **Authentication → URL Configuration**.

For the current Netlify deployment use:

- Site URL: `https://wishnorth.netlify.app`
- Redirect URL: `https://wishnorth.netlify.app/**`

When the custom domain is live, also add:

- `https://wish.metricnorth.ai/**`

Keep email confirmation enabled for a public launch.

## Netlify environment variables

The original three remain, and v0.3 adds two safe browser-side Supabase variables:

```env
NEXT_PUBLIC_SITE_URL=https://wishnorth.netlify.app
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SECRET_KEY
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Find the publishable key in Supabase → Settings → API Keys. It commonly begins with `sb_publishable_` and is intended for browser use.

Never expose the secret/service-role key as a `NEXT_PUBLIC_` variable.

## Deployment

1. Run `supabase/v0.3-accounts.sql` once.
2. Replace/upload the v0.3 project files in the existing GitHub repo.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Netlify.
4. Confirm Supabase Authentication URL Configuration above.
5. Commit to `main`; Netlify should deploy automatically.

## Account behavior

Wish North deliberately does not force signup before useful actions.

**List owner:** can create a list immediately. If signed in, the list is saved to the account. If not, the private owner key remains in local storage; signing in later verifies that key and attaches the list.

**Gift shopper:** can claim immediately. If signed in, the claim is saved to My Gifts. If not, Wish North stores the private claim code locally and immediately offers a free account. Signing in later on that browser verifies the claim code and attaches the claim.

With Supabase email confirmation enabled, a brand-new signup may need to click the verification email before the account session exists. Existing local list/claim keys remain in the browser and attach after the confirmed account signs in.

## Security model

- The Supabase **publishable** key is used in the browser only for Supabase Auth; that key is designed to be public.
- All Wish North application tables remain locked from direct `anon` / `authenticated` access by the original schema.
- All list, item, claim, and account data access goes through Next.js server routes.
- Server routes verify the user's Supabase Auth JWT before using the server secret key for authorized database operations.
- Legacy owner keys and anonymous claim codes are random high-entropy secrets; only SHA-256 hashes are stored in the database.

## Before broad public promotion

- Add production rate limiting / bot protection.
- Add abuse reporting and an admin takedown console.
- Add Privacy Policy, Terms, cookie disclosure if applicable, and final COPPA/privacy review.
- Proxy/store retailer images instead of indefinitely hotlinking them.
- Add edit-in-place for wishes (v0.3 supports deletion and re-addition).
- Add QR/Web Share and better retailer/product normalization.
