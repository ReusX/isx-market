# IQWealth redesign · tracker

Identity approved 16 September 2026, from the reference at latitude.xyz.
The approved mockup is [`docs/design/direction.html`](design/direction.html);
open it in a browser — it is the answer to "what should this look like".

## The identity in one screen

| | Value | Rule |
|---|---|---|
| Page | light `#F5F2EC` (paper) · dark `#0F1218` (graphite, blue hint) | The ground. Flat, no gradient. Dark is a NEUTRAL near-black, never a coloured ground. |
| Ink | light `#1A2035` · dark `#E7E7E2` | Softened navy by day, warm off-white by night — never pure white on dark. Secondary ≈ 65 %, muted ≈ 45 %. |
| Accent | `--blue #146BFD` | Only in chart details, links, icons, focus rings and selected-state edges. Never on the main canvas or large cards; the homepage hero is the one deliberate exception. |
| Fills | primary vs selected | Warm-white / navy fill = the one **primary CTA** on a page only (e.g. «استكشف السوق»); sign-in and the logo are outlined pills. A selected range, filter, door or rail item = quiet dark-blue-grey `--sel-bg` with light text and a thin blue edge. Active rail item = quiet surface + 3px blue edge at the start. No pure white, no pure black, no glow, no heavy shadow. |
| Watermark | `IRAQSM.COM` | Bold, low-opacity, in the empty space of every chart or data panel a reader might screenshot. |
| Rising | light chip `#DCECD8`/`#1F6B45` · dark `#8FD3A8` at 14 % | Chip when there is a ground; text when not. |
| Falling | light chip `#F4DCD0`/`#A4402F` · dark `#F0A08E` at 14 % | Same. |
| Border | navy 14 % | Hairlines. **No shadows anywhere.** |
| Type | Readex Pro, one face | 200–300 display · 400 body · 500 controls. Nothing bold. No positive tracking on Arabic. Figures tabular. |
| Shape | 54 px pills · 32 px blocks · 16 px panels · 8 px chips | |
| Density | one row = one fact | Detail goes behind a click. Prefer a table to cards. |
| Shell | page shell ≤ 1920px = 260px section rail + 32px gap + flexible main (`min-width: 0`) | Top nav = product navigation (the four doors). The rail = navigation within the active section only; never repeated in the content. < 1280px: rail becomes one scrollable row above the content; < 720px: out of flow, opened via «القسم». Tables use defined column tracks, never space-between. |
| Width | **full width for information surfaces; constrained width for reading** | `.id-full` for tables/boards/dashboards (edge to edge, nav gutters) · `.id-wrap` 1180px for hubs and mixed pages · `.id-read` 72ch for articles, guides, legal, prose. |
| Theme | light + dark | Light = «ورق ناعم» (L2), dark = «غرافيت بلمحة زرقاء». Same blue hero, same pills, no shadows. Style through ROLE tokens (`--page`, `--ink`, `--border`, `--primary-bg`, `--moss`…), never primitives. `data-theme` is always stamped (stored choice, else OS). |

Tokens: `app/globals.css` (base) · `styles/design-tokens.css` (`--mv-*`, same palette).
Vocabulary: `styles/identity.css` (`.id-*` classes — build from these).
Gates: `npm run check:tokens` (parity · contrast · Arabic tracking) must pass on every commit.

## What "done" means for a page

1. Built from `.id-*` vocabulary + a small route stylesheet; nothing bold, nothing shadowed, no blue text.
2. Its old stylesheet is deleted or emptied; no `[data-theme='dark']` rules with their own literal colours remain in it — dark comes from the role tokens.
3. Arabic copy reads naturally (short sentences, no jargon), English page matches.
4. Phone width (400 px) checked; body never scrolls sideways.
5. `check:tokens`, `check:i18n`, `check:routes` green; the page-specific gate (`check:banking`, `check:charts`) where one exists.

## Foundation — DONE

