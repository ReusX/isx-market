# الإحصائيات (`/statistics`) — route data map

Audited **18 August 2026** against production, before any UI work — §2 of the
Phase 4 brief makes this a gate. Every count below was read from the live
Supabase REST endpoint, not from source or from a previous phase's notes.

**Two approved modules cannot be supported as designed. Both are named in §6,
with what ships instead.** Nothing is invented to fill their slots.

---

## 1 · Route and metadata

| | |
|---|---|
| production route | `/statistics` |
| rendering | prerendered `○`, client component under a static shell |
| `title` | «إحصائيات بورصة العراق · تدفق الأجانب والملكية» |
| canonical / OG | `https://iraqsm.com/statistics`, via `seoAlternates('/statistics')` |
| structured data | `Breadcrumbs` + `Freshness` in `app/statistics/layout.tsx` |
| subroutes | `/statistics/foreign-flow`, `/statistics/ownership`, `/statistics/shareholders` — **none migrated in this phase** |

The title still describes the page as a foreign-flow and ownership hub. The
approved design makes it a market-statistics workspace, so the copy needs to
follow — noted for the layout commit, not changed here.

---

## 2 · Tables, verified to exist with real rows

| table | rows | span | verdict |
|---|---|---|---|
| `daily_index` | **3,783** | 2010-01-08 → 2026-08-18 | ✅ the spine of the page |
| `foreign_flow_company_daily` | **28,374** | 2010-03-29 → 2026-08-18 | ✅ |
| `sector_monthly` | **1,331** | 2015-08 → **2026-07** | ⚠ see §4 |
| `company_caps_monthly` | **513** | 5 months only | ❌ see §5 |
| `monthly_prices` | 11,343 | 2011-02 → **2026-05** | lags two months; not needed |
| `depository_monthly` | 903 | → 2026-07 | ownership subroute, not this phase |
| `capital_events` | 38 | — | not in the approved hub |
| `financial_ratios_public` | 801 | — | ⚠ see §7 |
| `market_cap_sector` | — | **404, does not exist** | confirms §10's warning |

---

## 3 · `daily_index` — the one series everything periodic rests on

Floored at **2015-03-05**, the ISX60 rebase: **2,639 sessions**. The floor is
not stylistic, it is what makes the series complete.

| column | nulls, all history | nulls **since the rebase** |
|---|---|---|
| `total_value` | 269 | **0** — last null 2011-12-20 |
| `total_volume` | 0 | **0** |
| `traded_companies` | 0 | **0** |
| `listed_companies` | 387 | **0** — last null 2015-03-04 |
| `total_trades` | 328 | **59** — last null 2025-01-30 |

Coverage checks: 1Y window **235 of 235** sessions carry a value; 5Y window
**1,171 of 1,171**. So value, volume and both company counts are complete on
every period the control offers.

**`total_trades` has 59 real holes in the modern window (2.2%).** Per §8 those
are gaps in the line, never zero points, and any window total over trades
states its own coverage.

All seven periods (1M → الكل) are backed by stored rows.

---

## 4 · `sector_monthly` — repaired, and separately broken

§3 of the brief is confirmed exactly: **latest month `2026-07`**, June and July
both carry **10 sector rows**, and **`listed_companies` is null for all ten in
both months** — never fabricated, never read as zero.

**But the audit found a second defect the brief did not anticipate: the
`sector` column holds 17 distinct names for ~10 real sectors.**

Two different phenomena, and they need different treatment:

**a · Historical renames — sequential, safe to merge.**

| old | last seen | new | first seen |
|---|---|---|---|
| `Hotels` | 2020-04 | `Tourism&Hotels` | 2020-03 |
| `Telecom` | 2020-04 | `Telecommunication` | 2020-07 |

**b · Concurrent duplicate rows — NOT safe to merge.** These appear in the same
month as their twin and carry **zero activity**, sometimes with a market cap:

