# `/statistics/foreign-flow` — data map

Phase 5 audit gate. Written **before** any UI work, from the live production
database (`qmedwacwicutqojngqhi`), the reference app at
`/Users/amed/iqwealth-design`, and the shipped route in this repo.

Every figure below was read from the database on **2026-08-20**, not from a
summary. Probe transcripts are in the session log; the reproducible queries are
quoted inline.

---

## 1 · Exact production route

| | |
|---|---|
| Route | `/statistics/foreign-flow` |
| File | `app/statistics/foreign-flow/page.tsx` |
| Rendering | static shell + client module (`○` prerendered) |
| Parent | `/statistics` (Phase 4, approved) |
| Siblings | `/statistics/ownership`, `/statistics/shareholders` — **not** migrated |

### Metadata / canonical (already correct, kept)

* `alternates: seoAlternates('/statistics/foreign-flow')` — self-canonical.
* `openGraph.url = absUrl('/statistics/foreign-flow')` — agrees with canonical.
* `og:image` → `/opengraph-image` 1200×630.
* No `/en`, no hreflang, no hidden copy. Robots inherit the site default.
* Title/description are rewritten in this phase because the shipped ones assert
  «اليوم» and «مباشر» (see §9).

---

## 2 · Source tables

| Table | Grain | Rows | Span | Used for |
|---|---|---|---|---|
| `foreign_flow_company_daily` | date · ticker · side | **28,381** | 2010-03-29 → **2026-08-20** | **everything on this route** |
| `daily_index` | date | 3,785 sessions | 2010-01-08 → 2026-08-20 | the trading-session calendar, official listed count |
| `foreign_flow_daily` | date · side | 1,867 | 2022-08-01 → 2026-07-30 | **zero-proof oracle only** (§5) |
| `foreign_flow_sector` | year · month · sector · side | 424 | monthly | **validation only** (§7) |
| `ownership_monthly` | year · month · company | 1,822 | 2025-01 → 2026-07 | the ownership panel (a different quantity) |
| `depository_monthly` | year · month · company | 903 | 2020-07 → 2026-07 | **UNUSABLE — see §11** |

Columns actually read: `date, ticker, side, trades, volume, value`.
`volume` is not displayed anywhere on this route (share counts and dinar values
are different units and the reference never mixes them).

### Why `foreign_flow_company_daily` is the single source

`foreign_flow_daily` looks like the natural session-level table and is not
usable as one:

* it **stops at 2026-07-30** — 21 days behind the per-company table;
* it **starts at 2022-08-01** — 12 years short;
* on the 915 sessions the two tables share, **60 disagree** on buy or sell
  value (6.6%). Most recent disagreement: **2026-05-19**, buy differs by
  22,166,942 IQD. Distribution: 2022 8/101 · 2023 32/227 · 2024 11/235 ·
  2025 7/223 · 2026 2/129.

The Homepage (`lib/homeData.ts` → `computeFlow`) and the Statistics Hub
(`StatisticsClient.tsx` → the `foreign` mode) both already read
`foreign_flow_company_daily`. This route joins them rather than introducing a
third answer. The 60-session disagreement is recorded as a **pipeline defect**
in §12; it is not papered over in UI copy.

Spot reconciliation on the sessions that do agree (value, IQD):

| Session | `foreign_flow_daily` buy / sell | company rows summed |
|---|---|---|
| 2026-07-30 | 12,006,317 / 20,260,500 | 12,006,317.47 / 20,260,500 |
| 2026-07-28 | 14,031,857 / 97,067,025 | 14,031,856.95 / 97,067,024.67 |
| 2026-06-15 | 169,650,059 / 16,001,797 | 169,650,059.11 / 16,001,797.22 |
| 2025-12-01 | 25,345,440 / 27,415,000 | 25,345,440 / 27,415,000 |

Trade counts reconcile on the same sessions (17+47 = 64, 29+19 = 48, 11+10 = 21,
10+35 = 45).

---

## 3 · Buy · sell · net — one definition

Identical to `lib/homeData.ts::computeFlow`, promoted to `lib/foreignFlow.ts`
so all three surfaces import the same function:

```
buy (session)  = Σ value  where side = 'buy'
sell (session) = Σ value  where side = 'sell'
net (session)  = buy − sell          ← always, everywhere, signed
gross          = buy + sell          ← "activity", never called net
```

