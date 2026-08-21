# Phase 6 — `/heatmap` completion report

Branch `implement/iqwealth-redesign`. `main` verified untouched at `d2f60cc`.
Reference app at `/Users/amed/iqwealth-design` verified clean.

---

## 1 · Production route

`/heatmap` — `app/heatmap/page.tsx` (static shell) over `HeatmapClient.tsx`,
with the existing `layout.tsx` metadata. Prerendered `○`, **7.52 kB / 171 kB**
first load. Down from the shipped 325-line page's footprint, with more on it.

## 2 · Reference files and CSS used

Read directly, both apps running side by side (reference `:4400`,
implementation `:3300`):

* `app/heatmap/HeatMap.tsx` (373 lines)
* `app/heatmap/heatmapData.ts` (183)
* `app/globals.css` — the route's own block plus the `mv-search`, `mv-note`,
  `mv-dash` and `cd-ticker` rules it renders, extracted by balanced-block
  matching into `app/heatmap/heatmap.css`.

## 3 · Source tables and files

| Source | Role |
|---|---|
| `company_metrics` (124 rows) | the map: sector, six period closes, `days_since_trade` |
| `/data/companies.json` (104) | issued shares, curated name, logo |
| `daily_prices` / `latest_trade` via `lib/market::fetchLive` | session value, volume, trades for the panel |
| `daily_index` | canonical session and `traded_companies`, for reconciliation |

The adapter is **`lib/screener.ts`** — `PERIODS`, `periodChange`,
`STALE_DAYS`, `SECTOR_LABELS`, `toRow` — with `lib/heatmap.ts` adding only the
universe rule, the sector rollup, the treemap, the bands and the search
normalisation. `/heatmap` and `/screener` cannot disagree about a company's
cap, sector or change.

## 4 · Canonical session

**2026-08-20** — `daily_index` latest, 40 traded, 103 listed.

The map is deliberately **not** presented as a snapshot of that session,
because it is not one: `company_metrics.last_close` is each company's own most
recent close. The page prints the split rather than implying uniformity —
«40 من 80 شركة تداولت في جلسة 20 آب 2026؛ البقية بآخر إغلاق منشور لها — 47%
من المساحة». The 40 reconciles exactly with `daily_index.traded_companies`.

## 5 · Company universe

```
universe = market cap computable (last_close > 0 ∧ issued shares known)
         ∧ days_since_trade known ∧ ≤ 60
```

| | |
|---|---|
| `company_metrics` rows | 124 |
| **Included** | **80**, total **25.329T IQD** |
| Excluded — no computable market cap | **25** |
| Excluded — price older than 60 days | **19** |
| Excluded — last-trade date unknown | 0 (today) |

Both exclusion lists are enumerated in `docs/HEATMAP_DATA_MAP.md` §5 and their
counts are printed on the page. A missing share count is never an
invisible zero-area tile.

This is a **current-roster map, not a traded-company map**, and the page keeps
the two apart: the roster count and the traded count sit side by side in the
meta rail, each labelled, and both re-scope when you drill into a sector
(«الشركات 29 · تداولت في الجلسة 11»).

## 6 · Area-sizing metric

**Market capitalisation**, `last_close × issued shares` — the same
company-level definition `/screener` and `/statistics` use. Not called the
official total ISX market cap: this universe is 80 companies and 25.33T, while
`/statistics` shows 28.20T over 99, because the heatmap excludes stale-priced
names rather than labelling them.

Verified monotonic: rendered tile area share against source market-cap share,
all eight sectors, agreeing to within 0.03pp (the 1px tile gap):

| Sector | source share | rendered share |
|---|---|---|
| الاتصالات | 51.60% | 51.33% |
| المصارف | 37.33% | 37.13% |
| الصناعة | 6.23% | 6.20% |
| الفنادق والسياحة | 2.85% | 2.83% |
| الخدمات | 0.82% | 0.81% |
| الزراعة | 0.59% | 0.58% |
| التأمين | 0.59% | 0.58% |
| الاستثمار المالي | 0.01% | 0.01% |

Squarified treemap (Bruls, Huizing & van Wijk) in a 0–100 unit box. No
negative or zero areas (weights ≤ 0 are filtered before layout), deterministic
descending order, and resize re-runs no layout at all — the percentages are
unchanged and only the label-density step re-evaluates. No visualisation
dependency added.

## 7 · Colour metric and thresholds