| alias | rows | rows with value = 0 |
|---|---|---|
| `Banking` | 56 | **56 of 56** |
| `Agricultur` | 13 | **13 of 13** |
| `Hotel` | 6 | **6 of 6** |
| `Services` | 85 | 44 |
| `Financial services` · `Money Transfer` · `Unknown` | 1 · 1 · 12 | — |

July 2026 shows the shape plainly: `Banks` = 98.1B traded across 30 companies,
and beside it `Banking` = **0 traded, 0 companies, 3.349T market cap**.

**Consequence:** sector *activity* (value, volume, trades, traded companies) is
sound once the zero-activity alias rows are dropped and the two renames merged
— they contribute nothing to an activity sum by construction. Sector *market
cap* is not. See §5.

---

## 5 · Market capitalisation — three sources, three answers

For the same month, **July 2026**:

| method | total |
|---|---|
| `sector_monthly`, naive sum of its 10 rows | **33.46T** |
| `sector_monthly`, excluding zero-activity alias rows | **29.90T** |
| `company_caps_monthly`, sum of 103 companies | **28.65T** |

A 17% spread between the highest and lowest. None can be verified against
another, which is what §10 requires before surfacing a market-cap figure.

`company_caps_monthly` is independently unusable anyway: it holds only **five
months**, and two of them are corrupt —

| month | companies | total market cap | null |
|---|---|---|---|
| 2026-07 | 103 | 28.65T | 0 |
| **2026-06** | 101 | **65.68** | 26 |
| **2026-05** | 101 | **97.81** | 24 |
| 2026-04 | 104 | 26.53T | 0 |
| 2026-02 | 104 | 25.32T | 0 |

65.68 and 97.81 are not market caps in IQD; the loader wrote a different unit
or failed mid-parse. **Recorded as a pipeline defect, not worked around.**

**What ships instead.** Market-cap structure uses the product's *existing
canonical definition* — `last_close × issued shares`, the same figure
`/market`, `/screener` and the homepage already print — labelled «لقطة حالية»
against the current session date. It is self-consistent with every other route,
verifiable, and it is a snapshot rather than a monthly history, which is stated
on the module. **No per-sector market cap is shown at all**, because the only
per-sector source is the double-counted one.

---

## 6 · Modules: supported, adapted, omitted

The approved design has six modes. What each can honestly be:

| mode | scope | verdict |
|---|---|---|
| **النشاط** activity | period | ✅ full — `daily_index` since the rebase |
| **التدفق الأجنبي** foreign | period | ✅ full — existing reconciled model, no new definition |
| **القطاعات** sectors | month | ⚠ **adapted** — activity metrics for the exact month `2026-07`; **no sector market cap** (§4b, §5) |
| **الشركات** companies | snapshot | ⚠ **adapted** — ranked from live `daily_prices` + `companies.json`, not from the 5-month `company_caps_monthly` |
| **التقييم** valuation | snapshot | ⚠ **adapted** — TTM P/E from `financial_facts_public` (30 of 82 active), median-led, coverage stated. **No dividend yield** (§7) |
| **بنية السوق** structure | snapshot | ⚠ **adapted** — concentration from the live canonical market cap (§5), never from the monthly tables |

**Nothing is omitted entirely**; two modules are narrowed, and every narrowing
is a removed claim rather than a substituted one.

---

## 7 · Claims that have no support, and are not made

- **Dividend statistics.** `financial_ratios_public` holds **6** `dividend_yield`
  rows in total. §3 is explicit: not invented, not shown, not a stated-empty
  panel pretending to be a section.
- **Listing age.** No `listing_date` column anywhere in the schema.
- **Export statistics.** No such table.
- **Index contribution / ISX60 weights.** No constituent weights are stored.
  Market-cap share is labelled market-cap share and never as index weight.
- **Composite scores.** None. Every derived figure in §8 is two stored numbers
  divided by each other.

---

## 8 · Derived metrics — formula, source, unit, null, exactness