`value` is the traded value in IQD of shares bought (or sold) by non-Iraqi
investors, summed across the نظامي / ثاني / غير مفصحة markets by the parser
(`supabase/migrations/20260616_foreign_flow_company_daily.sql`).

A window's totals are the sums of its sessions' buy and sell — never a sum of
nets, never a sum of percentages.

**Flow is not ownership.** Flow is what was traded in a period;
ownership is what is held on a date. They come from different tables, sit on
different panels, and neither is derived from the other.

---

## 4 · Session / window resolution

`latest session on this route = 2026-08-20` — the max `date` in
`foreign_flow_company_daily`. `daily_index` also ends 2026-08-20, so this route
has **no lag** against the market calendar today.

The window calendar is the **trading-session calendar from `daily_index`**, not
the set of dates that happen to carry flow rows. Reason: the last 22 sessions
that carry flow rows are not the last 22 trading sessions, and a window whose
own gaps are invisible cannot report its gaps. It also makes `1M` on
`/statistics` and `1M` here cover exactly the same dates.

Periods are the approved seven, reused verbatim from `lib/statistics.ts`:

| id | label | sessions | start | end | flow-covered | proven zero | unknown |
|---|---|---|---|---|---|---|---|
| 1M | شهر | 22 | 2026-07-19 | 2026-08-20 | 22 | 0 | 0 |
| 3M | ٣ أشهر | 66 | 2026-05-07 | 2026-08-20 | 66 | 0 | 0 |
| 6M | ٦ أشهر | 132 | 2026-01-20 | 2026-08-20 | 132 | 0 | 0 |
| 1Y | سنة | 250 | 2025-07-22 | 2026-08-20 | 250 | 0 | 0 |
| 3Y | ٣ سنوات | 750 | 2023-05-03 | 2026-08-20 | 750 | 0 | 0 |
| 5Y | ٥ سنوات | 1,250 | 2021-02-24 | 2026-08-20 | 1,250 | 0 | 0 |
| ALL | الكل | 3,527 | 2010-03-29 | 2026-08-20 | 3,527 | — | — |

(The counts above are flow-session counts; the index-calendar counts and the
per-window coverage line are computed at render time and printed on the page.)

Sessions are **trading sessions, not calendar days** — the last five are
08-20, 08-19, 08-18, 08-17, 08-16. Nothing on the route says «اليوم»,
«أمس», «مباشر» or «live».

No intraday period is offered, because the source has no intraday grain.

---

## 5 · Missing sessions — zero vs unavailable

Across the 3,779 `daily_index` sessions inside the flow span, **252 carry no
row** in `foreign_flow_company_daily`. They are not all the same thing:

| Class | Count | Evidence | Rendered as |
|---|---|---|---|
| **Proven zero** | 16 | `foreign_flow_daily` has that date with `buy = 0`, `sell = 0`, `companies = 0` | `0` — a real bar of height zero |
| **Known gap** | 3 | `foreign_flow_daily` reports non-zero activity but no company rows exist: **2023-05-30, 2024-11-24, 2025-10-02** (e.g. 2025-10-02 = 104,000,000 buy / 55,304,800 sell) | `—`, no bar plotted |
| **Unknown** | 233 | before 2022-08-01, outside the oracle's span | `—`, no bar plotted |

Two dates carry flow rows but are absent from `daily_index`
(2014-01-21, 2014-03-16). They are kept — the flow observation is real — and
counted in the coverage line.

**Inside a covered session**, absence has a different and provable meaning.
`foreign_flow_company_daily` contains **zero rows with `value = 0` and zero rows
with a NULL `value`, `volume` or `trades`** (verified: `value=is.null` → 0,
`value=eq.0` → 0, `trades=is.null` → 0, `volume=is.null` → 0). The parser writes
a row only for non-zero activity. Therefore, within a session that has rows:

* a side with no row → foreign activity on that side was **`0`**;
* a company with a buy row and no sell row → its foreign sell was **`0`**;
* a company with no row at all → it is **absent from the ranking**, never a zero
  row, because a zero would assert that foreigners looked at it and passed.

The old page renders neither of these correctly — it coerces with `?? 0` and
prints a muted separator for zero. Both are fixed here.

