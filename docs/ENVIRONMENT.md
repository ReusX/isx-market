# Environment variables

Names and behaviour only. **No value belongs in this repository** — it is
public. Secrets live in the Vercel project environment, in GitHub secrets for
the workflows, or in `.env.local`, which is git-ignored.

`npm run check:secrets` scans every tracked file for credential-shaped literals
and fails the build on one. It exists because a real WordPress application
password sat in `scripts/news_pipeline.py` from `17db009` until it was replaced
with a placeholder; see **Known exposure** below.

## Public app · required

| Variable | Used by | If missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | every client read | the market data layer cannot load |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | every client read | same |

Both are public by design: they are shipped to the browser and every table they
reach is protected by RLS.

## Server · required

| Variable | Used by | If missing |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts` admin client, `/api/chart`, `/api/analysis`, `/api/cron/daily-prices` | those routes fail |

Never `NEXT_PUBLIC_`. It bypasses RLS and must never reach the browser.

## CMS · required in production for editorial content

| Variable | Used by | If missing |
|---|---|---|
| `WP_API_URL` | `lib/cms.ts` | **production**: `/news` shows the CMS-unavailable state and `/news/[slug]` 404s. **development**: falls back to the Hostinger preview host |

The fallback is deliberately local-only. It was once unconditional, which made a
temporary preview host into a silent production dependency — the live site would
have served every article from it with nothing saying so. Filings, market data
and every other route are independent of this variable and stay up.

## Publishing pipeline · not needed to serve the site

| Variable | Used by | If missing |
|---|---|---|
| `WP_USERNAME` | `scripts/news_pipeline.py`, `/api/wp-publish` | the pipeline exits with `Set WP_USERNAME and WP_APP_PASSWORD` |
| `WP_APP_PASSWORD` | same | same |
| `PIPELINE_SECRET` | `/api/wp-publish` | the route refuses every request — fail-closed, by design |

## Cron

| Variable | Used by | If missing |
|---|---|---|
| `CRON_SECRET` | `/api/cron/daily-prices` | the daily price job cannot authenticate |

## Optional

| Variable | Used by | If missing |
|---|---|---|
| `GROQ_API_KEY` | `/api/analysis/[sym]` | that one Arabic-only route degrades; nothing else changes |
| `ANTHROPIC_API_KEY` | `scripts/news_pipeline.py` only — not the app | the pipeline skips the Arabic rewrite |
| `PROXY_URL` | pipeline, to route around a Wordfence IP block | direct WP calls, which work from most IPs |

## Known exposure

A WordPress application password was committed in the setup docstring of
`scripts/news_pipeline.py`, introduced in `17db009` and present on `main`.

The literal has been replaced with a placeholder in current source. **That does
not undo the exposure** — the value remains in git history and must be assumed
compromised. Rotating it in WordPress is what actually invalidates it, and that
is a manual step nobody but the operator can take:

1. WP Dashboard → Users → your account → Application Passwords
2. revoke the exposed password
3. create a new one
4. store the new value only as `WP_APP_PASSWORD` in the production environment
   and in GitHub secrets

Purging it from git history (`git filter-repo` or BFG, then a force-push and a
re-clone for every collaborator) is a separate, optional maintenance task. It is
worth doing only after rotation, because rotation is what removes the risk.