**% change over the selected period**, in seven discrete bands scaled by that
period's own cap (`r = pct / cap`, edges at 0.06 / 0.28 / 0.62 of the cap).
Caps: 1d 3%, 1w 6%, 1m 12%, 3m 20%, ytd 40%, 52w 60% — the shipped page's own
idea, kept, and printed under the legend.

At 1d the legend reads «−2%+ · −1…−2% · −0.2…−1% · ±0.2% · +0.2…+1% ·
+1…+2% · +2%+ · لا قراءة», computed from the same constants `bandOf` uses, so
the legend cannot drift from the map. Colour is never alone: every tile with
room carries a signed figure and an arrow, and every tile carries both in its
`title` and `aria-label`.

The shipped page mixed a continuous intensity toward a base colour; the port
uses the reference's seven bands and its exact hexes in both themes.

## 8 · Sector mapping

`company_metrics.sector` with `lib/screener::SECTOR_LABELS`. A clean ten-key
vocabulary with none of `sector_monthly`'s duplicates, so the Phase 4 alias
table is not used here.

* **0 unmapped keys** across the 80.
* **0 disagreements** with `companies.json`'s `sec` field.
* `Other` and `Money Transfer` exist in the table; no member survives the
  universe filter. If one ever does it renders under its own label — there is
  no fuzzy matching in UI code.

## 9 · Included / excluded counts

Printed on the page, verified against source: 80 included, 25 + 19 excluded,
40 traded in the session, 47% of area on an older close. Drill-down counts
reconcile with rendered tiles: المصارف shows 29 tiles for 29 companies.

## 10 · Zero and noPrior handling

| State | Treatment |
|---|---|
| measured `0.00%` | neutral band `0`, real figure printed |
| no reference close | hatched tile, `data-band="na"`, «لا قراءة» in its own legend entry, `—` in tooltip and panel |
| no market cap | absent from the map, counted in the coverage line |
| session figures for a company that did not trade | `—`, with the date of its last actual trade named |

Current data: **0** companies with no reading at any period, and **44 of 80**
in band 0 on the day (41 measured at exactly 0.00%, 3 more inside ±0.18%).
The «لا قراءة» state has no occupants today and is still implemented — the
columns are nullable, 44 companies are excluded upstream of it, and the shipped
page's middle-dot `·` for unavailable is replaced with the product-wide `—`.

The live layer's `noPrior` is a different quantity — it describes the session,
not the company's own reference close — and is honoured where it applies, in
the panel's session figures.

## 11 · Tooltip and panel fields

Tile `title`: name · ticker · signed % (or «لا قراءة لهذه الفترة») · last price.
Sector `title` adds the company count, the sector cap and any missing count.

Panel: last price, market cap, session traded value, volume, trades, the
period change, sector and ticker — then a line naming the session those
figures belong to, or the date of the company's last actual trade. Nothing
fabricated; `company_metrics` has no value/volume/trades column, so those come
from the live layer that `/market` and the homepage already use.

Price is formatted with two decimals. The compact magnitude formatter rounds a
3.88-dinar quote to «4» — right for a market cap, wrong for a price.

## 12 · Filters and search

Only what the reference has: six periods, a breadcrumb, the legend as a
band-highlight control, and a search that **highlights rather than filters** —
removing tiles would change the geometry, and the geometry is the message.
Verified: searching «بغداد» inside المصارف leaves 29 tiles rendered, 1 lit and
28 dimmed. Clicking band 0 lights 17 and dims 12, matching the band
distribution. Search matches ticker, English name and Arabic name with the
alef/ya/ta-marbuta folding `lib/market` uses.

No sector filter, no size-metric switcher, no export. This is not a screener.

## 13 · Accessibility strategy

1 `<main>`, 1 `<h1>`, **no canvas** — the map is real DOM buttons, so no
companion structure is needed. 0 unlabelled buttons. Labelled `role="group"`
on the period strip and the legend bands; `<nav aria-label>` on the
breadcrumb; `role="dialog"` with a name on the panel. Every one of the 29
company tiles carries both an `aria-label` and a `title` with the name,
ticker and signed change, at every label-density step including `none`.
Direction is never colour-only. Company links go to **`/c/[sym]`**.

## 14 · Touch-target verification

Hit-tested with `elementsFromPoint` — not read off computed styles — at 1440,
1280, 768 and 375 in both themes.

