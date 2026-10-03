# Ephyra Auth Setup

## Frontend

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` plus either
`VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`. These are public
client keys; never put a Supabase service-role/secret key in a `VITE_` variable.
Set the same build-time variables in the Vercel project and redeploy.

Supabase JS is initialized once in `src/lib/supabase.ts`. It owns the persisted
browser session, local storage, URL callback detection, and access-token refresh.
The app does not clear browser storage or maintain a second session store.

## Supabase Dashboard

Add the local and production site origins to **Authentication > URL
Configuration > Redirect URLs**. The app uses the current site origin for email
confirmation and password recovery callbacks. Keep email confirmation enabled
or disabled according to the product policy; when it is enabled, a sign-up with
no returned session shows an email-confirmation message instead of opening the
dashboard.

## Backend

This repository contains no Python/Vercel API function. If the existing
deployment has protected Python endpoints, keep their Supabase URL and public
anon/publishable key in server-side Vercel environment variables, validate the
incoming `Authorization: Bearer <access_token>` with Supabase Auth, and derive
the user ID from that validated identity. Do not use a frontend-supplied user
ID to authorize data access. Keep the service-role key backend-only and retain
the existing RLS policies.