---

## 6 · Signed daily flow and cumulative flow

Two distinct series, two modes, never overlaid.

**Signed per-bucket flow** — discrete columns from a shared zero rail:

```
bucket.net = Σ(buy over the bucket's observed sessions)
           − Σ(sell over the bucket's observed sessions)
```

Columns are never joined by a line. A line between two sessions asserts values
in between that were never observed. (The shipped page draws exactly that line —
`NetTrend` strokes a `<path>` across the tops of discrete columns. It is
removed.)

**Cumulative flow** — a continuous line, correct here and only here:

```
cum[0] = net[0]
cum[i] = cum[i-1] + net[i]
```

* **Start point:** 0 at the first *observed* bucket of the **selected window**,
  never at the beginning of the record. Labelled «الرصيد التراكمي خلال الفترة».
* Unobserved sessions contribute nothing — they are skipped, not added as 0,
  and not interpolated.
* The running sum is over signed session values, never over percentages, and the
  two modes are never mixed in one axis.

Endpoint check: `cum[last] === window.net` for every period, by construction and
asserted in the verification pass.

### Grain

`ALL` is 3,527 sessions and a 1,134px plot cannot show them, so buckets follow
the reference's rule. The bucket unit is always printed, so a monthly total can
never be mistaken for a session.

| Period | Grain |
|---|---|
| 1M, 3M | session |
| 6M, 1Y | week |
| 3Y, 5Y | month |
| ALL | year |

---

## 7 · Company-level flow and reconciliation

Company rows are the **same table**, grouped by ticker over the same window.
Reconciliation is therefore exact by construction, not by scaling:

```
Σ company.buy  ≡ window.buy
Σ company.sell ≡ window.sell
Σ company.net  ≡ window.net
```

No row is scaled, and no residual «أخرى» bucket is invented. The reference app
generates company activity from a profile and renormalises it; the real source
has the rows, so they are aggregated directly.

**Ticker → sector.** 102 distinct tickers appear across the full history;
**11 do not exist in `/data/companies.json`** (`INSD, IMPI, SBMC, INFI, BDFD,
VQUF, IKFP, MTAI, MTNO, MTNN, BWAI` — delisted or renamed). Across the most
recent 90 sessions, **0** are unmapped. Unmapped tickers keep their flow (the
value is real) and fall into an explicit «غير مصنّف» sector bucket that is only
rendered when it is non-empty, with the count disclosed. Their display name
falls back to the ticker.

**Sector validation against `foreign_flow_sector`, 2026-07** — company rows
aggregated by sector versus the monthly sector table:

| Sector | derived buy | `foreign_flow_sector` buy | derived sell | table sell |
|---|---|---|---|---|
| Telecommunication | 74,370,651 | 74,370,651 | 625,317,856 | 625,317,856 |
| Industry | 47,936,479 | 47,936,479 | 18,293,613 | 18,293,613 |
| Services | 39,600,000 | 39,600,000 | 30,004 | 30,004 |
| Agriculture | 1,111,630 | 1,111,630 | 0 | 0 |
| Tourism&Hotels | 4,500,000 | 4,500,000 † | 144,800 | 144,800 † |
| **Banks** | **1,505,211,078** | **23,383,096** | 24,461,270,913 | 24,461,270,913 |

† stored under the alias `Hotels`, the same alias family Phase 4 normalises.

Every sector reconciles to the dinar except **Banks buy, where the monthly
sector table is short by 1,481,827,982 IQD**. The per-company table agrees with
`foreign_flow_daily` on the individual July sessions, so the sector table is the
one that is wrong. `foreign_flow_sector` is therefore used for **validation
only** and never rendered. Recorded as a pipeline defect in §12.

---

## 8 · Percentage denominators

Every percentage on the route, with its exact denominator:

| Figure | Numerator | Denominator | Zero-denominator |
|---|---|---|---|
| Balance bar, buy share | window buy | window buy + sell | bar renders empty, figures show `—` |
| Balance bar, sell share | window sell | window buy + sell | same |
| Company «من النشاط الأجنبي» | company buy + sell | Σ over window of buy + sell | row hidden (window has no activity) |
| Sector «من النشاط» | sector buy + sell | same window gross | same |
| «استمرارية الشراء» | sessions with net > 0 | **observed** sessions in the window | shows `—` |
| Ownership «حصة الأجانب» | Σ `foreign_shares` | Σ (`iraqi_shares` + `foreign_shares`) | shows `—` |