**15 of 15 non-tile controls at ≥44×44 in all eight combinations.** Four fixes,
each on the axis that actually failed: the period pills (42 wide) and legend
swatches (43, and 34 on mobile) take the pixels into their own box because
they sit 2px apart and an overlay would overlap a neighbour; the scroll tracks
get block padding only below 720px, where `overflow-x: auto` actually clips a
pseudo-element; and the search input carries the height itself, because a
border-box 44 on its label left the focusable element at 42.

**Treemap tiles are the documented exception**, and §19 names it: a tile's size
IS the datum, so growing a small tile would misstate a market cap, and an
invisible 44px area over a 52×17 tile would overlap its neighbours — the thing
§19 forbids. 1 of 8 sector tiles and 10 of 29 company tiles fall below 44px.
The accessible alternative is the composition's own: every tile is a focusable
button in DOM order with a full label, reachable by keyboard, screen reader
and search without aiming at it.

## 15 · Mobile

At 375: the meta rail wraps full width, the period strip scrolls inside
itself, the search goes full width, the field is `clamp(360px, 62vh, 620px)` =
503px, the selection panel becomes a fixed bottom sheet fully inside the
viewport, and the legend scrolls with its scale line hidden — all the
reference's own ≤720 rules. **Zero page-level horizontal overflow** at every
viewport in both themes.

The coverage line is the one row the reference does not have. It is kept on
mobile rather than hidden — hiding a disclosure on the smaller screen is the
wrong economy — but tightened to 4 lines / 76px.

## 16 · Light / dark

Matched against the running reference in both, not inferred from one. All
seven band hexes plus the hatch, in both palettes, are the reference's own.
Verified: no overflow, identical field height and identical control geometry
in both themes at four viewports.

## 17 · Legacy CSS removed

**47 rules, 273 lines**, across 13 selector families —  `heatmap-page`,
`heatmap-topbar`, `heatmap-period`, `heatmap-context-row`,
`heatmap-breadcrumb`, `heatmap-legend`, `heatmap-tile` and its two children,
`full-heatmap-heading`, `full-heatmap-card`, `full-market-heatmap`,
`page-footnote` — plus the four `--heatmap-tile-ink` declarations left
referencing nothing. Each proved to have zero `.tsx` consumers first.

Cut rule-at-a-time with a matcher that refuses any rule whose selector list
mixes a doomed class with a live one — the Phase 3 lesson.

**Kept:** `seg-control` and `seg-btn` (still rendered by `/statistics`,
`StatCards` and the auth modal). `.sector-grid` also has no consumer left but
is not heatmap CSS, and this phase does not sweep by resemblance.

Re-checked after: `/`, `/heatmap`, `/market`, `/screener`, `/statistics`,
`/statistics/foreign-flow`, `/statistics/ownership`, `/statistics/shareholders`,
`/pulse`, `/companies`, `/c/[sym]`, `/charts` — all 200.

## 18 · Visual comparison

Matched captures at identical viewports: desktop dark, desktop light, 375
mobile. Measured at 1440×900, reference vs implementation:

| | Reference | Implementation |
|---|---|---|
| head | 76px | 76px |
| controls | 45px | 46px |
| coverage line | — | 38px (this page only) |
| field | 632px | 584px |
| legend | 43px | 44px |

The field yields exactly the 48px the coverage line takes, so the legend stays
above the fold at 900px as it does in the reference. Rectangle proportions
differ from the reference's mock data, as expected — the surrounding design,
the label hierarchy, the surfaces and the interaction model match.

## 19 · Source → DOM verification

All eight sectors, every field:

| Sector | src count | src cap-weighted % | src band | DOM title | DOM band |
|---|---|---|---|---|---|
| الاتصالات | 2 | −0.86% | −2 | «الاتصالات · −0.86% · 13.07T IQD · 2 شركة» | −2 |
| المصارف | 29 | −1.92% | −3 | «المصارف · −1.92% · 9.45T IQD · 29 شركة» | −3 |
| الصناعة | 19 | −0.79% | −1 | «الصناعة · −0.79% · 1.58T IQD · 19 شركة» | −1 |
| الفنادق والسياحة | 10 | −0.68% | −1 | «… −0.68% · 721.0B IQD · 10 شركة» | −1 |
| الخدمات | 8 | −2.08% | −3 | «الخدمات · −2.08% · 207.2B IQD · 8 شركة» | −3 |
| الزراعة | 6 | −0.44% | −1 | «الزراعة · −0.44% · 148.8B IQD · 6 شركة» | −1 |
| التأمين | 5 | +0.91% | +2 | «التأمين · +0.91% · 148.4B IQD · 5 شركة» | +2 |
| الاستثمار المالي | 1 | −1.45% | −2 | «الاستثمار المالي · −1.45% · 3.4B IQD · 1 شركة» | −2 |

