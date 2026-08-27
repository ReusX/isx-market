# `/market` re-port — completion report

Branch `implement/iqwealth-redesign`, commit `ce4f269`, 17 August 2026.
Answers the fifteen-point completion gate.

Both apps were run side by side before any layout was written — reference on
`localhost:4400/market`, implementation on `localhost:3300/market` — and every
number below is `getComputedStyle` / `getBoundingClientRect` off the live pages.

---

## 1 · Reference files and CSS used

| reference file | what came from it |
|---|---|
| `app/market/MarketBoard.tsx` | the composition, element for element: head, summary strip, sticky controls, sortable header, row anatomy, skeleton, empty and error states |
| `app/globals.css` «حركة السوق» block | `.market-v2`, `.mv-head*`, `.mv-summary`, `.mv-breadth*`, `.mv-metric*`, `.mv-controls`, `.mv-tabs`, `.mv-search`, `.mv-select`, `.mv-listing`, `.mv-board*`, `.mv-table`, `.mv-col-*`, `.mv-mark`, `.mv-identity`, `.mv-pct`, `.mv-skeleton*`, `.mv-empty*`, `.mv-error*`, `.mv-footnote` |
| … `body:has(.iq-page.iq-dark)` block | the dark counterpart, including the four opaque composites for the pinned column |
| … the three responsive blocks | 1240 / 1000 / 720 / 420 breakpoints |

**Class names are `.mk-*`, not `.mv-*`, and that is deliberate.** This repo's
Phase 0 primitives (`styles/system.css`) already ship `.mv-tabs` as an
underline tab strip, `.mv-search` as a full-width trigger and `.mv-select` as a
bare control — while the reference uses those same three names for a filled
segmented control, a 34px inline field and an `appearance: none` select.
Porting the selectors verbatim would have double-styled all three, silently, on
any page carrying both layers. So the **values** are the reference's and the
**selectors** are this repo's, scoped under `.mk` exactly as the homepage is
scoped under `.hm`. Mapping: `market-v2→mk`, `mv-head→mk-head`,
`mv-head-meta→mk-meta`, `mv-tabs→mk-filter-tabs`, `mv-select→mk-sector`,
everything else `mv-X → mk-X`.

## 2 · Final columns

Eleven. The reference's ten, in the reference's order, plus the watchlist star
this application has and the reference does not.

| # | column | source | notes |
|---|---|---|---|
| 1 | `#` | row index | hidden < 720px |
| 2 | ★ | `AppContext.watchlist` | **not in the reference**; hidden < 720px |
| 3 | الشركة | `ar`/`en` · `sym` · `sec` | pinned, 300px |
| 4 | آخر سعر | `close` | |
| 5 | التغير | `change` | **restored** |
| 6 | التغير ٪ | `pct` | tinted plate |
| 7 | الحجم | `shares_traded` | |
| 8 | قيمة التداول | `vol` (traded value, IQD) | **restored** |
| 9 | الصفقات | `deals` | **restored** |
| 10 | القيمة السوقية | `liveMcap()` | dashed when suspended |
| 11 | 7D | `fetchSparklines()` | |

Three columns restored. The page already computed absolute change, traded value
and deal count and displayed none of them — a 2% move on 4M IQD across nine
deals and a 2% move on 68M IQD across 512 deals are completely different
events, and the old board rendered them identically. `MARKET_DATA_MAP.md` §3
confirmed all three were already on `Company`; nothing was invented.

## 3 · Canonical session

`fetchLive()` resolves the latest `daily_prices` date and the session
immediately before it. That is the route's canonical session and it is
self-contained — `/market` never reads `daily_index`, so it cannot disagree
with a table it does not consult.

Rendered as **17 أغسطس 2026** in the head, and again in the footnote. Not
`bdi`-isolated: it is Arabic text carrying numerals, and isolating it as LTR
reorders it to «أغسطس 17 2026» — the same fault the homepage re-port fixed.

The session chip reads «آخر نشرة», not «السوق مغلق/مفتوح». ISX publishes one
bulletin per trading day and this product has no intraday feed, so an
open/closed state would be a claim it cannot support.

## 4 · Four-state counts — verified against the DOM

| state | key | rows the filter returns | every row's ٪ cell |
|---|---|---|---|
| رابح | 10 | **10** | all `+` |
| ثابت | 7 | **7** | all `0.00%` — measured flat |
| خاسر | 13 | **13** | all `−` |
| دون إغلاق سابق | 6 | **6** | all `—`, in both change columns |

10 + 7 + 13 + 6 = **36** = «المتداولة 36» in the head. Every key produces
exactly the rows it counts.

