# Final route inventory

Generated from the running repo on `implement/iqwealth-redesign` after the
pre-deploy cleanup, not from the migration plan. Rendering modes are the real
production build's (`npm run check:routes`, 49 routes); indexability and
canonicals were read from the rendered HTML of every route.

`main` remains untouched at `d2f60cc`.

**Legend** — Mode: `○` prerendered static · `ƒ` server-rendered on demand.
Status: **migrated** = transplanted from the approved design · **frozen** =
approved and closed in an earlier batch · **pre-redesign** = still on the old
`terminal-shell` chrome · **system** = framework surface.

---

## Public market surfaces

| Route | Purpose | Status | Mode | Indexable | Canonical | Data source | Auth | Known limitation |
|---|---|---|---|---|---|---|---|---|
| `/` | Session summary, index chart, movers, sectors | migrated · frozen | ○ `revalidate 60` | ✅ | self | Supabase `daily_index`, `company_metrics`, `daily_prices` | none | — |
| `/market` | Full board, all listed companies | migrated · frozen | ○ | ✅ | self | Supabase `company_metrics` | none | — |
| `/screener` | Filter/sort companies on stored metrics | migrated · frozen | ○ | ✅ | self | Supabase `company_metrics` | none | Stale 2010–2013 quotes are guarded on `days_since_trade`, not hidden |
| `/heatmap` | Sector treemap | migrated · frozen | ○ `revalidate 300` | ✅ | self | Supabase `company_metrics` | none | — |
| `/pulse` | Session breadth, four-state | migrated · frozen | ○ `revalidate 300` | ✅ | self | Supabase `daily_prices`, `breadth_daily`, `daily_index` | none | Historical breadth comes from `breadth_daily`, which has **no `noPrior` category** — the series is labelled with its own three-state definition |
| `/statistics` | Market size, activity, concentration, valuation | migrated · frozen | ○ `revalidate 300` | ✅ | self | Supabase session series | none | — |
| `/statistics/foreign-flow` | Daily and monthly foreign flow | migrated · frozen | ○ | ✅ | self | Supabase `foreign_flow_company_daily`, monthly tables | none | — |
| `/statistics/ownership` | Full ownership structure | **pre-redesign** | ○ | ✅ | self | Supabase `ownership_monthly` | none | **No approved design exists** — linked from two migrated pages, so the old chrome is a visible seam |
| `/statistics/shareholders` | Major shareholders | **pre-redesign** | ○ | ✅ | self | Supabase `major_shareholders` | none | Same |
| `/c/[sym]` | Company detail — price, chart, fundamentals, ownership | migrated · frozen | ƒ | ✅ | self | Supabase + `/api/chart/[sym]` | none | Fundamentals **fail closed** for 13 guarded tickers |
| `/c/[sym]/financials` | Full financial statements | migrated · frozen | ƒ | ✅ | **parent `/c/[sym]`** | `financial_facts_public`, `_ratios_public`, `_reports_public` | none | Inherits the parent's title and canonical — see the SEO note below. Quarterly columns are labelled exactly as filed and do not sum to the annual |
| `/companies` | Directory of listed companies by sector | **pre-redesign** | ○ | ✅ | self | `public/data/companies.json` + Supabase | none | Not in the sidebar (global search replaces it); still the 301 target for `/c/MTMT` and `/c/MTRA` |
| `/charts` | Full-screen index and company charts | **pre-redesign** | ○ | ✅ | self | Supabase `daily_prices`, `daily_index` | none | Reached from the homepage index chart only |
| `/banks` | Listed banks | **pre-redesign** | ○ | ✅ | self | `public/data/companies.json` | none | **Zero inbound links.** Retirement decision pending |

## Content