- [x] Palette → `app/globals.css`, `styles/design-tokens.css` (parity + contrast gates green)
- [x] Readex Pro replaces Plex Arabic / Noto Kufi / Roboto Mono (`components/shell/Document.tsx`)
- [x] Dark theme as role-token overrides; shared `shell/ThemeToggle` in header and homepage nav; Thmanyah `@font-face` removed
- [x] `styles/identity.css` vocabulary
- [x] Mockup kept at `docs/design/direction.html`

## How a page is rebuilt (the recipe)

1. Write a NEW component under `components/site/` — never edit or import the old route component. Data libs (`lib/*`) are fine to reuse; nothing under `components/routes|shell|design|company` is.
2. Wrap it in `<SiteShell>`; inside a door, lay the page out as `<main className="id-full iq-door">` with `<DoorRail door=… items=…/>` first (sidebar on desktop, pill row on phones); assemble from `.id-*` (identity.css) plus a small `styles/<page>.css` with a fresh prefix (check it is unused: `grep -ho "\.PREFIX-[a-z]*" styles/*.css`). Class names already taken by old stylesheets include `sn-`, `sf-`, `mk-`, `gh-`, `hm-`, `mt-`, `cd-`, `st-`.
3. Strings go in the dictionaries (`lib/i18n/messages/{ar,en}`); the i18n gate rejects Arabic literals in components.
4. Point the route (`app/(ar)/…/page.tsx` and `app/(en)/en/…/page.tsx`) at the new component; add the route to `AppFrame.REBUILT` so the old frame steps aside.
5. Gates: `check:tokens`, `check:i18n` (dev server on 3300), `check:routes`; phone width; both themes. Tick the row here.

## Pages — one by one

Order is by traffic and by what other pages borrow from. Shell first because every page wears it.

