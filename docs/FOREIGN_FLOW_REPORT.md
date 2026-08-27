# Phase 5 — `/statistics/foreign-flow` completion report

Branch `implement/iqwealth-redesign`. `main` verified untouched at `d2f60cc`.
Reference app at `/Users/amed/iqwealth-design` verified clean — nothing written
to it.

---

## 1 · Exact production route

`/statistics/foreign-flow` — `app/statistics/foreign-flow/page.tsx`, a static
shell over `ForeignFlowClient.tsx`. Prerendered `○`, **9.72 kB / 174 kB first
load**. Parent `/statistics` unaffected in rendering mode.

## 2 · Reference files and CSS used

Read directly, not from memory or summaries:

* `app/statistics/foreign-flow/ForeignFlowDetail.tsx` (552 lines)
* `app/statistics/foreign-flow/FlowChart.tsx` (377)
* `app/statistics/foreign-flow/flowData.ts` (369)
* `app/statistics/statsData.ts` — periods, grain, formatters
* `app/globals.css` — the `.ff-*` block plus every `.st-*`, `.cd-*`, `.pl-*`,
  `.mv-error` and `.fn-help` rule those two components render, extracted by
  balanced-block matching into `app/statistics/foreign-flow/foreign-flow.css`.

Both apps ran side by side throughout (reference on `:4400`, implementation on
`:3300`), and every geometry number below was measured in the DOM.

## 3 · Source tables

| Table | Role |
|---|---|
| `foreign_flow_company_daily` | **the only source of flow values** — 28,381 rows, 2010-03-29 → 2026-08-20 |
| `daily_index` | the trading-session calendar that defines every window |
| `foreign_flow_daily` | **zero-proof oracle only**, never a rendered value |
| `ownership_monthly` | the ownership panel (a different quantity, its own month) |
| `foreign_flow_sector` | **validation only**, never rendered |
| `depository_monthly` | **unusable — see §21** |

`foreign_flow_daily` is not used for values because it stops at 2026-07-30, is
21 days behind the per-company table, starts 12 years later, and disagrees with
it on **60 of their 915 shared sessions** (most recently 2026-05-19). The
homepage and the statistics hub already read the per-company table; this route
joins them rather than adding a third answer.

## 4 · Latest session and windows

Latest observed session **2026-08-20**, which is also the latest `daily_index`
session — no lag today. Nothing on the page says «اليوم», «أمس», «مباشر» or
«live»; every module prints its own dates.

Default period **سنة**, as the reference opens. Verified windows:

| Period | Sessions | From | To | Observed | Not counted |
|---|---|---|---|---|---|
| شهر | 22 | 2026-07-19 | 2026-08-20 | 22 | 0 |
| سنة | 250 | 2025-07-29 | 2026-08-20 | 249 | 1 |
| الكل | 3,787 | 2010-01-08 | 2026-08-20 | 3,543 | 244 |

Sessions are trading sessions, not calendar days.

## 5 · Buy / sell / net

```
buy   = Σ value where side = 'buy'
sell  = Σ value where side = 'sell'
net   = buy − sell        ← signed, on every surface
gross = buy + sell        ← "activity", never called net
```

Promoted to `lib/foreignFlow.ts` and imported by the homepage's model, the
statistics hub and this route. The hub previously folded with `?? 0` and
windowed by flow-sessions; it now folds through the shared functions over the
same trading-session calendar.

## 6 · Cumulative formula

```
cum[0] = net[0]
cum[i] = cum[i−1] + net[i]      over the SELECTED window's observed buckets
```

Start point is 0 at the window's first observation, never at the start of the
record — the heading says «الرصيد التراكمي خلال الفترة» for exactly that
reason. Buckets with no observation carry the balance forward unchanged rather
than adding a zero, and nothing is interpolated. Verified: the cumulative
readout at the last bucket of the 1M window is **−21,525,748,412**, identical
to the window net printed in the hero.

Signed mode and cumulative mode are separate modes, never overlaid.

## 7 · Company-level reconciliation

Company rows are the same table grouped by ticker over the same window, so the
reconciliation is exact by construction rather than by scaling. Verified on the
1M window:

| | Source | Company rows summed |
|---|---|---|
| buy | 451,159,998.70 | 451,159,998.70 |
| sell | 21,976,908,410.46 | 21,976,908,410.46 |
| net | −21,525,748,411.76 | −21,525,748,411.76 |

No row is scaled and no residual «أخرى» bucket exists. 29 companies had foreign
activity in the window; the ranking shows the top 10 of whichever side is
selected and the footer prints both counts.

Sector rows are aggregated from those same company rows, so the two panels
cannot disagree. Validated against `foreign_flow_sector` for 2026-07: every
sector matches to the dinar except Banks buy, where the monthly sector table is
**short by 1,481,827,982 IQD**. That table is therefore validation-only.

## 8 · Percentage denominators

| Figure | Numerator ÷ denominator | Zero denominator |
|---|---|---|
| Balance bar | buy (or sell) ÷ window gross | bar empty, both figures `0`, and the caption says so |
| Company «من النشاط الأجنبي» | (buy + sell) ÷ window gross | row cannot exist |
| Sector «من النشاط» | (buy + sell) ÷ window gross | as above |
| «استمرارية الشراء» | net-positive sessions ÷ **observed** sessions | prints `—` |
| Ownership share | Σ foreign_shares ÷ Σ (foreign + iraqi) | prints `—` |

Verified: BMNS (60,783,966 + 7,459,203) ÷ 22,428,068,409 = 0.304% → «0.3%».
Banks (263,392,890 + 21,050,862,161) ÷ 22,428,068,409 = 95.06% → «95%».

A share that rounds to zero but is not zero prints **«<1%»**, never «0%».

Deliberately not shown: foreign value ÷ total market traded value. It is
computable, the reference omits it, and adding a ratio the approved composition
does not carry is out of scope here. Recorded as available.

## 9 · Zero vs unavailable

`foreign_flow_company_daily` holds **no NULL and no zero rows** — the parser
writes a row only for real activity. So within a covered session, absence is a
provable zero, and outside one it proves nothing:

* a side with no rows in a covered session → **`0`**. Verified in the DOM:
  2026-07-22 and 2026-07-29 both print «بيع 0», not `—`, not a separator.
  `foreign_flow_daily` independently records 0 sell for 2026-07-29.
* a session with no rows at all → classified. 16 in the whole record are proven
  zero by the oracle and plot as 0; 3 are known gaps (2023-05-30, 2024-11-24,
  2025-10-02) where the oracle reports real activity; the rest predate the
  oracle. Gaps and unknowns are **not plotted and not summed**, and the count
  is printed: «1 جلسة بلا بيانات لم تُحتسب» on 1Y, «244» on الكل.
* a company with no row on the selected side is **absent from the ranking**,
  never a zero row, and the footer says so.

The 1Y gap bucket was located by hovering: «أسبوع 28 أيلول — 2 تشرين1 2025 ·
جلسات 4 · بلا بيانات 1» — the week containing 2025-10-02, exactly the session
the audit identified.

## 10 · Period controls

The seven approved periods, reused verbatim from `lib/statistics.ts` so 1M here
covers the same dates as 1M on `/statistics`. Each prints its own start date,
end date, session count and observed count. No intraday period is offered
because the source has no intraday grain. Selected state is `aria-pressed` on a
labelled `role="group"`.

## 11 · Chart behaviour

The reference's canvas chart, ported. Signed columns from a shared zero rail in
net mode; a filled line — the only line on the page — in cumulative mode. Zero
rail drawn last so it reads over the bars it divides. Hover crosshair, a
readout strip that names the bucket at its own grain, and PNG copy/download.

Grain: session (1M/3M), week (6M/1Y), month (3Y/5Y), year (الكل), with the unit
always printed so a monthly total cannot be read as a session.

**Not mirrored under RTL.** Canvas coordinates ignore `direction`, so the value
axis sits in the right gutter and time runs the right way with no physical-offset
work. Canvas *text* does obey direction, which made the axis print «5.00B−»;
`ctx.direction = 'ltr'` fixes it. The reference app has that same defect on the
same axis — see §21.

Mobile height 236px, unchanged from desktop, as the reference does.

## 12 · Company table behaviour

Dense rows: rank · name · ticker · bar · value · chevron. Four views — أكبر
صافي شراء / أكبر صافي بيع / أكبر شراء / أكبر بيع — sorted numerically on the
view's own figure. Signed views draw a centre-rail bar; side views draw a plain
one. Hover or focus fills a readout with buy, sell, net, share and trade count.