| Route | Purpose | Status | Mode | Indexable | Canonical | Data source | Auth | Known limitation |
|---|---|---|---|---|---|---|---|---|
| `/news` | Editorial feed + filing disclosures | migrated · frozen | ○ `revalidate 300` | ✅ | self | WordPress cat 2 **and** Supabase `financial_reports_public`, loaded independently | none | The filing index is **281 of ~5,749** indexed reports; the page states its own window |
| `/news/[slug]` | Article detail | **migrated (Batch D)** | ƒ `revalidate 300` | ✅ | self | WordPress `getPost` | none | No CMS author name is stored, so no byline is printed |
| `/learn` | Educational library | **migrated (Batch D)** | ○ `revalidate 300` | ✅ | self | WordPress cat 4 | none | **Category 4 holds zero posts** — honest empty state by product decision |
| `/learn/[slug]` | Lesson detail | **migrated (Batch D)** | ƒ `revalidate 300` | ✅ | self | WordPress `getPost` | none | Resolves to 404 for every slug while the category is empty |
| `/learn/trading-from-zero` | The one real beginner guide | **migrated (Batch D)** | ○ | ✅ | self | Hand-written, `lib/tradingFromZero.ts` | none | Not a CMS post and never was |
| `/research` | Research section | **pre-redesign** | ○ `revalidate 300` | ✅ | self | WordPress cat 3 | none | **One** published article; zero inbound links |
| `/research/[slug]` | Research article | **pre-redesign** | ƒ `revalidate 300` | ✅ | self | WordPress `getPost` | none | The last consumer of `components/cms/ArticlePage` |
| `/analysis` | Per-company generated analysis index | **pre-redesign** | ○ | ✅ | self | Supabase + `/api/analysis/[sym]` (Anthropic) | none | Zero inbound links; the hub is in the sitemap but **none of its children are** |
| `/analysis/[sym]` | Generated analysis for one company | **pre-redesign** | ƒ | ✅ | self | Same | none | Machine-written commentary about a named security; costs API spend per render |

## Market tools

| Route | Purpose | Status | Mode | Indexable | Canonical | Data source | Auth | Known limitation |
|---|---|---|---|---|---|---|---|---|
| `/fx` | USD/IQD parallel and official | migrated · frozen | ○ `revalidate 10800` | ✅ | self | Alsumaria via `r.jina.ai`, `rates_cache`; `CBI_OFFICIAL_RATE` constant | none | **No history is stored** — one closing observation per day, so no daily change |
| `/gold` | Gold prices | migrated · frozen | ○ `revalidate 10800` | ✅ | self | iraqgoldprice.com, `rates_cache` | none | Same |
| `/oil` | Oil prices, Basrah crude | migrated · frozen | ○ `revalidate 10800` | ✅ | self | oilprice.com, `rates_cache` | none | Same |

## Personal and account

All are `noindex, nofollow` and self-canonical; none appears in the sitemap.

| Route | Purpose | Status | Mode | Data source | Auth | Known limitation |
|---|---|---|---|---|---|---|
| `/portfolio` | Holdings, cost basis, allocation | migrated · frozen | ○ | localStorage + `profiles.portfolio` JSONB | works signed-out; syncs when signed in | No realised P&L, ledger, curve, cash or benchmark — nothing stores them. Unvalued positions are excluded, not zeroed |
| `/watchlist` | Followed companies | migrated · frozen | ○ | localStorage + `profiles.watchlist` | same | One flat list; multiple named lists are not supported |
| `/profile` | Account identity and settings | migrated · frozen | ○ | `profiles` | required | **No account deletion.** Six real capabilities, and one honest line about what does not exist |
| `/alerts` | Price alerts | **pre-redesign** | ○ | localStorage + `profiles.price_alerts` | works signed-out | **Intentional compatibility route** — removed from every navigation surface, kept so existing users can reach saved alerts. `noindex, follow`, never in the sitemap |

## Authentication

All `noindex, nofollow`. `/login`, `/signup`, `/verify-email` and
`/forgot-password` render **outside** the market sidebar, matching the approved
full-page auth composition.

| Route | Purpose | Status | Mode | Data source | Known limitation |
|---|---|---|---|---|---|
| `/login` | Sign in | migrated · frozen | ○ | Supabase Auth `signInWithPassword` | `?next=` handoff deliberately deferred |
| `/signup` | Create an account | migrated · frozen | ○ | `signUp` + `profiles.upsert` | Email + password only; no OAuth, OTP or MFA |
| `/verify-email` | Resend confirmation | migrated · frozen | ○ | `auth.resend` | Cooldown enforced client-side |
| `/forgot-password` | Request a reset | migrated · frozen | ○ | `resetPasswordForEmail` | Reports the same outcome whether or not the address exists, on purpose |
| `/auth/reset` | Set a new password | migrated · frozen | ○ | `updateUser` | Self-canonical; PKCE/session race handled |
| `/auth/callback` | PKCE / session exchange | migrated · frozen | ○ | `exchangeCodeForSession` | **No canonical** — a transient handoff, not a page |