«ثابت» means MEASURED flat throughout: `!c.noPrior && c.pct === 0`, never
`pct === 0` alone. A company with no comparable prior close has an unknown
change and gets its own state, its own key and its own hatched bar segment —
hatched and not tinted, so it can never read as a fourth direction. Nothing
coerces an unavailable move to zero anywhere on the page.

## 5 · Sorting

Default **traded value, descending** — «which companies matter right now» is a
question about today, and market cap sorting produces the same first screen
every day, which is another way of saying it answers nothing. (The old default
was market cap.)

All eight numeric columns sort; clicking the active one toggles direction; a
new column opens descending, because money and size have no useful
ascending-first look. State is carried by three signals, not one: caret
direction, caret opacity, and the label's ink weight — colour alone fails for
about one man in twelve.

Carried-forward rows sink rather than interleaving at zero, but only for
SESSION columns. Price and market cap are properties of the company rather
than of the session, so they sort normally.

The tab carries the ordering that makes it legible: «الأكثر نشاطاً» sets value
desc, «الرابحون» pct desc, «الخاسرون» pct asc.

## 6 · Filters and search

Six, all in one sticky bar: the four-way tab, free-text search, a sector
**select**, the active/suspended listing toggle, the watchlist toggle, and the
four breadth keys in the strip above. «مسح الفلاتر» appears only when something
is filtering, and the live count sits beside it.

The sector filter is a select, not the previous implementation's row of eight
chips — eight pills is eight more things to read before reaching the table, and
it cost a whole row of the page.

Search matches `sym`, `ar` and `en`, carries `dir="auto"` so an Arabic name
types RTL and a ticker types LTR in the same field, and is still seeded from
`?q=` — the endpoint the header search and the `WebSite` SearchAction declare.

The breadth counts **are** the movement filter. Printing them and then
providing a separate control for the same concept is two controls for one idea.

## 7 · Desktop visual comparison

Measured at 1440×900. Reference page width 1316 (76px rail); implementation
1166 (226px rail) — the same `min(1620px, 100% − 48px)` rule against a
different shell, so the ratios hold.

| | reference | now | before |
|---|---|---|---|
| page height | 933 | **929** | **4,674** |
| head | 61 | 54 | 80 |
| summary strip | 1316 × 99 | **1166 × 100** | absent |
| controls | 54, sticky | **56, sticky** | three loose rows |
| board | 572, own scroll | **572, own scroll** | none |
| header row | 36 | **36** | — |
| body row | 46 | **46** | 53 |
| td type | .68rem / 500 mono | **.68rem / 500 mono** | 16px |
| h1 | 27.36px / 400 | **27.36px / 400** | 16px / 600 |
| company column | 300, pinned | **300, pinned** | 662, not pinned |
| table min width | 1080 | **1080** | — |
| mark | 30 × 27 | **30 × 27** | 30 × 30 |
| ٪ plate | 62px min, r7 | **62px min, r7** | none |
| controls offset | 92px | 70px | — |

The 70px sticky offset is not a miss: the reference floats its header with a
16px top margin, and this application's header sits flush at `top: 0` and is
62px tall. Same visual gap under different chrome.

The head is 54 rather than 61 because the reference's carries two things this
one does not — a design-mode state selector and a page-local theme toggle.

## 8 · Mobile comparison

375 × 812, ported from the reference's declarations rather than derived:

- **page-level horizontal overflow: 0px**; the board scrolls locally at
  `min-inline-size: 660px`
- company column pinned at every scroll position, so a sideways drag never
  leaves you reading anonymous numbers
- three columns always on screen — company, last price, change % — «what is it»
  and «what did it do»
- rank, the watch star, the absolute change and the mark drop out; all are one
  thumb-drag away, not gone
- breadth spans the full width; the totals share the row beneath
- controls stay sticky at 62px; the count chip is dropped, because the head
  already states it and a second copy costs a row of a 375px screen
- row height stays 46px

Critically, the board is **not** restacked into cards. The legacy stylesheet
turns every table under 720px into a card stack and hides `thead`; that would
turn a 104-row market into a 104-card scroll and destroy the one thing a table
is for. The opt-out is restated at component specificity.

## 9 · Light / dark

Both ported from the reference's own dark block rather than inverted. The three
things it deliberately does not mirror are carried across: the greens and reds
are re-picked rather than lightened (`#117f59`/`#b5432f` on bone,
`#35c98a`/`#ee6a6f` on `#161616`), separators go from 5.5% ink to 6.5% white,
and the blue bloom is stronger on dark than the white bloom is on light.