| # | Route(s) | Component(s) | Stylesheet(s) to replace | Status |
|---|---|---|---|---|
| 1 | shell (nav, mobile menu, foot) | NEW `site/SiteNav` `SiteFoot` `SiteShell` (`styles/site.css`) — rebuilt pages wear this; old `shell/*` + `shell.css` are deleted when `AppFrame.REBUILT` covers every route | — | ☑ 2026-09-16 (search not yet rebuilt) |
| 2 | `/` | THE MARKET OVERVIEW (`site/MarketPage` variant `root`, server-rendered via `lib/marketServer.ts`, ISR 60s): welcome card for first visits, chart, flow, session, top 30 with a link to `/market` for the rest. **No redirect** — `/market` is the site's #1 result for «اسعار الاسهم العراقية» and keeps its own title. | `landing.css` · old `HomePage`/`home.css` kept only until /market reuses its modules | ☑ 2026-09-16 |
| 3 | `/market` (the full board, own title kept; server-rendered; `?date=` any session; listing filter incl. suspended; about + FAQ text) | NEW `site/MarketPage` (`styles/markets.css`): openers (`IndexChart` to-scale SVG, ISX60 · RSISX switch (RSISX via `/api/index/rsisx` proxy), ranges/hi-lo/crosshair · `FlowRing` foreign buy/sell ring with net in the centre, session or last-20), session block (breadth from traded companies · value · volume · trades), door rail, board (search + sector pills + one-row-one-fact table) | old `MarketBoard`/`market.css` unused, delete in sweep | ☑ 2026-09-16 foundation |
| 4 | `/c/[sym]` | NEW `site/CompanyPage` + `site/PriceChart` (`styles/company-page.css`, prefix `cmp-`): the price is the page — display weight, then a full analysis chart (candles/line/area, volume pane, MA20/50/200, OHLC crosshair, wheel-zoom + drag-pan, log/linear, fullscreen, PNG export, and drawing tools: trend/horizontal/rectangle/Fibonacci with select-delete-clear, anchored in DATA space and persisted per symbol in localStorage), share figures, returns vs ISX60, foreign flow, earnings, ownership, shareholders, collapsible about. Server-rendered via `loadCompany` with `generateStaticParams` + ISR 15 min, so `/c/[sym]` went **ƒ → ●**. Depository rows resolve through `lib/depositoryNames`, the same path /statistics uses | old `routes/CompanyDetail`/`company/*`/`company.css` unused, delete in sweep | ☑ 2026-09-16 |
| 5 | `/c/[sym]/financials` | `routes/CompanyFinancials` | `financials.css` | ☐ |
| 6 | `/companies` | NEW `site/DirectoryPage` (`styles/directory.css`): the directory — who is listed, no prices; cards with logo, names, capital, ISC market tier (`public/data/isc-tiers.json`), facts from profiles, trading status; sector/capital/A–Z order; search; status filter; ItemList markup; server-rendered ISR 1h | old `CompaniesPage` unused, delete in sweep | ☑ 2026-09-16 |
| 7 | `/screener` («رادار الأسهم») | NEW `site/ScreenerPage` (`styles/screener-page.css`, prefix `scr-`): presets write visible condition chips; filters in the URL; preset URLs carry titles + self canonicals; board-style sortable results; builder behind a disclosure; CSV; server-rendered ISR 5 min. `lib/screener` logic unchanged | old `Screener`/`screener.css` unused, delete in sweep | ☑ 2026-09-16 |
| 8 | `/heatmap` | NEW `site/HeatmapPage` (`styles/heatmap-page.css`, prefix `hm2-`): the map is the page — period pills + one seven-step scale (mint/coral, hatched = no reading), size by cap or 20-session value, sector zoom, instant hover label, click → floating detail card; server-rendered summary line. `lib/heatmap` unchanged | old `Heatmap`/`heatmap.css` unused, delete in sweep | ☑ 2026-09-16 |
| 9 | `/statistics` hub | NEW `site/StatisticsPage` (`styles/statistics-page.css`, prefix `stx-`): activity bar chart (session/week/month, 3 measures, vs previous period), sector share bars, foreign-flow and ownership doors, about text; server-rendered ISR 15 min; sub-nav pills to the three sub-pages | old `routes/Statistics`/`statistics.css` unused, delete in sweep | ☑ 2026-09-16 |
| 9a | `/statistics/foreign-flow` | NEW `site/ForeignFlowPage` (`styles/flow-page.css`, prefix `ffl-`): tab «من يتداول» — net-flow chart (sqrt bars + cumulative line, timeframes), most bought/sold, Iraqis-vs-foreigners ring with buy/sell; tab «من يدخل السوق» — depository accounts by type × nationality from `public/data/depository-accounts.json` (parser `scripts/parse_depository_accounts.py`). Daily totals feed: cron now writes `foreign_flow_daily`; `scripts/backfill-foreign-daily.ts` filled the gap | old `routes/ForeignFlow`/`foreign-flow.css` unused, delete in sweep | ☑ 2026-09-16 |
| 9b | `/statistics/ownership` («الملكية الأجنبية») | NEW `site/OwnershipPage` (`styles/ownership-page.css`, prefix `own-`): the foreign share of deposited capital stated once at the top (split bar + four figures), then the companies that carry it, largest share first — searchable, defined column tracks, a quiet bar in the percentage cell. Read on the SERVER via `loadOwnership` (ISR 1h): latest period only, paged to exhaustion, names resolved through `lib/depositoryNames`; totals from every row, table from proven rows only, coverage stated as copy | old `routes/OwnershipPage`/`depositoryUi`/`depository.css` unused, delete in sweep | ☑ 2026-09-16 |
| 9c | `/statistics/shareholders` («كبار المساهمين») | NEW `site/ShareholdersPage` (shares `styles/ownership-page.css`): largest disclosed stake as the lead, then every disclosed stake — holder, company, share. Server-rendered via `loadShareholders` (ISR 1h), one filing not a union of months. Holder names shown exactly as filed, never translated or matched; no deltas (the change field is almost all default zeros); the uniform-nationality fact stated as a fact about the filing | old `routes/ShareholdersPage` unused, delete in sweep | ☑ 2026-09-16 |
| 10 | `/banks`, `/banks/[slug]` | `routes/BanksHub` `BankProfile` | `banks.css` | ☐ |
| 11 | `/gold` `/fx` `/oil` | `routes/GoldPage` `FxPage` `FxHistory` `OilPage` | `market-tools.css` `fx-history.css` | ☐ |
| 12 | `/pulse` («نبض السوق») | NEW `site/PulsePage` (`styles/pulse-page.css`, prefix `plz-`): the VERDICT is the page — «ضعف واسع» in display weight with the two numbers that produced it and the rule behind a click — then the four readings as ONE table (each was already two numbers compared, which is what one-row-one-fact is for; they stack into blocks under 720px), the advance–decline line over net-breadth bars with a live readout, and sector breadth as a table. Server-rendered via `loadPulse` (ISR 15 min): the page previously served a crawler ZERO numbers. `lib/pulse.ts` and the verdict copy are reused unchanged — model and copy, not design | old `routes/Pulse`/`pulse.css` unused, delete in sweep | ☑ 2026-09-16 |
| 13 | `/news`, `/news/[slug]`, `/learn`, `/learn/[slug]`, `/learn/trading-from-zero`, `/research/*` | `routes/NewsClient` `LearnIndex` `LearnGuide` `article/ArticleView` `cms/*` | `news.css` `learn.css` | ☐ |
| 14 | `/portfolio` `/watchlist` `/alerts` | `routes/Portfolio` `Watchlist` + alerts page | `portfolio.css` `watchlist.css` | ☐ |
| 15 | `/login` `/signup` `/forgot-password` `/verify-email` `/auth/reset` `/profile` | `auth/*` `routes/Account` `ResetPassword` | `auth.css` `profile.css` | ☐ |
| 16 | `/about` `/contact` `/legal` `/privacy` | `routes/AboutPage` `ContactPage` `info/LegalDoc` | `info.css` | ☐ |
| 17 | `/analysis/[sym]` | inline styles in the page | — | ☐ |
| 18 | system: `Toast` `Overlay` `Primitives` | `system/*` | `system.css` | ☐ |
| 19 | sweep: delete `globals.css` legacy blocks (lines after "Design system · base + components"), drop `data-theme` attribute, delete `public/fonts/*` | — | — | ☐ |