## Information

| Route | Purpose | Status | Mode | Indexable | Data source | Known limitation |
|---|---|---|---|---|---|---|
| `/about` | Who built the platform and why | **migrated (Batch D)** | ○ | ✅ | Static, in-repo | The «where the data comes from» section is a **deliberately empty slot** — the product publishes no methodology |
| `/contact` | Contact channels | **migrated (Batch D)** | ○ | ✅ | `lib/infoData.ts` | **No form and no endpoint.** Six topic links are `mailto:` with a prefilled subject |
| `/privacy` | Privacy policy | **migrated (Batch D)** | ○ | ✅ | `lib/legalContent.ts` | Counsel markers RESOLVED 2026-08-25; retention is stated as criteria, not fixed periods, because the product enforces no timer |
| `/legal` | Terms + disclaimer | **migrated (Batch D)** | ○ | ✅ | `lib/legalContent.ts` | Counsel markers RESOLVED 2026-08-25; no indemnity clause, and no specific court named |

## System and infrastructure

| Route | Purpose | Status | Mode | Indexable | Notes |
|---|---|---|---|---|---|
| `/_not-found` (404) | Missing page | **migrated (Batch D)** | ○ | ❌ noindex | Real 404 status; **no canonical of its own**; renders inside the app frame so the "where else" links survive |
| `error.tsx` (500) | Route-level failure | **migrated (Batch D)** | — | — | Receives the `Error` and deliberately drops it; `reset` wired to the real boundary |
| `global-error.tsx` | Root-layout failure | **migrated (Batch D)** | — | — | Self-contained, inline styles, no dependency on the shell that just failed |
| `/robots.txt` | Crawl rules | frozen | ○ | — | Disallows `/api/` only. `/profile` is **not** disallowed on purpose — blocking it would stop Google reading its noindex |
| `/sitemap.xml` | 181 URLs | frozen | ○ `revalidate 3600` | — | 23 static + 104 company + 52 news + 1 research + 1 learn. No duplicates, no noindex route, no `/en` |
| `/opengraph-image` | Share card | frozen | ƒ | — | — |
| `/api/chart/[sym]` | Price history | frozen | ƒ | — | Blocked in robots |
| `/api/analysis/[sym]` | Generated analysis | pre-redesign | ƒ | — | Anthropic API |
| `/api/cron/daily-prices` | Ingest | frozen | ƒ | — | `CRON_SECRET` |
| `/api/wp-publish` | CMS publish hook | frozen | ƒ | — | — |
| `/dev/foundation` | Design proof sheet | dev only | ○ | ❌ noindex | **No canonical**; not part of the product |

---

## Counts

| | |
|---|---|
| Routes in the build | **49** |
| Static `○` | 38 |
| Dynamic `ƒ` | 11 |
| Indexable HTML routes | 30 |
| `noindex` HTML routes | 12, including the 404 |
| Non-HTML (robots, sitemap, OG image, 4 API routes) | 7 |
| In the sitemap | 181 URLs across 23 static routes |
| Migrated to the approved design | 30 routes, plus 404 / 500 / global-error |
| Still pre-redesign | 10 — `/companies`, `/banks`, `/charts`, `/research`, `/research/[slug]`, `/analysis`, `/analysis/[sym]`, `/statistics/ownership`, `/statistics/shareholders`, `/alerts` |

## Two SEO notes worth a decision

1. **`/c/[sym]/financials` inherits the parent's metadata.** It is a
   `'use client'` page with no `layout.tsx`, so it takes `/c/[sym]`'s title
   («سعر سهم … اليوم») and canonical. Consolidating the canonical is consistent
   with the sitemap, which deliberately omits the sub-page to avoid thin-page
   signals — but the *title* describes a price page, not a statements page. This
   is the same class of defect just fixed on `/about`, and it needs the same
   editorial decision: index it separately with its own title, or keep the
   consolidation. Not changed here, because it is an SEO decision rather than a
   cleanup.

2. **`/analysis` is in the sitemap but `/analysis/[sym]` is not.** The section
   advertises an entry point to pages crawlers are never told about.