Deliberately **not** shown: foreign value ÷ total market traded value. It is
computable from `daily_index.total_value` and the reference omits it; adding a
ratio the approved composition does not carry is out of scope for this phase.
Noted as available.

---

## 9 · What the shipped page does, and what changes

`app/statistics/DailyForeignFlow.tsx` (282 lines), `DailyForeignFlowFull`:

* one query, `foreign_flow_company_daily` with a **120-day cutoff**;
* four stat tiles — buy / sell / net / active companies — **latest session only**;
* a proportional buy/sell bar, latest session;
* a 30-session net sparkline **with a line drawn across discrete columns**;
* a three-way switch over a ranked company list, rows linking to `/c/[ticker]`;
* loading = one 420px skeleton; empty = one line of centred text; **no error
  state**, no period control, no cumulative series, no sector view, no
  ownership context, no coverage statement.

Defects carried by the shipped route, all fixed in this phase:

1. `BackHeader … live` and the hub preview badge «مباشر» assert a liveness the
   daily pipeline does not have. → removed; the exact session date is printed.
2. Title «تدفق المستثمر الأجنبي اليوم» and the subtitle «يُحدَّث يومياً» —
   «اليوم» is only true when the latest session is today. → retitled.
3. `e.buy += r.value ?? 0` and `e.trades += r.trades ?? 0` coerce null to zero.
   (Harmless today — there are no nulls — but it is the wrong rule.)
4. `NetTrend` joins discrete session columns with a `<path>`. → bars only.
5. `trend` is computed over all 120 days while the tiles are one session; both
   are presented under one heading with no window label.
6. The row breakdown prints `buy / sell` separated by a muted `·`-style
   separator with no zero/unavailable distinction.

---

## 10 · Composition to port (reference)

Files read: `app/statistics/foreign-flow/ForeignFlowDetail.tsx` (552),
`FlowChart.tsx` (377), `flowData.ts` (369), `app/statistics/statsData.ts`,
and the matching blocks of `app/globals.css`.

| # | Module | Data | Scope |
|---|---|---|---|
| 1 | back link → `/statistics` | — | — |
| 2 | header + period control | window | selected period |
| 3 | hero card A — latest session | 2026-08-20 | one session |
| 4 | hero card B — selected period | window | selected period |
| 5 | net / cumulative chart (canvas) | buckets | selected period |
| 6 | company activity, 4 views, top 10 | company rows | selected period |
| 7 | sector allocation | derived from company rows | selected period |
| 8 | foreign ownership summary | `ownership_monthly` 2026-07 | **its own month** |
| 9 | ~~holder structure~~ | `depository_monthly` | **omitted — §11** |

Chart is the reference's **canvas** implementation, ported: value axis in the
right gutter (`AXIS_W = 58`), `PAD = {top:16, right:10, bottom:26, left:8}`,
zero rail drawn last, hover crosshair, readout strip, PNG copy/download. Canvas
coordinates are not mirrored by RTL, which removes the axis-mirroring class of
bug entirely.

### CSS namespace

The reference page uses `.ff-*`, `.st-*`, `.cd-*`, `.pl-*`, `.mv-error`,
`.fn-help`. Grep of this repo's stylesheets found real collisions:
`.st-head`, `.st-title`, `.st-switch`, `.st-chart`, `.mv-error` **all already
exist** here with different definitions. Every ported selector is therefore
renamed to a single **`.ffw-*`** namespace with values copied unchanged, in
`app/statistics/foreign-flow/foreign-flow.css`. `.ff-*`, `.cd-*`, `.pl-*` and
`.fn-*` have zero matches in this repo but are namespaced too, so the page has
one prefix rather than five.

Adaptations, and only these: `.iq-dark` / `.iq-light` page-root classes →
`[data-theme]` on `<html>` (this app has one theme system, set pre-paint), and
the three font variables gain this repo's fallback stacks.

### Table columns / chart series

