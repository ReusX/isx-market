# `/heatmap` — data map

Phase 6 audit gate. Written **before** any UI work, from the live production
database, the reference app at `/Users/amed/iqwealth-design`, and the shipped
route in this repo. Read on **2026-08-21**, against the 2026-08-20 session.

---

## 1 · Exact production route

| | |
|---|---|
| Route | `/heatmap` |
| Files | `app/heatmap/page.tsx` (325 lines, client), `app/heatmap/layout.tsx` |
| Rendering | static shell + client component, prerendered `○` |
| Nav label | خريطة السوق |

### Metadata (already correct; carried forward)

* `title` (absolute) — «خريطة السوق الحرارية · أداء أسهم بورصة العراق»
* `description` — describes size = market cap, colour = change, grouped by sector
* `alternates: seoAlternates('/heatmap')` — self-canonical
* `openGraph.url = absUrl('/heatmap')`, `og:image` → `/opengraph-image`
* `keywords`, plus `Breadcrumbs` and a `Freshness` JSON-LD block in the layout
* No `/en`, no hreflang, no hidden copy, robots inherit the site default

The description says «كل سهم مربّع بحجم قيمته السوقية» — true — and does not
claim a single session, which matters given §4.

---

## 2 · Source tables and files

| Source | Rows | Role |
|---|---|---|
| `company_metrics` | **124** | the map itself: sector, closes for all six periods, `days_since_trade` |
| `/data/companies.json` | **104** | issued shares (for market cap), curated Arabic/English name, logo |
| `daily_prices` + `latest_trade` (via `lib/market::fetchLive`) | — | session value / volume / trades for the selection panel, and the `noPrior` truth |
| `daily_index` | 3,785 | the canonical session date and `traded_companies`, for reconciliation only |

`company_metrics` columns actually read: `ticker, sector, name_en, name_ar,
last_date, last_close, prev_close, close_1w, close_1m, close_3m, close_yend,
close_52w, days_since_trade`. The table has no `value`, `volume` or `trades`
column — see §9.

**The adapter is `lib/screener.ts`**, not a new one. It already defines
`PERIODS`, `periodChange`, `STALE_DAYS`, `SECTOR_LABELS`, `usableName` and
`toRow`, and `/screener` has shipped on them. The heatmap imports them so the
two routes cannot disagree about a company's cap, sector or change.

---

## 3 · The heatmap model

| | |
|---|---|
| **Cell area** | **market capitalisation** = `last_close × issued shares` |
| **Cell colour** | **% change over the selected period**, in seven discrete bands scaled by that period's own cap |
| **Grouping** | **sector**, two levels: sectors first, click one to drill into its companies |

All three are what the shipped route already does, and all three are what the
reference does. Nothing is substituted.

Market cap is `last_close × shares` — the same company-level definition
`/screener` and `/statistics` use. It is **not** and must not be called the
official total ISX market capitalisation: this universe is 80 companies and
25.33T, while `/statistics` shows 28.20T over 99, because the heatmap excludes
every name whose price is more than 60 days old (see §5).

The legend states the model in words and the header prints it above the map:
«الحجم = القيمة السوقية · اللون = تغيّر <period>». No reader has to infer it.

### Periods and their intensity caps

| id | label | cap | reference close |
|---|---|---|---|
| 1d | يوم | 3% | `prev_close` |
| 1w | أسبوع | 6% | `close_1w` |
| 1m | شهر | 12% | `close_1m` |
| 3m | 3 أشهر | 20% | `close_3m` |
| ytd | العام | 40% | `close_yend` |
| 52w | سنة | 60% | `close_52w` |

The per-period cap is the shipped page's own idea and it is kept: a 3% day is
extraordinary and a 3% year is nothing, so a single fixed scale would render
every long-period map in flat pastel. The cap is printed under the legend, so
the scale is never implicit.

---

## 4 · Canonical session — and why the map is not one session

`daily_index` latest session: **2026-08-20** · 40 traded · 103 listed.

The map is **not** a snapshot of that session. `company_metrics.last_close` is
each company's own most recent close, and `last_date` varies:

