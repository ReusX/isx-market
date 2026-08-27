# الإحصائيات (`/statistics`) — completion report

Branch `implement/iqwealth-redesign`, 19 August 2026. `main` untouched at
`d2f60cc`; the reference app's working tree is clean.

Answers the 24-point gate in the resume brief. Every number was read from the
live REST endpoint or off the rendered DOM.

---

## 1 · Reference files and CSS used

| reference file | what came from it |
|---|---|
| `app/statistics/Statistics.tsx` | the composition — head, one overview rail, sticky tab bar, six modes with one on screen at a time |
| `app/statistics/statsData.ts` | the period set, the metric set, the grain rule, the mean-per-session definition, the median-led valuation rule |
| `app/globals.css` `.stw-*` block | the whole layer, **copied programmatically** rather than retyped so no value could drift |

Three adaptations, and only three: `.iq-dark`/`.iq-light` on the page root
became this application's single `data-theme` system; the three font variables
gained this repo's fallback stacks; the reference's page-root token overrides
moved to the same scope. `.stw-*` collided with nothing — zero matches across
`globals.css`, `styles/*.css`, every route stylesheet and every component.

**One block deliberately not ported:** the reference carries a compatibility
shim for *its* frozen detail routes (`.stats-v2`, `.st-head`, `.st-switch`,
`.st-chart*`). This product's detail routes emit none of those names, so
porting it would have shipped ~100 lines of CSS for selectors that never appear
in this DOM.

## 2 · Final supported modules

Six, all shipped. Two are narrowed, and every narrowing removes a claim rather
than substituting one.

| mode | state |
|---|---|
| **النشاط** activity | full — `daily_index` from the rebase, three metrics, seven periods |
| **بنية السوق** structure | Option A — market cap by sector over the listed roster |
| **القطاعات** sectors | **narrowed** — activity only; no sector market cap |
| **الشركات** companies | ranked from the same snapshot, not from `company_caps_monthly` |
| **التقييم** valuation | TTM P/E distribution, median-led, coverage stated |
| **التدفق الأجنبي** foreign | summary and entry point; detail route not migrated |

## 3 · Exact period per module

Four cadences, four labels, never merged:

| module | label on the page |
|---|---|
| activity | «تتبع الفترة المحددة · 2025-07-28 — 2026-08-19 · 250 جلسة» |
| sectors | «شهر واحد — لا يتبع الفترة المحددة · تموز 2026» |
| structure · companies · valuation | «لقطة حالية — لا تتبع الفترة المحددة · آخر إغلاق 19 آب 2026» |
| foreign | «نافذة خاصة بهذا القسم — لا تتبع الفترة المحددة · 2025-08-20 — 2026-08-19» |

That last one was a **bug on the first pass**: the page-level scope line printed
the index window while the foreign module printed its own, which is exactly the
one-synchronised-dataset impression the brief forbids. Foreign now owns its
scope and the two agree.

No «اليوم», «أمس» or «مباشر» appears anywhere.

## 4 · Canonical sector alias map

Explicit, in `lib/statistics.ts`. No fuzzy matching, no heuristics; an unlisted
name is surfaced as unmapped rather than guessed.

| source name | canonical | kind |
|---|---|---|
| `Banks` | banks | primary |
| `Banking` | banks | **duplicate** |
| `Telecommunication` | telecom | primary |
| `Telecom` | telecom | rename |
| `Industry` | industry | primary |
| `Tourism&Hotels` | tourism | primary |
| `Hotels` | tourism | rename |
| `Hotel` | tourism | **duplicate** |
| `Insurance` | insurance | primary |
| `Agriculture` | agriculture | primary |
| `Agricultur` | agriculture | **duplicate** |
| `Investment` | investment | primary |
| `Financial services` | investment | rename |
| `Service` | services | primary |
| `Services` | services | rename |
| `Money Transfer` | transfer | primary |
| `Unknown` | unknown | **duplicate** |

A duplicate is dropped **only when genuinely inert** (zero value, volume, trades
and traded companies). If one ever arrives carrying activity the map's
assumption has broken, so it folds in instead — the defect then surfaces as a
changed sector count rather than as silent loss.

## 5 · Sector activity reconciliation

Month **2026-07**. 10 raw rows → 1 inert duplicate dropped (`Banking`) → 0
unmapped → **8 canonical sectors**.

| | normalized | raw activity | equal |
|---|---|---|---|
| value | 104,942,121,234 | 104,942,121,234 | ✅ |
| volume | 161,141,409,719 | 161,141,409,719 | ✅ |
| trades | 24,203 | 24,203 | ✅ |

**No activity lost.** Reported as 8 sectors, not forced to 10 — `Banking` was a
duplicate and `Service`/`Services` are one sector. `listed_companies` is null on
every row and renders `—`.

## 6 · Market-cap universe definition

**Option A.** There is no listing-status field anywhere — not in
`company_metrics`, not in `companies.json` — so "currently listed" cannot be
read off a column, and the brief forbids inferring it from trading recency
alone. It did not have to be inferred:

- `companies.json` is a curated roster of **104** and reconciles to the official
  `daily_index.listed_companies` of **103** within one company;
- the **20** tickers `company_metrics` carries that the roster omits all last
  traded between **2010 and 2019** — every one 7.5+ years dead;
- every one of the 104 has a real published close.

Definition: `last published close × issued shares`, over the curated listed
roster, at the resolved session read from the data.

## 7 · Included / excluded counts

| | |
|---|---|
| listed roster | **104** |
| official listed count | **103** |
| included | **99** |
| excluded | **5** — `BERI`, `IMCI`, `SILT`, `BTIB`, `ABAP`, all for a missing share count |
| resolved session | **2026-08-19**, read from the data, never hard-coded |

A missing share count is an exclusion, never a zero.

## 8 · Stale-price count

**19 of 99** companies are priced on a close older than 60 days, accounting for
**9.7%** of the total (2.72T of 28.20T). The other 80 carry a close inside 60
days and 90.35% of the value.

Disclosed on the module in both places it matters: a sentence under the
concentration figures, and an «إغلاق قديم» tag beside the price in the company
table. A stale close is described as *a real published price, not a current
one* — never as a current price.

## 9 · Sector total vs company total

Company total and sector sum agree **to the dinar** at **28.20T**; the snapshot
sets `reconciles: true` and the sector counts sum to 99, matching the included
count. The check runs before anything renders.

## 10 · `sector_monthly.market_cap` is not rendered

Confirmed. The column is not even present on the `SectorMonthRow` type, so it
cannot be read by accident. The sectors module states on the page why: *«لا
تُعرض قيمة سوقية للقطاعات لأن المصدر الشهري الوحيد يحتسبها مرتين»*.

## 11 · `company_caps_monthly` is not rendered

Confirmed. The table is not imported by any file in this phase.

## 12 · Dividend statistics are omitted

Confirmed. `financial_ratios_public` holds **6** `dividend_yield` rows in total.
No dividend module, and no empty panel standing in for one.

## 13 · Foreign-flow consistency

The same reconciled model the homepage and the detail route already share —
`foreign_flow_company_daily`, buy and sell summed per session, net as
`buy − sell`. No second definition. The CTA is `/statistics/foreign-flow`, only
the header link is clickable, and the detail route was not migrated.

Its fetch is bounded, so the module states the **229** stored flow sessions it
covers rather than implying the full 28,374-row history, and points at the
detail page for the complete record.

## 14 · Daily-index gap handling

History from the **2015-03-05** rebase: 2,640 stored sessions. Verified on the
full window with the trades metric:

- coverage reads **2,581 of 2,640** — the 59 nulls leave the divisor
- **2 monthly buckets draw as gaps**, not zero columns
- **2 more are flagged partly covered** and their tooltip says how many sessions
  were missing
- the footnote states «59 جلسة بلا قياس لهذا المقياس، وتظهر فجوات في الرسم لا أصفاراً»

Nothing is written as zero and nothing is interpolated.

## 15 · Mobile

375×812: zero page-level horizontal overflow, sticky workspace bar, tabs wrap to
two rows, period pills stay on one, and the chart is **240px** rather than the
**113px** a scaling viewBox collapsed to. Module order and stacking follow the
reference. All 16 controls carry a ≥44px target.

## 16 · Light / dark

Ported from the reference's own theme block; light is not inferred from dark.
The workspace darkens its muted ink and deepens the semantic pair a step,
because this page prints more small grey metadata per square inch than any
other route — the reference makes the same adjustment. Verified across 4
viewports × 2 themes: overflow 0, sticky bar, one `main`, one `h1` in all eight.

## 17 · Legacy CSS removed

**28 rules, 146 lines**, across twelve class families proved to have no
remaining `.tsx` user: `statistics-page`, `statistics-hero`,
`statistics-hero-grid`, `statistics-masonry`, `statistics-heading`,
`statistics-label`, `statistics-empty`, `statistics-gauge`,
`statistics-positive`, `stat-icon`, `stat-label`, `stat-soon`.

Kept because a live consumer holds them: `statistics-card` and
`statistics-card-heading` (`_ui.tsx`, imported by all three subroutes),
`statistics-detail-page` (the subroutes), `statistics-breadcrumb` (`_ui.tsx`
and `/c/[sym]`), `statistics-text-link` (`/pulse`), `stat-panel` (`_ui.tsx`),
and `statistics-secondary`/`-headline`/`-subline` (`StatCards.tsx`).

Two near-misses recorded: a substring grep made `stat-grid`/`stat-tile` look
like statistics CSS — they are `company-stat-*` in markup and `detail-stat-*`
in the stylesheet, and neither was touched. And the rule-at-a-time matcher that
saved the screener cleanup was used again rather than cutting between banners.

`/statistics`, all three detail subroutes, `/pulse`, `/c/[sym]`, `/market`,
`/screener` and `/` re-checked at 200, and `/statistics/foreign-flow` verified
visually intact.

## 18 · Visual comparison

