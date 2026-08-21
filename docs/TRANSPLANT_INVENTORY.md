# Transplant Inventory — Direct Reskin Mode

Built **21 August 2026** on `implement/iqwealth-redesign` (`601d86f`).
`main` verified untouched at `d2f60cc`. Reference app `/Users/amed/iqwealth-design`
verified clean at `d4a0d33`.

This replaces the per-route forensic workflow. The approved design app is now
treated as the presentation-layer source code to transplant.

---

## 0 · The zip is not a new source

`/Users/amed/Desktop/codex/IQWealth-complete-design.zip` (144 files, dated
10 Aug 2026) was extracted and diffed against the reference app.

It is an **older snapshot of the same project**, not a newer or parallel one:

- The reference app has 36 page routes; the zip has 26.
- Routes present only in the reference: `about`, `contact`, `learn`,
  `learn/[slug]`, `learn/trading-from-zero`, `legal`, `privacy`, `profile`,
  `system`, `system/boom`, `tools`, `fx`, `companies/[ticker]/financials`,
  `auth/callback`, `auth/reset`.
- The zip predates the data-file split: it has no `*Data.ts` modules
  (`pulseData.ts`, `heatmapData.ts`, `boardData.ts`, `screenerData.ts`,
  `flowData.ts`, `statsData.ts`, `newsData.ts`, `companyData.ts`, …).
- The zip still carries superseded components that the reference has replaced:
  `StockScreener.tsx` → `ScreenerWorkspace.tsx`, `MarketMovement.tsx` →
  `MarketBoard.tsx`, `GoldPage.tsx` → `GoldPrices.tsx`, `OilPage.tsx` →
  `OilPrices.tsx`, `FxPage.tsx` → `FxRates.tsx`, `AuthExperience.tsx` →
  `AuthScreens.tsx`.
- The five routes already migrated and frozen match the **reference** files,
  not the zip files.

**Decision: the zip is ignored. `/Users/amed/iqwealth-design` remains the single
visual source of truth.**

---

## 1 · Approved vs. stale inside the reference app

Not every file in the design app is approved design. The redesign introduced the
`iq-page` / `--mv-*` system; the pre-redesign chrome was `terminal-shell app-page`.
Grepping both markers splits the tree cleanly:

**Approved (`iq-page`) — these are the transplant sources**

`About.tsx` · `AuthShell.tsx` + `AuthScreens.tsx` · `CompanyDetailPage.tsx` ·
`FinancialsPage.tsx` · `ChartEngine.tsx` · `Contact.tsx` · `FxRates.tsx` ·
`GoldPrices.tsx` · `HeatMap.tsx` · `LegalDoc.tsx` · `Learn.tsx` · `Article.tsx` ·
`Path.tsx` · `MarketBoard.tsx` · `NewsFeed.tsx` · `OilPrices.tsx` ·
`Portfolio.tsx` · `Profile.tsx` · `Pulse.tsx` · `ScreenerWorkspace.tsx` ·
`Statistics.tsx` · `ForeignFlowDetail.tsx` · `StatePage.tsx` · `Watchlist.tsx`

**Stale (`terminal-shell`) — must NOT be ported**

`app/companies/page.tsx` · `app/news/[slug]/page.tsx` · `PulsePage.tsx`
(superseded by `Pulse.tsx`) · `StatisticsDetailShell.tsx` +
`OwnershipDetail.tsx` + `ShareholdersDetail.tsx` · `PersonalWorkspace.tsx`
(the `/alerts` stub)

---

## 2 · CSS block map

The design ships one `app/globals.css` of 13,372 lines. Route-specific blocks are
contiguous and were located by class family. These are the blocks to copy
wholesale (§8 of the brief).