| metric | formula | source | unit | null behaviour | exact? |
|---|---|---|---|---|---|
| window total | `Σ total_value` over the window | `daily_index` | IQD | sessions with a null metric are excluded and the coverage is stated | exact |
| mean per session | `Σ metric ÷ sessions counted` | `daily_index` | IQD/سهم/صفقة | divisor counts only non-null sessions | exact |
| median session value | middle of the sorted window | `daily_index` | IQD | — | exact |
| period change | `(last − first) ÷ first` | `daily_index.isx60` | ٪ | null when either endpoint is missing | exact |
| market cap | `last_close × shares` | `daily_prices` + `companies.json` | IQD | `—` where the share count is absent (20 tickers) | exact |
| concentration | `Σ top-N mcap ÷ Σ all mcap` | as above | ٪ | companies without a mcap leave both sides | exact |
| sector share | `sector value ÷ Σ sector value` | `sector_monthly`, aliases dropped | ٪ | `—` if the month has no rows | exact |
| P/E median | middle of the available TTM ratios | `financial_facts_public` | × | coverage printed beside it — 30 of 82 | exact over its coverage |
| foreign net | `Σ buy − Σ sell` for the window | `foreign_flow_company_daily` | IQD | `—` when the window has no rows | exact |

Nothing is marked `≈`, because nothing needed to be.

---

## 9 · Period truth per module

Three different cadences, never merged into one timestamp:

| module | period label | source of the label |
|---|---|---|
| activity | «الفترة المحددة · {from} → {to}» | first and last session actually in the window |
| foreign | «{from} → {to}» — its **own** window | `foreign_flow_company_daily`; latest is 2026-08-18, same as the index today, and the module says so rather than assuming it |
| sectors | «شهر تموز 2026» — the exact month | `sector_monthly` latest = 2026-07, **two sessions behind** the daily data |
| structure · companies · valuation | «لقطة حالية · جلسة {date}» | the canonical session from `daily_prices` |

No «اليوم», no «أمس», no «مباشر» anywhere.

---

## 10 · Null versus zero

`—` for unavailable, `0` for a measured zero, applied to: sector counts,
market cap, foreign activity, chart observations and historical series. The 59
`total_trades` holes are gaps in the line, not zero points. Null
`listed_companies` on all ten sector rows renders `—`.

---

## 11 · Company-name hygiene (§4 of the brief)

Any company identity shown here resolves through the same `usableName` guard
Phase 3 introduced: `companies.json` wins, the metrics table is a fallback, and
a value made only of digits is rejected. The upstream defect — 54 of 124
`company_metrics.name_ar` values are bare row indices — is unchanged and
remains recorded in `docs/SCREENER_REPORT.md` §18 as a pipeline fix, not a
route fix.

---

## 12 · CSS collision check (§20)

`grep` for `.stw-*` across `app/globals.css`, `styles/*.css` and every route
stylesheet: **zero matches**, and zero in any component. The reference's own
`.stw-*` family therefore ports verbatim, as `.sc-*` did for the screener.

Legacy `/statistics` selectors that will need the §21 proof-then-delete pass:
`statistics-page`, `statistics-hero`, `statistics-hero-grid`, `statistics-masonry`,
`statistics-card`, `statistics-secondary`, `stat-card`, `stat-grid`, `stat-tile`,
`stat-panel` and their relatives — **several are shared with the three detail
subroutes**, which are not migrated in this phase, so only the ones proved
exclusive to the hub may go.

---

## 13 · Pipeline defects recorded, not fixed here

1. **`sector_monthly.sector` has 17 names for ~10 sectors**, including
   concurrent zero-activity duplicates (`Banking`, `Agricultur`, `Hotel`) that
   double-count market cap.
2. **`company_caps_monthly` is corrupt for 2026-05 and 2026-06** — totals of
   97.81 and 65.68 where trillions are expected, with 24 and 26 nulls.
3. **`sector_monthly.listed_companies` is null for every recent row** (known,
   §3 of the brief).
4. **`market_cap_sector` does not exist** while `load_to_supabase_v2.py` writes
   to it — the schema drift the reference audit flagged, still present.
5. `monthly_prices` lags `sector_monthly` by two months (latest 2026-05).