| Last traded | Companies |
|---|---|
| 2026-08-20 (the session) | **40** |
| 1–2 sessions earlier | 6 |
| 3–7 days earlier | 16 |
| 8–30 days earlier | 16 |
| 31–60 days earlier | 2 |

So **40 of the 80 mapped companies traded in the canonical session, and the
other 40 hold 47.0% of the map's area** on a close up to 60 days old. The page
must say this. A heatmap headed with one session date, half of whose area is
priced on older closes, is a false claim about what the reader is looking at.

The shipped page says nothing about it; the reference prints a single
«الجلسة» line, which is true of its mock data and would not be true here. The
port states the session **and** the coverage.

---

## 5 · Company universe, and the two exclusions

```
universe = company_metrics
           ∧ market cap is computable   (last_close > 0 ∧ issued shares known)
           ∧ days_since_trade ≤ 60
```

| | Count |
|---|---|
| `company_metrics` rows | 124 |
| **Included in the map** | **80** |
| Excluded — no computable market cap | **25** |
| Excluded — price older than 60 days | **19** |

**Excluded for no market cap (25):** `ABAP, BDFD, BERI, BTIB, IEAB, IKFP,
IMCI, IMPI, INFI, INSD, MTAH, MTAI, MTIR, MTMR, MTMT, MTNI, MTNN, MTNO, MTRA,
MTUA, SBMC, SILT, VAYF, VKHA, VQUF`. Twenty of these have no row in
`companies.json` at all; five are in the roster without a share count. A
missing share count is **not** a zero: these companies are absent from the map
and counted in the coverage line, never rendered as invisible zero-area tiles.

**Excluded for a stale price (19):** `BAAI, BAIB, BAME, BBAY, BDSI, BIDB,
BJAB, BMUI, BNOR, BRAJ, BTRU, BWOR, BZII, SIBD, VAMF, VBAT, VKHF, VMES, VZAF`.
Their market cap would be an old price times a current share count, which is a
number about a market that no longer exists.

**This is a current-roster map, not a traded-company map**, and the two are not
blurred: the header names the 80, and the coverage line reconciles the 40 that
traded against `daily_index.traded_companies = 40` — an exact match.

### One latent defect, fixed in the port

The shipped page computes staleness as `(days_since_trade ?? 0) > 60`, which
treats an **unknown** last-trade date as "traded today". `lib/screener::toRow`
does the same. Today `days_since_trade` is non-null in all 124 rows, so nothing
is currently mis-included — but the rule is wrong and the port treats null as
**unknown → excluded**, with the count surfaced. Verified: same 80 either way.

The shipped page also falls back to `companies.json.mcap` (a static, stale
figure in millions) when the share count is missing, which is how a company
with no live cap still gets area. The port uses `lib/screener::toRow`, which
returns `null` there. Verified: same 80 either way, because every ticker
lacking a share count also lacks a usable static figure.

---

## 6 · Sector mapping

Grouping uses **`company_metrics.sector`** with `lib/screener::SECTOR_LABELS`
— the mapping `/screener` already ships. It is a clean ten-key vocabulary and
carries none of the duplicate names `sector_monthly` has (`Banking`/`Banks`,
`Hotels`/`Tourism&Hotels`, …), so the Phase 4 alias table is not needed and is
not used here.

Verified over the 80-company universe:

* **0 unmapped sector keys** — every key resolves to an Arabic label.
* **0 disagreements** between `company_metrics.sector` and the `sec` field in
  `companies.json` for any included company.
* `Other` (10 rows) and `Money Transfer` (1 row) exist in the table but **no
  member survives the universe filter** — all lack a share count. If one ever
  does, it renders under its own label; there is no fuzzy matching in UI code
  and no guessing.

| Sector | Companies | Market cap | Cap-weighted 1d |
|---|---|---|---|
| الاتصالات | 2 | 13.068T | −0.86% |
| المصارف | 29 | 9.454T | −1.92% |
| الصناعة | 19 | 1.577T | −0.79% |
| الفنادق والسياحة | 10 | 0.721T | −0.68% |
| الخدمات | 8 | 0.207T | −2.08% |
| الزراعة | 6 | 0.149T | −0.45% |
| التأمين | 5 | 0.148T | +0.91% |
| الاستثمار المالي | 1 | 0.003T | −1.45% |
| **Total** | **80** | **25.329T** | |