Company row: rank · name · ticker · signed-or-side bar · value · chevron, with
buy / sell / net / share of foreign gross in the hover readout. Four views:
أكبر صافي شراء · أكبر صافي بيع · أكبر شراء · أكبر بيع. Sorting is numeric on
the view's own figure; a company with nothing on the chosen side is filtered
out, not shown as zero. Top 10 rendered, full count disclosed in the footer.

Links go to **`/c/[sym]`**. (The reference links to `/companies/[symbol]`,
which is that app's route, not this one. `/analysis` is not used.)

---

## 11 · A reference module the real source cannot support

**بنية الحاملين (holder structure)** — the reference's final panel, built on
`depository_monthly.individual_iraqi / individual_foreign / entity_iraqi /
entity_foreign`.

In production, **all 903 rows have `individual_foreign` NULL and
`entity_foreign` NULL**; `entity_iraqi` is NULL in 712 of 903 and
`individual_iraqi` in 350 of 903. A filtered query for any row with a non-null
`individual_foreign` returns **zero rows**. The latest month, 2026-07, has 24
companies, and the non-null Iraqi counts it does carry are implausible
(مصرف بغداد = 2 individual holders).

There is no foreign-holder count in this table. Per §3 of the brief this is
**reported, not proxied**: the panel is omitted, no substitute is synthesised
from ownership counts, and the omission is stated in the completion report.
`ownership_monthly.foreign_count` is a per-company holder count and *is* used —
but only inside the ownership panel, where it is labelled as what it is.

---

## 12 · Pipeline defects found (backlog, not fixed in this phase)

1. `foreign_flow_daily` disagrees with `foreign_flow_company_daily` on **60 of
   915 shared sessions**, most recently 2026-05-19.
2. `foreign_flow_daily` has not been written since **2026-07-30**, 21 days stale.
3. `foreign_flow_sector` 2026-07 under-reports **Banks buy by 1,481,827,982 IQD**.
4. `foreign_flow_company_daily` is missing company rows for 3 sessions where
   `foreign_flow_daily` reports real activity: 2023-05-30, 2024-11-24, 2025-10-02.
5. `depository_monthly` has never been written with foreign holder counts (§11).
6. `ownership_monthly.sector` is misaligned — «نقل المنتجات النفطية والبضائع»
   is labelled `Insurance`, «هالل صناعية» is labelled `Hotels`. The column is
   not read by this route.
7. `ownership_monthly.name_ar` carries lam-alef mojibake from the scanned-PDF
   parse («لالستثمار» for «للاستثمار»). Recovered at read time by the existing
   `matchCompanyName`, not repaired at source.
8. `ownership_monthly` is missing 2025-03 and 2025-05 (17 months stored between
   2025-01 and 2026-07).

---

## 13 · Loading / partial / stale / error

* **Loading** — skeleton blocks at the exact block sizes of the chart (236px)
  and the panels, so nothing reflows on arrival.
* **Partial** — the flow fetch and the ownership fetch are independent
  (`Promise.allSettled`). If ownership fails, the flow modules stay rendered and
  the ownership panel carries its own inline error. The reverse also holds.
* **Stale** — the exact latest available session is printed; there is no
  «مباشر» badge to go stale.
* **Error** — no raw PostgREST/Supabase message reaches the DOM.
* **Empty** — a window with no observed session prints the last session that did
  carry activity, with its date.

---

## 14 · Pagination, payload, performance

`foreign_flow_company_daily` is 28,381 rows; fetching all of it costs **2.28 MB
over 29 PostgREST requests in ~4.1 s** (measured). That is not an initial-load
payload, so the route loads **lazily by period**:

1. `daily_index?select=date&order=date.desc&limit=<period sessions>` — the
   window calendar. 22 rows at the default period, one request.
2. `foreign_flow_company_daily?…&date=gte.<window start>` — one request at
   1M/3M/6M, paginated for the long periods.
3. `foreign_flow_daily?…&date=gte.<window start>` — the zero-proof oracle,
   ≤ 2 requests.

Widening the period fetches only the older slice that is not already held;
narrowing refetches nothing. Default 1M costs ~4 requests and a few tens of kB.
Bucketing, totals, company aggregation and the cumulative sum are each a single
`useMemo` keyed on the window, so switching mode or view re-renders without
recomputing the window. No chart dependency is added — the chart is canvas.
