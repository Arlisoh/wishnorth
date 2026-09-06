# Wish North v0.3 upgrade — do these in order

## 1. Supabase SQL
Open Supabase → SQL Editor → New query.
Paste and run `supabase/v0.3-accounts.sql`.

## 2. Supabase Auth URL
Open Supabase → Authentication → URL Configuration.
Set Site URL to:
https://wishnorth.netlify.app

Add Redirect URL:
https://wishnorth.netlify.app/**

Later also add:
https://wish.metricnorth.ai/**

## 3. Netlify environment variables
Keep your existing variables. Add:

NEXT_PUBLIC_SUPABASE_URL
Value: the same Supabase Project URL you already used for SUPABASE_URL

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
Value: Supabase → Settings → API Keys → Publishable key (often begins sb_publishable_)

Never put your secret/service-role key in a NEXT_PUBLIC variable.

## 4. GitHub
Upload the contents of the v0.3 upgrade patch into the ROOT of the same existing repo and commit to main.
Allow matching files to replace/update the old versions.

Netlify should automatically build the new commit.

## 5. Test
A. Sign up at /account and confirm the email if Supabase asks.
B. Sign in. Your previously-created browser list should appear under My Lists.
C. Open the list and delete a test wish.
D. Open the shared link in a private/incognito window and claim a gift.
E. After claiming, choose Create free account. After sign-in, the gift should appear under My Gifts.