Six screenshots at identical viewports accompany this report. The pages read as
the same product: same head, same one-strip rail with a lead figure and four
supporting figures behind thin rules, same sticky tab bar with six modes and
seven periods, same scope line, same metric segment, same single framed chart,
same under-stats row.

Measured differences and their causes:

| | reference | here |
|---|---|---|
| chart height | canvas, JS-sized | **320 / 280 / 240** explicit |
| value axis | right gutter | **right gutter** (fixed this pass) |
| time axis | oldest → newest, left to right | **same** |
| rail | 1 lead + 4 figures | **same** |
| tabs / periods | 6 / 7 | **6 / 7** |
| figures | synthetic series | real — 828.04B vs 118.60B |

The axis positions were both wrong on the first pass: logical CSS properties
mirrored the overlays under RTL while the SVG coordinate space is not mirrored,
which put the value axis opposite its own gridlines and reversed time. Both are
now pinned to physical coordinates.

## 19 · Source-vs-DOM verification

The 1Y window, re-derived straight from `daily_index` and compared with the
rendered page — **all five identical**:

| | source | DOM |
|---|---|---|
| period total | 828.04B | 828.04B |
| mean session | 3.31B | 3.31B |
| median session | 1.21B | 1.21B |
| mean traded companies | 46 | 46 |
| coverage | 250 | 250 of 250 |

Also verified: window bounds 2025-07-28 → 2026-08-19; 2,640 sessions since the
rebase; 59 `total_trades` nulls, none of them inside the 1Y window; sector
reconciliation as in §5; cap reconciliation as in §9.

## 20 · Performance

`/statistics` stays prerendered `○` at **13.5 kB / 175 kB** first load. The
chart is ~120 SVG rects, not a charting library — §14 permits one only if
necessary and a column series does not make it necessary. The daily series is
paged rather than truncated at PostgREST's 1,000-row cap (three requests, once)
and the sector and flow queries are independent so one failing does not take the
others. Company metrics are fetched once and reused by structure, companies and
valuation rather than three times.

## 21 · Checks

```
npx tsc --noEmit                        clean
npx eslint app/statistics lib/statistics.ts   clean
npm run check:tokens                    16 tokens/theme in parity · 22 contrast pairs · 0 tracking reaching Arabic
npm run check:routes                    44 routes, no rendering-mode regressions
isolated production build               /statistics ○ 13.5 kB
/statistics 200 · /statistics/foreign-flow 200 and visually intact
canonical + og:url                      https://iraqsm.com/statistics
1440 / 1280 / 1000 / 375 × light+dark    overflowX 0 in all 8
keyboard                                16 focusables, 0 removed from tab order, 0 unlabelled
accessibility                           1 main, 1 h1, aria-current tabs, aria-pressed periods,
                                        scoped table headers, chart aria-label + figcaption,
                                        no control under 44px
main untouched                          d2f60cc
reference app untouched                 working tree clean
no /en · no duplicate shell · no removed route linked   confirmed
```

`/alerts` still exists, unchanged and unlinked, per the standing owner decision
in `docs/ALERTS_REMOVAL_MAP.md`. This work adds no link to it.

## 22 · Commits

| | |
|---|---|
| `54be2fb` | data audit — the gate |
| `dd8b67b` | adapters + reconciliation gates |
| `fb76898` | `.stw-*` CSS port |
| `d291a62` | market-cap universe decision |
| `e6576ea` | page wired to the adapters |
| `ca69e3f` | legacy CSS cleanup |
| `a783464` | metadata + 44px targets |
| this file | verification and docs |

## 23 · Pipeline defects retained as backlog

All five from the audit, unchanged and unfixed here:

1. `sector_monthly.sector` holds 17 names for ~10 sectors, including concurrent
   zero-activity duplicates that double-count market cap.
2. `company_caps_monthly` is corrupt for 2026-05 and 2026-06 — totals of 97.81
   and 65.68 where trillions belong, with 24 and 26 nulls.
3. `sector_monthly.listed_companies` is null on every recent row.
4. `market_cap_sector` does not exist while `load_to_supabase_v2.py` writes to it.
5. `monthly_prices` lags `sector_monthly` by two months (latest 2026-05).

Plus, carried from Phase 3: 54 of 124 `company_metrics.name_ar` values are bare
row indices. This route resolves names through the same `usableName` guard, so
it is unaffected, but any surface reading that column directly still shows the
debris.

## 24 · New limitation found this phase

**There is no listing-status field anywhere in the product.** The roster
reconciles to the official count of 103 *in aggregate*, but with no status
column it is impossible to say which company accounts for the delta of one, or
to prove any individual name's listing status. The market-cap universe is
trustworthy as a total and is **not** a per-company listing assertion.

The practical consequence is the stale-price disclosure in §8: 19 companies
cannot be told apart as "suspended but listed" versus "quietly delisted", so
they are included at their last real published close and labelled, rather than
dropped on a guess.

---

Stopping here. `/statistics/foreign-flow` is not started, and no later route
has been touched.