Every English route (`/en/...`) shares the component with its Arabic twin, so a row is done for both languages at once.

## HANDOFF · 2026-09-16 (second session — moving to another account)

**State:** branch `redesign/latitude`, working tree clean, everything committed, **NOTHING DEPLOYED** and nothing should be. Dev server: `preview_start` name `isx-dev`, port 3300. Note the port may already be held by another session's server — if `preview_start` refuses, just use the running one.

**Rows done:** 1 shell · 2 `/` · 3 `/market` · 4 `/c/[sym]` · 6 `/companies` · 7 `/screener` · 8 `/heatmap` · 9 `/statistics` · 9a foreign-flow · 9b ownership · 9c shareholders · 12 `/pulse`. Ten of nineteen.

**Next: row 5 `/c/[sym]/financials`.** It is the last route under `/c` on the old frame. Three things are waiting on it:
  · `AppFrame.NOT_YET` exists *solely* to hold it there while `'/c'` is a REBUILT prefix — delete that constant when the row lands.
  · It is still `ƒ` (dynamic). Row 4 showed the fix: `generateStaticParams` + `revalidate`.
  · `/api/chart/[sym]` has no other caller once this page stops using it; it can go in the sweep.

### What this session changed beyond the tracker rows

**The «!» pattern.** A page's standfirst is not printed under the h1 any more. `site/PageTitle` puts it behind a quiet «!» beside the title, and it works for section headings too (`as="h2"`). `site/AboutSection` does the same for «عن هذه الأرقام» on every rebuilt page.

⚠ **Both use native `<details>` / CSS collapse and NEVER conditional rendering.** The copy must stay in the server-rendered HTML — it is real page text that these pages rank for. A `title` attribute or hover-injected text would take it out of the page. Do not "simplify" either component into `{open && <p>…</p>}`.