A sector's move is **cap-weighted over the names that have a reading**, not a
plain mean — an equal-weighted average lets the smallest bank in the country
outvote the largest. Companies with no reading are excluded from the weighting
and counted, not treated as 0.

---

## 7 · Zero versus unavailable

`periodChange` returns `null` when the reference close is missing or ≤ 0.
That null is the heatmap's `noPrior`: the change is **unknown**, not zero.

| State | Treatment |
|---|---|
| measured `0.00%` | the neutral band, band `0`, labelled with a real `0.00%` |
| no reference close | the **hatched «لا قراءة» tile**, its own legend entry, `—` in the tooltip and panel |
| no market cap | **absent from the map**, counted in the coverage line |

Current data, over the 80-company universe:

| Period | rows with no reading | rows measured exactly 0.00% |
|---|---|---|
| 1d | **0** | 41 |
| 1w | 0 | 26 |
| 1m | 0 | 14 |
| 3m | 0 | 9 |
| ytd | 0 | 6 |
| 52w | 0 | 8 |

So the «لا قراءة» state currently has **no occupants** — every included company
has a reference close for every period. It is still implemented, because the
columns are nullable, because 44 companies are excluded upstream of it, and
because half the universe of true zeros (41 of 80 at 1d) makes the
zero/unknown distinction the single most load-bearing thing on this page. The
shipped page renders unavailable as a middle dot `·`; the port uses `—`, the
product-wide mark.

The `noPrior` flag from `lib/market`'s live layer is a different quantity — it
describes the latest **session**, while the heatmap's null describes the
company's own reference close. Both are honoured, each where it applies: the
map's colour follows `periodChange`, and the selection panel's session figures
follow the live row, showing `—` where that row is `noPrior` or absent.

---

## 8 · Treemap mathematics

Squarified treemap (Bruls, Huizing & van Wijk), laid out in a 0–100 unit box so
tiles are percentage boxes and the browser reflows the map on resize with no
JS re-layout pass. This is the algorithm the shipped page already uses and the
reference keeps. No visualisation dependency is added.

* Area is strictly monotonic with market cap: a tile's area is
  `value / Σvalue × W × H`.
* Weights ≤ 0 are filtered before layout, so no zero or negative area exists.
* Ordering is deterministic — descending by value, stable for equal values.
* Resize does not re-run the layout at all; the percentages are unchanged and
  only the label-density step re-evaluates.

---

## 9 · Tooltip, selection panel, and what the source supports

The reference replaces the shipped page's "every tile is a link" with a
selection panel, and links out from there. Its rows:

| Row | Source | Available? |
|---|---|---|
| آخر سعر | `company_metrics.last_close` | ✓ |
| القيمة السوقية | `last_close × shares` | ✓ |
| قيمة التداول | `daily_prices.value` via `fetchLive` | ✓ *(session, or last actual trade)* |
| الحجم | `daily_prices.volume` | ✓ |
| الصفقات | `daily_prices.trades` | ✓ |
| التغيّر | `periodChange` | ✓ |

`company_metrics` carries none of the last three, so the panel needs the live
layer. That is already a canonical, shipped source (`/market`, the homepage),
so no new definition is introduced. Where a company did not trade in the
session, its live row is a carry-forward marked `stale` with the date of its
last actual trade — the panel labels that rather than printing the figures as
if they were today's, and prints `—` where the live row is missing entirely.

Tooltip/`title` and the panel show only these fields. No fabricated values.
Numeric runs stay LTR inside `<bdi>`; Arabic labels carrying numerals are not
`bdi`-wrapped.

---

## 10 · Company navigation

Tiles **select**; the panel links out to **`/c/[sym]`**. Not `/analysis`, and
not the reference's own `/companies/[sym]`. Keyboard users reach the same link:
tiles are `<button>`s in DOM order, selection is a normal click/Enter, and the
panel's link is the next tab stop.

---

## 11 · Controls

Exactly what the reference has, and no more:

* **period** — the six above
* **breadcrumb** — كل القطاعات › <sector>
* **search** — highlights, never filters: it dims non-matches so the map's
  geometry, which is the message, never changes. Matches ticker, Arabic name
  and English name.