| Family | Route | `iqwealth-design/app/globals.css` lines | Target in `isx-market` |
|---|---|---|---|
| `.mv-*` | shared design primitives | 5844–6654 + strays | already ported (tokens/`system.css`) |
| `.sc-*` | screener | 6677–7083 | ✅ `app/screener/screener.css` |
| `.cd-*` | company detail | 7110–7697 | `app/c/[sym]/company.css` (new) |
| `.fn-*` | financials | 8214–8608 | `app/c/[sym]/financials/financials.css` (new) |
| `.hm-*` | heat map | 8714–9010 | ✅ `app/heatmap/heatmap.css` (renamed `.hx-*`) |
| `.pl-*` | pulse | 9057–9459 | `app/pulse/pulse.css` (new) |
| `.st-*` | statistics | 9680–10416 | ✅ `app/statistics/statistics.css` |
| `.ff-*` | foreign flow | 10137–10380 | ✅ `.../foreign-flow.css` |
| `.nw-*` | news | 10404–10586 | `app/news/news.css` (new) |
| `.pf-*` | portfolio | 10603–10953 | `app/portfolio/portfolio.css` (new) |
| `.wl-*` | watchlist | 10969–11107 | `app/watchlist/watchlist.css` (new) |
| `.mt-* .fx-* .gd-* .ol-*` | market tools (fx+gold+oil, interleaved) | 11133–11560 | `styles/market-tools.css` (new, one block) |
| `.ac-*` | account / profile | 11579–11869 | `app/profile/profile.css` (new) |
| `.au-*` | auth | 11887–12172 | `styles/auth.css` (new) |
| `.ln-*` | learn + article + path | 12184–12622 | `app/learn/learn.css` (new) |
| `.in-*` | about/contact/privacy/legal | 12636–13001 | `styles/info.css` (new) |
| `.sp-*` | state pages (404/500/error) | 13293–13365 | `styles/system.css` (append) |
| `.dt-*` | dither tool | 11194–11195 | DESIGN-ONLY, not ported |

**Collision check.** `.hm-*` in the design is the heat map; in production `.hm-*`
is already the **homepage**. That rename (`hm-` → `hx-`) is done. No other design
family collides with a production family: production owns `.hm-` `.mk-` `.sc-`
`.stw-` `.ffw-` `.hx-`; the design families above are all unused in production
today, with one exception: `.fx-hero` and `.fx-quote-grid`
(`app/globals.css:2338`) belong to the FX page that Batch B replaces outright, so
that is a same-route replacement rather than a cross-route collision. Everything
else that looked like a hit was an already-namespaced sub-part — `.ffw-pl-*`,
`.ffw-cd-*`, `.hx-cd-*`, `.ffw-fn-help` — not the bare family.

---

## 3 · The transplant inventory

Action legend: **DP** `DIRECT PORT` · **DP+A** `DIRECT PORT + REAL DATA ADAPTER` ·
**KL+V** `KEEP PRODUCTION LOGIC + REPLACE VIEW` · **SKIP** `SKIP / REMOVED ROUTE` ·
**SDW** `NEEDS SPECIAL DATA WORK`

### Already frozen — do not redo (§19)

| Production route | Design route | Action |
|---|---|---|
| `/` | `/` | ✅ done |
| `/market` | `/market` | ✅ done |
| `/screener` | `/screener` | ✅ done |
| `/statistics` | `/statistics` | ✅ done |
| `/statistics/foreign-flow` | same | ✅ done |
| `/heatmap` | `/heatmap` | ✅ done |

### Batch A — public market surfaces

| Production route | Design route | Design component(s) | Design CSS | Real data loader | Action |
|---|---|---|---|---|---|
| `/pulse` | `/pulse` | `Pulse.tsx`, `PulseBreadthBar.tsx`, `pulseData.ts` | 9057–9459 `.pl-*` | `app/pulse/page.tsx` — `daily_index`, `breadth_daily`, `company_metrics`, `daily_prices`; `lib/market` | **DP+A** |
| `/news` | `/news` | `NewsFeed.tsx`, `newsData.ts` | 10404–10586 `.nw-*` | `lib/cms` `getPosts` + `financial_reports_public` | ✅ done |
| `/news/[slug]` | *(stale)* | — see blocker B1 | reuse `.ln-article-*` | `lib/cms` `getPost`, `lib/seo` | **SDW** |
| `/c/[sym]` | `/companies/[ticker]` | `CompanyDetailPage.tsx`, `companyData.ts`, `ChartEngine.tsx`, `Range52Indicator.tsx`, `SectorChip.tsx` | 7110–7697 `.cd-*` | `app/c/[sym]/page.tsx` — `company_metrics`, `/api/chart/[sym]`, `components/company/*` | **KL+V** |
| `/c/[sym]/financials` | `/companies/[ticker]/financials` | `FinancialsPage.tsx`, `financialsData.ts` | 8214–8608 `.fn-*` | `components/Financials.tsx`, `lib/fundamentals` (`financial_facts_public`, `_ratios_public`, `_reports_public`) | **KL+V** |