Plus: 80 included and 25.329T total in both; area shares as in §6; band
distribution 44/3/7 positive-or-flat and 5/7/14 negative with 0 `na`; company
rows BNOI −1.77% / BMNS +0.47% / BBOB −0.32% matching source; panel figures
for BNOI 193M value / 49,357,520 volume / 164 trades from the session; and
`/c/BNOI` as the panel's link.

## 20 · Performance

One `company_metrics` query (124 rows), one `companies.json` fetch, and the
shared live fetch — three requests. The treemap is two `useMemo`s keyed on the
sector list and the zoom, so hovering, searching and resizing recompute
nothing. `rows` is memoised because `uni?.rows ?? []` reallocates on every
render and would have defeated both. DOM: 8 tiles at the top level, at most 29
inside a sector. No dependency added.

## 21 · Checks

* isolated production build ✓ — 44 routes, `/heatmap` `○` 7.52 kB / 171 kB
* `tsc --noEmit` ✓ · `eslint` 0 errors (4 pre-existing warnings elsewhere)
* route gate ✓ — «44 routes, no rendering-mode regressions»
* token parity ✓ · contrast ✓ 22 pairs both themes · Arabic tracking ✓ 6/6 exempt
* `/heatmap` 200 ✓, canonical `https://iraqsm.com/heatmap`, og:url and og:title
  agreeing, no `/en`, no hreflang, no hidden copy
* homepage, `/market`, `/screener`, `/statistics`,
  `/statistics/foreign-flow`, `/statistics/ownership`, `/statistics/shareholders`,
  `/pulse`, `/companies`, `/c/[sym]`, `/charts` all 200 ✓
* 1440 / 1280 / 768 / 375 × dark and light — **0 horizontal overflow** ✓
* keyboard: every control and every tile focusable in DOM order ✓
* touch targets hit-tested: 15/15 controls ≥44×44 at all eight combinations ✓
* `main` untouched at `d2f60cc` ✓ · reference app clean ✓ · no Alerts touched ✓
  · no removed routes ✓ · no duplicate shell ✓

## 22 · Commits

1. `817e1c2` — heatmap data audit
2. `2deb39d` — `lib/heatmap.ts` on the screener's adapter
3. `f883373` — the approved visual port and interactions
4. `e4c23ad` — touch targets, mobile, legend fit
5. `68b82a1` — legacy CSS cleanup
6. `8a90467` — coverage-line layout
7. this report

## 23 · Intentional differences and unresolved issues

**Namespace.** The reference calls this route `.hm-*`, which is this repo's
homepage. Everything is `.hx-*`, and borrowed chrome keeps its origin in the
name (`.hx-mv-search`, `.hx-cd-ticker`).

**Added, not in the reference.** The coverage line. The reference prints one
«الجلسة» value, which is true of its mock data and false here — half this
map's area is priced on an older close. It costs 48px of field height.

**Removed, in the reference.** Its state-preview `<select>` and its own theme
toggle: reference-app scaffolding, and this app's theme lives in the shell.
Its «آخر تحديث 14:00» has no equivalent in the real pipeline.

**Changed from the reference.** Company links go to `/c/[sym]`, not
`/companies/[sym]`. Search normalises Arabic the way `lib/market` does rather
than doing a raw substring test.

**Fixed rather than reproduced.**

* Label density is driven by the field's pixel size, and the size came only
  from a `ResizeObserver` whose first callback never arrives in some
  environments — including the one this was verified in. Every tile then sits
  at the `none` step and the map renders with no labels at all. The size is
  read directly on mount now.
* `.hx-mv-note` is a flex row in the reference; used for a sentence it wrapped
  each `<bdi>` as its own block, which shattered the coverage line at 375px.

**Latent defects in the shipped page, corrected by the port** (both give the
same 80 companies today, so neither was visible):

* staleness computed as `(days_since_trade ?? 0) > 60`, reading an unknown
  last-trade date as "traded today";
* market cap falling back to the static, stale `mcap` in `companies.json`.

**Carried QA backlog, untouched.** `/statistics`'s activity chart has its
left-most x-axis label overlapping the «مجموع الفترة» caption at 1440. Still a
separate item.

**Also noted.** `.sector-grid` in `app/globals.css` now has no `.tsx` consumer.
Left alone — not heatmap CSS.

---

Phase 6 complete. Stopping here — Market Pulse and later routes not started.