* **legend** — the seven bands double as a filter-by-band highlight.

No sector filter, no size-metric switcher, no export. This is not a screener.
Any count the page prints reconciles with the tiles rendered.

---

## 12 · Colour scale and legend thresholds

Seven discrete bands, not a continuous ramp. Band membership is
`r = pct / cap`, so the thresholds move with the period:

| Band | Condition on `r` | 1d (cap 3%) | 52w (cap 60%) |
|---|---|---|---|
| −3 | `r ≤ −0.62` | ≤ −1.86% | ≤ −37.2% |
| −2 | `−0.62 < r ≤ −0.28` | −1.86 … −0.84% | −37.2 … −16.8% |
| −1 | `−0.28 < r ≤ −0.06` | −0.84 … −0.18% | −16.8 … −3.6% |
| 0 | `abs(r) < 0.06` | ±0.18% | ±3.6% |
| +1 | `0.06 ≤ r < 0.28` | +0.18 … +0.84% | +3.6 … +16.8% |
| +2 | `0.28 ≤ r < 0.62` | +0.84 … +1.86% | +16.8 … +37.2% |
| +3 | `r ≥ 0.62` | ≥ +1.86% | ≥ +37.2% |
| na | no reading | hatched, «لا قراءة» | |

The legend prints each band's own edges computed from the same constants, so it
cannot drift from the colouring. `na` is a separate legend entry, never merged
with band 0. Colour is never the only cue: every tile large enough carries the
signed percentage and an arrow, and every tile carries both in its tooltip and
`aria-label`.

Light-mode hexes (reference, ported verbatim): `−3 #8f2f20`, `−2 #b5432f`,
`−1 #dd9a8b`, `0 #d7d9d5`, `+1 #86c3aa`, `+2 #12805a`, `+3 #0a5a3e`, with a
matching dark set and a 45° hatch over `--mv-well` for `na`.

---

## 13 · Label density

Four steps, from the tile's real pixel size — clipped Arabic reads as a
different company, so text that does not fit is not drawn:

| Step | Condition | Shows |
|---|---|---|
| `none` | w < 34px or h < 26px | colour only |
| `tick` | w < 66px or h < 46px | ticker |
| `tickpct` | w < 150px or h < 96px | ticker + % |
| `full` | otherwise | name + ticker + % (+ count and cap on sector tiles) |

Every tile, at every step, keeps its `title` and `aria-label`, so the company
is always reachable by hover, focus and screen reader.

---

## 14 · States

* **Loading** — a skeleton field with the map's own rhythm, at the map's exact
  footprint, so nothing reflows on arrival.
* **Partial** — valid tiles render and the coverage line states what is missing.
* **Empty** — only when no company has a reading for the selected period; the
  page says so and offers the shortest period.
* **Stale** — the exact session and the 40/80 split are printed, always.
* **Error** — header and controls stay; no raw PostgREST text reaches the DOM.

---

## 15 · CSS collisions

The reference names this route's classes `hm-*`. **`.hm-*` is this repo's
homepage namespace** — 39 live selectors from Phase 1, including
`.hm-balance-track`, `.hm-flow`, `.hm-breadth`. Porting verbatim would restyle
the homepage.

The whole port is therefore renamed to **`.hx-*`** (verified: zero `.hx-`
selectors in any stylesheet and zero in any component). The shared chrome it
borrows — `mv-search`, `mv-note`, `mv-dash`, `cd-ticker` — is folded into the
same namespace, because `.mv-search` also already exists here with a different
definition. `heatmap-v2` becomes `.hx-page`.

Legacy `.heatmap-*` selectors are a separate matter; see the cleanup section of
the completion report.

---

## 16 · Performance

* One `company_metrics` query (124 rows) and one `companies.json` fetch, plus
  the shared live fetch for the panel.
* The treemap runs in two `useMemo`s keyed on the sector list and the zoom, so
  it does not recompute on hover, on search or on resize.
* Resize updates a pixel-size state that feeds label density only; tile
  geometry is percentages and never recomputed.
* Search and band highlight are pure predicates over the existing rows — no
  relayout, no refetch.
* DOM: 8 sector tiles at the top level, at most 29 company tiles inside one
  sector. No canvas, so no accessible-companion structure is needed.