The four opaque composites for the pinned company column are ported exactly —
`#f7f9f9` / `#f0f3f7` in light, `#242424` / `#222b36` in dark. The pinned column
slides over the other cells, so it cannot inherit the row's translucent zebra
or hover tint; get one wrong and it reads as a vertical band down the table,
which is the seam it exists to avoid drawing.

## 10 · Legacy CSS removed

21 rule blocks plus one whole responsive block, from `app/globals.css`:

`.market-movement-page` · `.market-movement-header` (+ `h1`) · `.market-counts`
(9 rules incl. the two `.muted` one-liners) · `.market-sector-filters` ·
`.filter-bar` (+ `.app-field`) · `.watch-cell` · `.spark-empty`, and the
`@media` block carrying their responsive overrides plus the
`.market-movement-page .shared-data-grid` column collapse.

Every one was verified to have no remaining `.tsx` user first. Classes that
looked like `/market`'s but are **not** were left alone —
`listing-status-note`, `table-wrap`, `company-cell`, `logo-chip`,
`stacked-cell`, `stale-flag`, `num-roll`, `row-link`, `page-footnote`,
`app-eyebrow`, `empty-state` are all still used by `/companies`, `/screener`
and `/c/[sym]`. Those routes were re-checked after the deletion: `/companies`
still renders 82 rows at 53px with its 30px logo chip and no overflow.

`ListingStatusTabs`, `SectorChip`, `Card` and `SkeletonTableRows` are no longer
imported by `/market` but remain in use elsewhere, so none were deleted.

## 11 · Source-versus-DOM verification

Everything in §4 was read out of the rendered DOM by clicking each control, not
inferred from the source. In addition:

- default sort header renders `active` with `data-dir="desc"` on «قيمة التداول»
- first row BNOI · 4.00 · +0.01 · +0.25% · 30,428,017 · 120.8M · 117 · 2.6T,
  and its link is `/c/BNOI`
- totals 627.1M IQD · 441.5M shares · 862 trades, over the 36 traded names
- «الأكثر نشاطاً» resolves to BNOI at 120.8M, which is also row 1 under the
  default sort — the two agree
- head reads «82 من 104»; the listing toggle offers 82 active / 22 suspended
- the count chip and the row count agree at every filter state tested

## 12 · Performance

The board renders all matching rows — no pagination, as before. What changed is
that they now live inside a 572px scroll container rather than a 4,674px page,
so the browser composites one scrollport instead of laying out the whole
document on every scroll. Route rendering mode is unchanged: `/market` is still
prerendered `○`, confirmed by `check:routes`. No new data fetch, no new
dependency, one new stylesheet.

## 13 · Checks run

```
npx tsc --noEmit            clean
npx eslint app/market/…     clean
npm run check:tokens        16 tokens/theme in parity · 22 contrast pairs pass · 0 tracking rules reaching Arabic
npm run check:routes        44 routes, no rendering-mode regressions
```

Route smoke-check after the CSS deletion: `/`, `/market`, `/screener`,
`/companies`, `/heatmap`, `/pulse` all 200.

Six screenshots at identical viewports — reference/implementation × dark 1440,
light 1440, mobile 375.

## 14 · Commits

- `ce4f269` — the `/market` re-port (this work)

Carried forward untouched: `1c16513` (Market Movement correctness), and the
approved homepage at `3d977d1` / `a2abb3a`.

## 15 · Intentional differences

1. **The watchlist star column.** This application has a watchlist; the
   reference does not. It takes a 40px column beside rank and drops with it on
   mobile, so the reference's ten columns are otherwise untouched.
2. **The bilingual layer.** The reference is Arabic-only; this route serves
   `ar`/`en` from `AppContext` and keeps doing so. Dropping it would be a
   product regression, not a fidelity gain.
3. **Four breadth keys, not three.** The reference has three and disables
   «ثابت». Ours has four — the fourth is the `noPrior` correction — and all
   four filter, because all four work here.
4. **«آخر نشرة» instead of «السوق مغلق».** No intraday feed, so no open/closed
   claim. For the same reason the head's third slot carries «المتداولة» rather
   than the reference's «آخر تحديث 14:00».
5. **Real company logos in the 30×27 mark.** The reference prints two letters.
   Ours prints the logo when one exists and falls back to two letters on the
   approved Electric-Blue chip — same box, same role.
6. **No design-mode state selector and no page-local theme toggle.** The first
   is a reference-only review affordance; the second is the shell's job here.
7. **The shared site footer stays.** It adds 488px below the board that the
   reference has no equivalent of. It is on every route in this product.

Stopping here. Stock Screener is not started and will not be until Market
Movement is explicitly approved.
