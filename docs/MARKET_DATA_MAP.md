# Market Movement (`/market`) — route data map

Audited **16 August 2026** against production, before any UI work — §2 of the
Phase 2 brief makes this a gate.

---

## 1 · Route and metadata

| | |
|---|---|
| production route | `/market` |
| rendering | prerendered `○` — a client component under a static shell |
| `title` | «اسعار الاسهم العراقية اليوم · جميع شركات بورصة العراق» |
| `canonical` | `https://iraqsm.com/market`, via `seoAlternates('/market')` |
| `openGraph.url` | `absUrl('/market')` — agrees with canonical |
| structured data | `Breadcrumbs` + `Freshness` in `app/market/layout.tsx` |
| robots | indexable, no override |

All of it is already correct and routed through the recovered `lib/seo.ts`.
**Nothing in the metadata needs changing**; it is preserved as-is.

---

## 2 · Data sources

Identical to the homepage — no new source, no new query:

| what | source |
|---|---|
| prices, change, volume, value, trades | `fetchLive()` → `daily_prices`, latest session vs prior |
| company identity, sector, logo, shares | `fetchCompanyMeta()` → `public/data/companies.json` |
| 7-session sparkline | `fetchSparklines()` → `daily_prices.close` |
| watchlist filter | `AppContext` (localStorage + `profiles` JSONB) |

`fetchLive()` resolves the latest `daily_prices` date and the session
immediately before it. That is the route's canonical session, and it is
self-contained: `/market` never reads `daily_index`, so it cannot disagree with
a table it does not consult.

---

## 3 · Columns available

Company · ticker · sector · last price · change % · volume (shares) · traded
value (IQD) · trades · market cap (derived `price × shares`) · 7-session
sparkline · last-trade date for carried-forward rows.

`trades` is present in `daily_prices` and carried on `Company.deals`. Every
column the approved design asks for is supported; **nothing needs inventing and
nothing needs dropping.**

---

## 4 · Current behaviour

| aspect | behaviour |
|---|---|
| row count | **all** listed companies with a price — no pagination, no slice (~104) |
| default sort | market cap, descending |
| sortable | mcap · price · change · volume — click toggles direction |
| filters | sector · text query · watchlist-only · listing status (active/suspended) · movement (all/up/down/flat) |
| search | matches `sym`, `ar`, `en`; seeded from `?q=` |
| company link | `/c/[sym]` ✅ |
| carried-forward rows | `stale` flag, last-trade date shown; excluded from movement filters |
| suspended | `isSuspended()` after `STALE_DAYS`; own tab; market cap hidden |

---

## 5 · ⚠ The four-state regression — TWO sites

Phase 1 corrected the shared layer so a company with no valid prior close
carries `noPrior` instead of being reported as flat. **`/market` predates that
and still reads `pct === 0`**, so it reproduces the bug the homepage fixed:

| # | site | what it does |
|---|---|---|
| 1 | `app/market/page.tsx:129` | `unchanged: traded.filter(c => c.pct === 0).length` — the summary counts no-prior-close rows as «ثابت» |
| 2 | `app/market/page.tsx:98` | `movement === 'flat' ? c.pct === 0` — the «ثابت» FILTER returns them too |

Site 2 is the worse of the two: a filter that claims to show unchanged
companies and silently includes companies whose change nobody knows.

§5 and §17 require both to consume the new signal, and §31 requires the counts
to reconcile. Both are corrected in this phase.

---

## 6 · Verified against source

Session **2026-08-16** vs prior **2026-08-13**:

| | count |
|---|---|
| advancing | 11 |
| declining | 10 |
| unchanged (true) | 21 |
| **no prior close** | **4** |
| traded | 46 |
| listed with a price | 104 |

Matches `daily_index.traded_companies` = 46 exactly, and matches the corrected
homepage figures for the same session.

---

## 7 · Nothing missing

No metric the approved design requires is absent from the production source.
No substitution was needed and none was made.