**A cost pass, because the numbers said something different from what I assumed.** Vercel Hobby was at 91% of Fluid Active CPU while bandwidth sat at 5.7% and invocations at 13% — so payload size was never the problem; server renders were. Fixes landed:
  · `/` regenerated every 60s running the heaviest loader on the site (≈2,880 heavy renders/day) to catch data that changes once per session → 900s.
  · `/c/[sym]` was fully dynamic across 104 companies × 2 locales, and pulled `ownership_monthly` (2000 rows) + `major_shareholders` (4000 rows) into the BROWSER to find the handful belonging to one company → prerendered, ~200 rows, server-side.
  · Vercel Speed Insights removed at 98% of its own 10K/month quota; nobody read it. `@vercel/analytics` stays (12%).

**Remaining perf items, none urgent** (measure before doing more — Active CPU is a 30-day rolling window and the above needs days to show):
  · `/screener` is `ƒ` only because `generateMetadata` reads `?preset=`; the page itself takes no searchParams.
  · `/` pages the whole `daily_index` from the BROWSER on every visit (4 round trips). The fix is a CDN-cached `/api/index/isx60` mirroring `/api/index/rsisx`'s headers. Supabase egress is at 35%, so this is headroom, not a fire.
  · On-demand revalidation from the ingest cron is NOT a three-line change: `revalidatePath` clears the route cache but not the Data Cache, and `lib/marketServer.ts`'s Supabase fetches carry their own `next: { revalidate: 60 }`. Done properly it means tagging those fetches and using `revalidateTag`.