Links go to **`/c/[sym]`**. Not `/analysis`. Each carries an `aria-label` with
all three figures.

Verified sorting against source: netIn top 3 BMNS +53.3M, IMAP +46.2M, BBOB
+44.6M; netOut top BKUI −20.48B; buy top BNOI 125.7M; sell top BKUI 20.48B.
View counts 15 / 13 / 21 / 20 of 29 — netIn + netOut = 28, the 29th having a net
of exactly zero and therefore appearing on neither signed side.

Names come from the curated roster through `companyName`, which falls back to
the English name before the ticker — 20 of the 104 curated rows have an empty
`ar`, and AISP was rendering as its own ticker before that fix.

## 13 · Mobile result

At 375: hero stacks session-then-period, the two-column company/sector grid
collapses, the company rows drop to `16px 1fr 70px 10px` with the bars hidden,
the period strip scrolls inside itself. All the reference's own 720px rules.
Chart stays 236px. **Zero page-level horizontal overflow**, verified at 1440,
1280, 1024, 768 and 375 in both themes.

Touch targets: **42 focusable controls, 42 at ≥44×44** — measured by hit-testing
each control with `elementsFromPoint`, at 1440, 1280, 768 and 375 in both
themes. See the correction note in §21.

## 14 · Light / dark result

Matched against the running reference in both, not inferred from one. Panels
`#fbfbfa` light and `#1f1f1f` dark; hero cards `rgba(255,255,255,.72)` and
`rgba(35,35,35,.82)`; semantic green/red `#0e7350`/`#a83926` light and
`#40d795`/`#f4787d` dark, in both the DOM and the canvas palette. Theme is read
from `data-theme` on `<html>` — the app's single pre-paint source — and the
canvas repaints on a MutationObserver rather than owning a second toggle.

The period pill track keeps the reference's `rgba(30,34,32,.055)` in both
themes, which is nearly invisible in dark. Checked against the running
reference: it does exactly the same. Ported, not corrected.

## 15 · Legacy CSS removed

**None, and that is the finding.** Every selector the old route touched —
`statistics-detail-page`, `statistics-breadcrumb`, `statistics-card`,
`statistics-card-heading`, `statistics-secondary`, `statistics-headline`,
`statistics-subline`, `stat-panel` — still has a live consumer on
`/statistics/ownership`, `/statistics/shareholders`, `/c/[sym]` or `/pulse`.
The old page styled itself with inline styles and owned no selectors of its own.

What was removed is the component: `app/statistics/DailyForeignFlow.tsx`, 282
lines, zero remaining imports.

## 16 · Visual comparison

Matched captures at identical viewports, reference beside implementation:
desktop dark, desktop light, 375 mobile. Same composition, same order, same
surfaces, same density. Measured at 1440: hero `543/609` two-column, company and
sector panels `576/576`, chart plot 236px, company row 50px, `.ffw-page`
`min(1520px, 100% − 48px)` — the reference's own values throughout.

Intentional differences, all listed in §21.

## 17 · Source → DOM verification

Every figure below was read from the database, then read out of the rendered
DOM, and they agree:

| | Source | DOM |
|---|---|---|
| window | 2026-07-19 → 2026-08-20, 22 sessions | «22 جلسة في الفترة», «19 تموز 2026 — 20 آب 2026» |
| buy | 451,159,998.70 | 451.2M |
| sell | 21,976,908,410.46 | 21.98B |
| net | −21,525,748,411.76 | −21.53B |
| buy − sell = net | ✓ | ✓ |
| net-buy / net-sell sessions | 5 / 17 | «5 جلسة شراء مقابل 17 جلسة بيع» |
| persistence | 5 ÷ 22 | «23% · 5/22» |
| latest session | 2026-08-20 | «20 آب 2026» |
| latest buy / sell / net | 198,800.8 / 132,987,367.8 / −132,788,567 | 199K / 133.0M / −132.8M |
| latest trades / companies | 153 / 2 | 153 / 2 |
| companies with activity | 29 | «من أصل 29» |
| cumulative endpoint | −21,525,748,412 | −21,525,748,412 |
| زero sell sessions | 2026-07-22, 2026-07-29 | «بيع 0» on both |
| الكل net | +29,864,540,043 | +29.86B |
| الكل buy / sell | 1,072,862,217,381 / 1,042,997,677,338 | 1.07T / 1.04T |
| ownership 2026-07 | 2.705T foreign / 11.553T iraqi = 18.97% | 2.71T / 11.55T / 19.0% |