Path rename in both company rows: production `/c/[sym]` wins. The design path
`/companies/[ticker]` is a design-app artefact and must not ship.

### Batch B — market utilities

| Production route | Design route | Design component(s) | Design CSS | Real data loader | Action |
|---|---|---|---|---|---|
| `/fx` | `/fx` | `FxRates.tsx`, `fxData.ts`, `MarketToolTabs.tsx`, `FlagBadge.tsx` | 11133–11560 (shared block) | `app/fx/FxClient.tsx`, `lib/rates` (`rates_cache`, Alsumaria via `r.jina.ai`), `lib/fxCopy` | **DP+A** |
| `/gold` | `/gold` | `GoldPrices.tsx`, `goldData.ts` | same block | `app/gold/GoldClient.tsx`, `lib/rates` (iraqgoldprice.com) | **DP+A** |
| `/oil` | `/oil` | `OilPrices.tsx`, `oilData.ts` | same block | `app/oil/OilClient.tsx`, `lib/rates` (oilprice.com) | **DP+A** |
| — | `/exchange-rate` | — | — | — | **SKIP** (design-only alias for `/fx`; never a production URL) |

The three tools share one CSS block and the `.mt-*` tool-tab chrome, so they are
one commit, not three.

### Batch C — personal / account surfaces

| Production route | Design route | Design component(s) | Design CSS | Real data loader | Action |
|---|---|---|---|---|---|
| `/portfolio` | `/portfolio` | `Portfolio.tsx`, `portfolioData.ts` | 10603–10953 `.pf-*` | `lib/portfolio` (`profiles.portfolio` JSONB + localStorage), `TickerPicker`, `CompanyLogo` | **KL+V** |
| `/watchlist` | `/watchlists` | `Watchlist.tsx`, `watchlistData.ts` | 10969–11107 `.wl-*` | `app/watchlist/WatchlistClient.tsx`, `profiles.watchlist` | **KL+V** (rename: production singular wins) |
| `/profile` | `/profile` | `Profile.tsx`, `profileData.ts` | 11579–11869 `.ac-*` | `app/profile/page.tsx`, `lib/supabase/client`, `profiles` | **KL+V** |
| `/login` | `/login` | `AuthScreens.tsx`, `AuthShell.tsx`, `authData.ts` | 11887–12172 `.au-*` | Supabase Auth — production has only `components/auth/AuthModal.tsx` | **SDW** |
| `/signup` | `/signup` | same | same | Supabase Auth + `profiles.upsert` | **SDW** |
| `/forgot-password` | `/forgot-password` | same | same | `resetPasswordForEmail` | **SDW** |
| `/verify-email` | `/verify-email` | same | same | `auth.resend` — called nowhere today | **SDW** |
| `/auth/reset` | `/auth/reset` | same | same | `updateUser` — called nowhere today | **SDW** |
| `/auth/callback` | `/auth/callback` | same | same | `exchangeCodeForSession` — does not exist | **SDW** |

### Batch D — content / static surfaces