### Gotchas this session paid for — do not rediscover them

  · **`buildReturns` returns FRACTIONS, not percentages.** Printing one straight to `toFixed(1)` renders a −15.7% year as «−0.2%».
  · **`companies.json.sec` is a 3-letter code (`TEL`, `BANK`); `SECTOR_LABELS` is keyed on `company_metrics.sector` (`Telecom`, `Banks`).** Passing the raw code through prints «TEL» on the page. `SEC_CODE` in `lib/marketServer.ts` maps it.
  · **`LiveStock.vol` is the traded VALUE in IQD** (legacy name) and `shares_traded` is the share count. Reading them the other way round prints dinars as shares.
  · **`noPrior` is not zero.** A company with no valid previous close has an UNKNOWN change, not a flat one. Same rule in `lib/pulse.ts`'s four-state breadth.
  · **The depository filings are OCR'd and do not all resolve.** The August table spells Bank of Baghdad «مرصف بغداد»; `resolveName` reports `no-candidate` and BBOB's page shows no ownership block. That is correct — a false negative beats attaching a filing to the wrong company. Resolve through `lib/depositoryNames` (not `companyView`'s simpler matcher) so this page and /statistics cannot disagree.
  · **localStorage persistence needs a hydration gate.** `PriceChart` writes drawings per symbol; the first version's save effect ran on mount with the empty initial state and wiped stored drawings on every page load. See `hydratedKey`.
  · **Chart drawing anchors are stored in DATA space** (bar index + price), never pixels — that is what keeps a trend line on its two sessions through zoom, pan, range change and log scale.
  · **`check:routes` tracks rendering MODE per route** in `scripts/route-markers.json`. An intended change (e.g. `ƒ → ●`) needs `npm run check:routes:update` and the diff should be only the lines you meant.

### The chart

`site/PriceChart` is a full analysis surface now: candles / line / area, volume pane, MA20/50/200, OHLC crosshair, wheel-zoom + drag-pan, log/linear, fullscreen, PNG export, and drawing tools (trend, horizontal, rectangle, Fibonacci) with select / delete / clear, persisted per symbol. Tools are an icon rail ON the plot; the price is a tag on the axis.

⚠ The rail is **physically left in both locales** on purpose: the time axis runs oldest → newest left-to-right whatever the page direction.

**Deliberately NOT built:** indicator sub-panes (RSI, MACD), multi-symbol comparison, and moving a shape after drawing it (select and delete, not drag handles). The user knows; do not pretend otherwise.

**Open question the user has not answered:** whether the OHLC legend and session date should move from the header row onto the plot, overlaid top-left, the way TradingView does it.

**Small open items (older):** old `/companies` layout still wraps the directory (harmless; sweep); `/screener` search keywords keep the old spelling «مستكشف» on purpose; 124 older monthly PDFs unreadable by the accounts parser; a few companies have an empty `ar` in `companies.json` (BNOR, HPAL, INCP, SIGT, BZII) so Arabic pages show their English names — a data gap, not a bug.

**Names & rules the user locked:** the identity table above is the contract. Also memory `iqwealth-redesign-vocab` if it is available ("the board" = جدول الشركات, «رادار الأسهم», «دليل الشركات», «الملكية الأجنبية», palettes, fill rules).

## Follow-ups (data, not design)

- **Individuals vs institutions** — RESOLVED as «من يدخل السوق» on the foreign-flow page. Finding: `depository_monthly` was Table 28 (shares *deposited in the month*, correct as parsed, just misnamed); the real type split is Table 29 (accounts opened in the month, 2025-11 →) and Table 45 (accounts held at month end, older reports). No public source splits *trading* by investor type. Remaining: parse the 124 older reports (other layouts / scans).

## Log

- 2026-09-16 · Foundation landed on branch `redesign/latitude`.
- 2026-09-16 · New site shell (`components/site/*`) and `/market` foundation on it; `AppFrame.REBUILT` is the migration ledger.
- 2026-09-16 · Dark mode added as role-token overrides (globals.css + design-tokens.css); un-rebuilt pages still show their OLD charcoal dark rules until their row is done.
- 2026-09-16 · Company chart became a real analysis surface: candles, volume, moving averages, OHLC crosshair, zoom/pan, log scale, and drawing tools (trend, horizontal, rectangle, Fibonacci). Anchors are stored in DATA space — bar index + price, never pixels — which is what keeps a trend line on its two sessions through zoom, pan and range changes. A first version of the localStorage persistence wiped every drawing on page load (save effect ran on mount with the empty initial state); gated on `hydratedKey` now. No indicator sub-panes, no multi-symbol compare, no moving a shape after drawing it.
- 2026-09-16 · `/pulse` rebuilt (row 12) and moved to the server (`loadPulse`); it had been serving a crawler headings over empty boxes on a page titled «الأسهم الصاعدة والهابطة». Shared `site/AboutSection` collapses the «عن هذه الأرقام» block on every rebuilt page (native `<details>`, so the prose stays in the markup), and `site/PageTitle` now carries section headings too — a section's methodology note lives behind its own «!» instead of sitting under the heading as grey text.
- 2026-09-16 · Cost pass after reading real usage: Vercel Active CPU was at 91% of the Hobby budget while bandwidth sat at 5.7%, so payload was never the problem — server renders were. `/` regenerated every 60s running the heaviest loader on the site; now 900s (15× fewer). Speed Insights removed at 98% of its own quota. Full audit and the remaining items are in the log below.
- 2026-09-16 · Depository pages (`/statistics/ownership`, `/statistics/shareholders`) rebuilt on the site shell and moved off the client: `loadOwnership` / `loadShareholders` in `lib/marketServer.ts` replace the `useOwnership` / `useShareholders` hooks, so both filings are in the HTML. `/statistics` is now a `REBUILT` prefix and covers its three sub-pages.
- 2026-09-16 · Homepage: full-viewport blue opener with the character Earth faced at Iraq (canvas; `lib/landmask.ts`), Iraq's cells lit, ISX60/USD·IQD/oil/gold pinned over Iraq and sector clusters of real tickers pinned round the globe, one lit at a time and the four doors — الأسواق · البنوك والتمويل · الاقتصاد العراقي · تعلّم. Renders bare (no sidebar). Pages that do not exist yet (deposits, loans, cards, CBI, budget) show «قريباً».