## 18 · Performance

`foreign_flow_company_daily` in full is 2.28 MB over 29 requests in ~4.1 s, so
the route loads **lazily by period**: the calendar comes from `daily_index`
limited to the period's session count, and the flow rows are fetched from the
window's start date. Widening fetches only the older slice; narrowing fetches
nothing — verified by switching سنة → الكل → شهر and watching the request count
stay flat on the narrow.

Production initial load at the سنة default: 1 `daily_index`, 2
`foreign_flow_company_daily`, 1 `foreign_flow_daily`, 2 `ownership_monthly`, 1
`companies.json` — 7 requests. (Dev doubles these under StrictMode.)
`companies.json` was being fetched twice per mount by two effects; it is fetched
once now and shared.

Every derivation — fold, window, totals, buckets, company grouping, sector
rollup, ownership summary — is a `useMemo` keyed on what it actually depends on,
so switching mode or view re-renders without recomputing the window, and
switching period does not re-run the name-matching.

No chart dependency was added; the chart is canvas and draws itself.

## 19 · Checks

* isolated production build ✓ — 44 routes
* `tsc --noEmit` ✓
* `eslint` ✓
* route gate ✓ — «44 routes, no rendering-mode regressions»
* token parity ✓ — 16 per theme, 61 total, no collisions, no dangling refs
* contrast ✓ — 22 pairs pass in both themes
* Arabic tracking ✓ — 4 positive rules, 4 exempt, 0 reaching Arabic
* `/statistics/foreign-flow` 200 ✓ · `/statistics` 200 and visually intact ✓
* `/statistics/ownership`, `/statistics/shareholders`, `/pulse`, `/c/[sym]`,
  `/`, `/market`, `/screener`, `/heatmap` all 200 ✓
* canonical + og:url + og:title + description ✓, self-canonical, no `/en`,
  no hreflang, no hidden copy
* 1440 / 1280 / 1024 / 768 / 375 × light and dark — **0 horizontal overflow** ✓
* keyboard: tab order reaches every control, focus ring 2px solid at 3px offset ✓
* one `<main>`, one `<h1>`, four `<h2>`, three labelled control groups, five
  `aria-live` regions, `role="img"` with text on both graphics ✓
* touch targets: 42 of 42 at ≥44×44, hit-tested at four viewports × two themes ✓
* `main` untouched at `d2f60cc` ✓ · reference app clean ✓ · no `/en` ✓ ·
  no Alerts touched ✓ · no removed routes ✓ · no duplicate shell ✓

## 20 · Commits

1. `8870293` — foreign-flow data audit (+ the Phase 4 wording constraint)
2. `4a8ff7f` — the shared, reconciled `lib/foreignFlow.ts` model
3. `6c3e475` — stylesheet and canvas chart port
4. `b5e4177` — the route composition
5. `6ac1b02` — responsive, RTL axis, touch targets
6. `78cece3` — legacy cleanup audit and the dead component
7. `81dc1ef` — performance and Arabic tracking
8. this report

## 21 · Intentional differences and unresolved issues

**Reference module that cannot be built.** بنية الحاملين reads
`depository_monthly.individual_foreign` and `entity_foreign`; **all 903 rows
have both NULL**, and a filter for any non-null `individual_foreign` returns
zero rows. The panel is omitted and nothing is proxied in its place. This is the
§3 "stop and report" case.

**Reference defects not reproduced.**

* The reference draws its value axis as «150.0M+» / «50.0M−» — canvas text under
  RTL putting the sign after the number. Corrected here.
* The reference labels its session card «الجلسة الأخيرة» unconditionally. Here
  it is «آخر جلسة برصد» and names the date, because the latest stored session is
  not always the latest trading session.

**Deliberate divergences.**

* The reference header carries a state-preview `<select>` and its own theme
  toggle. Both are reference-app scaffolding; this app's theme lives in the
  shell, and a second toggle would be a second source of truth.