| Production route | Design route | Design component(s) | Design CSS | Real data loader | Action |
|---|---|---|---|---|---|
| `/learn` | `/learn` | `Learn.tsx`, `learnData.ts` | 12184–12622 `.ln-*` | `lib/cms` WP category 4 | **DP+A** |
| `/learn/[slug]` | same | `Article.tsx` | same | `lib/cms` `getPost` | **DP+A** |
| `/learn/trading-from-zero` | same | `Path.tsx` | same | hand-written static | **DP** |
| `/about` | `/about` | `About.tsx`, `InfoChrome.tsx`, `infoData.ts` | 12636–13001 `.in-*` | none | **DP** |
| `/contact` | `/contact` | `Contact.tsx` | same | none | **DP** |
| `/privacy` | `/privacy` | `LegalDoc.tsx`, `legalContent.ts` | same | none | **DP** (copy stays production's; 10 counsel markers unresolved) |
| `/legal` | `/legal` | same | same | none | **DP** |
| 404 / 500 / `error` | `/system` | `StatePage.tsx`, `dataStates.tsx`, `Overlay.tsx`, `Toast.tsx`, `MobileNav.tsx`, `SiteFooter.tsx` | 13293–13365 `.sp-*` | none | **DP** |

### Not migrated

| Route | Reason |
|---|---|
| `/companies` | Design version is stale `terminal-shell`. Not redesigned. Retain production — it is the 301 target for `/c/MTMT` and `/c/MTRA`. |
| `/statistics/ownership` | Designed as a shell only; no approved detail design exists. |
| `/statistics/shareholders` | Same. |
| `/banks`, `/charts`, `/research`, `/research/[slug]`, `/analysis`, `/analysis/[sym]`, `/alerts` | Removed from the redesign, still live in production. Redirect targets are a separate SEO decision, not this migration's. |
| `/system`, `/system/boom`, `/tools` | Design-mode only. Never ship. |
| `/dev/foundation` | Production design-mode page. Unchanged. |

---

## 4 · Real blockers (§12)

**B1 · `/news/[slug]` has no approved design.** The design app's article page is
the stale `terminal-shell` version with a mock `DitherGraphic`. The only approved
long-form reading surface is `learn/Article.tsx` (`.ln-article-*`), which is the
same shape: WP body, derived TOC, related list. *Proposed resolution — reuse the
`.ln-article-*` chrome for news articles rather than shipping the stale page.*
Solvable in-flight; recorded here because it is a composition decision, not a
copy.

**B1a · `/news/[slug]` left unchanged, as instructed.** The reference has no
approved article page — only the stale `terminal-shell` one — so the production
route still renders `components/cms/ArticlePage`. It now sits under a
transplanted index, which is a visible seam. The `.ln-article-*` chrome from
`learn/Article.tsx` is the approved surface of that shape and is the proposed
resolution when Batch D ports Learn.

**B1b · The filing index is only partly public.** `financial_reports_public`
returns 281 rows against a project record of ~5,749 indexed reports, because the
view gates on extraction having run. The public feed therefore covers 281
documents across 77 tickers, and its newest `source_added_date` is 2026-06-21 —
two months behind the market data. `/news` states that window when the reader
selects إفصاحات and claims nothing beyond it. A second public view over the
INDEX rather than the extracted facts would close the gap; it is a view
definition, not a pipeline. **Open.**

**B1c · The CMS host is down.** `paleturquoise-deer-610016.hostingersite.com`
returns 403 to every request and `cms.iraqsm.com` does not resolve, so `/news`,
`/learn` and `/research` all render zero WordPress posts. Pre-existing, not
introduced here. `/news` degrades honestly because its two streams load
independently; `/learn` and `/research` still render an empty grid. **Open, and
outside this migration.**

**B2 · Auth is six net-new production routes.** No `/login`, `/signup`,
`/forgot-password`, `/verify-email`, `/auth/callback` exists today; production has
one modal. Three Supabase calls the design assumes (`exchangeCodeForSession`,
`auth.resend`, `updateUser`) are called nowhere in the codebase. `/auth/reset` is
**P0** — password-reset mail currently lands on `/profile`, which has no form.
This is real backend work, not a reskin, and is the one item in the plan that is
genuinely `SDW`.

**B3 · `/pulse` breadth source conflict (carried from the Phase 7 audit).**
`breadth_daily` and a live four-state computation disagree for 2026-08-20:
stored 8 / 15 / 17 vs live 7 up / 13 down / 13 flat / **7 no-prior-close**. The
cause is now proven, not suspected: `breadth_daily` compares each company against
**its own previous traded close**, not against the previous session's close.
Reconstructing with `company_metrics.prev_close` reproduces the stored row
exactly — 8 / 15 / 17, `up_volume` 224,607,641, `down_volume` 154,226,373, all
four figures matching to the unit. So `breadth_daily` is internally consistent and
not corrupt; it simply answers a different question and therefore has **no
`noPrior` category** — the seven companies with no comparable prior session close
are absorbed into `unchanged`. Established truth rule (§13) says `noPrior` is not
unchanged, so the Pulse adapter computes the four-state breadth live from
`daily_prices` for the current session and labels the historical series, which can
only come from `breadth_daily`, with its own three-state definition.

---

## 5 · Order of work

1. **Batch A** — Pulse, News, Company Detail, Financials.
2. **Batch B** — FX, Gold, Oil (one commit).
3. **Batch C** — Portfolio, Watchlist, Profile; auth split out as its own piece.
4. **Batch D** — Learn, static, system states.
5. **Cleanup pass** — legacy CSS, dead `DataTable`, archive remnants (deferred
   per §16/§17; running list kept in `docs/CLEANUP_LIST.md`).

Report after each batch, not after each route.
