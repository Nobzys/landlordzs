# Auth e2e suite

Runs against the local Supabase CLI stack (Inbucket/Mailpit for email), never
the hosted project. `playwright.config.ts`'s `webServer` builds and starts a
production bundle (`scripts/e2e-server.mjs`) bound to `127.0.0.1:3000`.

```
supabase start
npx playwright test
```

`auth.spec.ts` runs signup → email confirmation → login → password reset →
expired-link reuse as one `test.describe.serial` block sharing a single
browser context, since the session created at verification carries through
the rest of the flow.

## Supabase Auth URL configuration (required)

GoTrue checks every `redirect_to` it's given against `site_url` +
`additional_redirect_urls`. An unlisted redirect doesn't error — it silently
falls back to `site_url`, dropping any `?next=...` path. This breaks
password reset's `/api/auth/callback?next=/reset-password` callback (and
would break any other flow with a non-root redirect target) with nothing in
the logs to point at why.

- **Local**: `supabase/config.toml` → `[auth]` → `additional_redirect_urls`
  must include a wildcard covering the app's callback path, e.g.
  `"http://127.0.0.1:3000/**"`.
- **Hosted/production**: the equivalent setting lives in the Supabase
  dashboard under **Authentication → URL Configuration → Redirect URLs** —
  it is a separate, dashboard-managed setting not controlled by this repo.
  It must include a wildcard covering the production callback path, e.g.
  `https://<production-domain>/**` (or at minimum
  `https://<production-domain>/api/auth/callback`). Verify this matches
  before relying on password reset / email verification in production.