* The reference subtitle prints «حُدِّث 14:00». There is no publish timestamp in
  the real pipeline, so it is not claimed.
* Company links go to `/c/[sym]`; the reference uses its own `/companies/[sym]`.
* Four short Arabic month names are written with Latin digits, not Arabic-Indic
  — the repo's lint enforces one numeral system per page.
* `.ffw-cd-cell-label` drops the reference's `.02em` tracking, which would break
  Arabic joins.
* `.ffw-page` clips its own x overflow so two decorative tooltips cannot widen
  the document at 375. The reference leaks 1px of the same overflow.
* The whole port is namespaced `.ffw-*` because five reference selectors collide
  with existing definitions in this repo.

**Pipeline defects found, for the backlog — not fixed in this phase.**

1. `foreign_flow_daily` disagrees with `foreign_flow_company_daily` on 60 of
   915 shared sessions, most recently 2026-05-19.
2. `foreign_flow_daily` has not been written since 2026-07-30.
3. `foreign_flow_sector` 2026-07 under-reports Banks buy by 1,481,827,982 IQD.
4. `foreign_flow_company_daily` is missing company rows for three sessions where
   `foreign_flow_daily` reports real activity.
5. `depository_monthly` has never carried foreign holder counts.
6. `ownership_monthly.sector` is misaligned — «نقل المنتجات النفطية والبضائع» is
   labelled `Insurance`. Not read by this route.
7. `ownership_monthly.name_ar` carries lam-alef mojibake; recovered at read time
   by `matchCompanyName`, not repaired at source.
8. `ownership_monthly` is missing 2025-03 and 2025-05.
9. 20 of 104 rows in `companies.json` have an empty `ar`; the route falls back
   to the English name, but the curated Arabic is missing upstream.

**Correction to the first version of this report.** It claimed "42 focusable
controls, 38 at ≥44px" and named the four buy/sell balance segments as accepted
exceptions. That count was wrong, and so was the reasoning. It came from reading
the computed `block-size` of each control's hit-area pseudo-element rather than
hit-testing the rendered page, which missed three things: `.ffw-fn-help`'s
`::after` is its tooltip, not a target, so its 14×14 box was scored as 63px;
`overflow-x: auto` on the two pill groups forces `overflow-y: auto` with it, so
every 44px target inside them was being clipped back to the 36px and 33px
tracks; and the sector rows are 35.3px on desktop, where the 44px rule was
scoped to the mobile breakpoint only. Hit-testing found **17** controls under
44px, not four. All 17 are fixed:

* **7 period pills** and **6 mode/view switch buttons** — the pill keeps the
  reference's 30px and 27px box; the scrolling track's block padding goes from
  3px to 7px and 8.5px so it can hold the target instead of clipping it. This
  also un-clipped the focus ring, which had 5px of outline to show in 3px of
  padding.
* **2 `?` help icons** — 14×14 by design and inline inside a `<dt>`. `::after`
  is the tooltip, so the target is a 44×44 `::before` centred on the glyph. The
  two icons are 100px apart, so their targets cannot meet.
* **8 sector rows** — stacked full-width rows, where a 44px target over a 35px
  box would overlap the rows above and below, so the box itself grows to 44.
  It costs nothing: the sector panel's content is 451px inside a panel the
  company ranking already stretches to 708px, so the grid does not move.
* **4 balance segments** — these keep the reference's 20px band, because their
  painted width is a real quantity: foreign buying on 2026-08-20 was 0.1% of
  the session, so that segment is 1px wide. Widening the paint would be a lie
  about the proportion, and giving both sides 44px would overlap two adjacent
  controls. Instead `tileTargets` measures the track and tiles the two
  invisible targets across it — whichever side is painted under 44px is clamped
  to 44 and the other yields exactly that much. Verified: on the session bar
  the two targets are 461px and 44px on a 505px track, summing to 505 with no
  overlap.

Nothing else moved. The chart plot is 236px, the company rows 51px and the hero
cards 322.9px, all unchanged.

**Observed, outside this phase.** On `/statistics` (Phase 4, approved) the
activity chart's leftmost x-axis label overlaps the «مجموع الفترة» caption
beneath it at 1440. Present before this phase and untouched by it.

---

Phase 5 complete. Stopping here — no later route started.
