# فارز الأسهم (`/screener`) — route data map

Audited **17 August 2026** against production, before any UI work — §1 of the
Phase 3 brief makes this a gate. Every count below was read from the live
Supabase REST endpoint or off the rendered page, not from source.

---

## 1 · Route and metadata

| | |
|---|---|
| production route | `/screener` |
| rendering | prerendered `○` — a client component under a static shell |
| `title` | «فارز الأسهم العراقية · فلترة أسهم بورصة العراق» |
| `canonical` | `https://iraqsm.com/screener`, via `seoAlternates('/screener')` |
| `openGraph.url` | `absUrl('/screener')` — agrees with canonical |
| structured data | `Breadcrumbs` + `Freshness` in `app/screener/layout.tsx` |
| robots | indexable, no override |

All correct and already routed through `lib/seo.ts`. **Nothing in the metadata
changes.**

---

## 2 · Company universe

| set | count |
|---|---|
| `company_metrics` rows | **124** |
| active (`days_since_trade` ≤ 60) | **82** |
| suspended (> 60) | **42** |
| present in `companies.json` (identity, logo, shares) | 104 |
| in metrics but with **no identity row** | **20** |

⚠ Those 20 tickers — `BDFD`, `IEAB`, `IKFP`, `IMPI`, `INFI`, `INSD`, `MTAH`,
`MTAI`, … — have prices but no Arabic name, no logo and **no share count**, so
they can never carry a market cap. They are real listings, not junk; they must
not be dropped, and their market-cap cell must read `—`.

---

## 3 · Data sources

| what | source |
|---|---|
| prices, period closes, 52-week band, liquidity, foreign flow | `company_metrics` (Supabase), one row per ticker |
| identity, sector label, logo, issued shares | `public/data/companies.json` via `fetchCompanyMeta()` |
| TTM P/E | `lib/fundamentals.fetchTtmPe()` over `financial_facts_public` — a **second request that is allowed to fail** |

No new source and no new query are needed.

`company_metrics` columns, all 19: `ticker`, `name_en`, `name_ar`, `sector`,
`last_date`, `last_close`, `prev_close`, `close_1w`, `close_1m`, `close_3m`,
`close_yend`, `close_52w`, `high_52w`, `low_52w`, `avg_value_20d`,
`avg_value_90d`, `trading_days_30`, `days_since_trade`, `ff_net_30d`.

`avg_value_90d` and `trading_days_30` exist but are **not** surfaced by the
approved design and are not added here.

---

## 4 · Filter inventory · `UI filter → field → type → null → unit → operator`

| UI filter | real field / source | type | null semantics | unit | operator |
|---|---|---|---|---|---|
| القطاع | `company_metrics.sector` | categorical, 10 values | never null | — | equals |
| البحث | `ticker` · `name_ar` · `name_en` | text | `name_*` null for 10 rows → that field simply does not match | — | contains |
| حالة الإدراج | `days_since_trade` | derived boolean | never null (0 = traded today) | days | `> 60` |
| السعر | `last_close` | number | never null on an active row | IQD | min / max |
| التغيّر | `(last_close − close_<period>) / close_<period>` | number | **null when the period close is null** (1–8 rows depending on window) | ٪ | min / max |
| الموقع من مدى ٥٢ أسبوعاً | `high_52w` / `low_52w` | number 0–100 | null when either bound is null or `high ≤ low` — **2 of 82 active** | ٪ | min / max |
| السيولة اليومية | `avg_value_20d` | number | present for **82 of 82** active | مليون IQD | min / max |
| القيمة السوقية | `last_close × companies.shares` | number | null for the 20 orphan tickers and where `shares` is absent — **80 of 82** active | مليار IQD | min / max |
| صافي الأجانب ٣٠ يوماً | `ff_net_30d` | number | **never null — see §5** | مليون IQD | min / max |
| مكرر الربحية (TTM) | `fetchTtmPe()` | number > 0 | **null for 52 of 82 active** | — | min / max |

### Filters the approved reference shows that the data DOES support
All seven range metrics above, and all eight presets. Nothing in the reference
screener is unsupported.

### Filters the brief lists that the data does NOT support — not built
**P/B, ROE and dividend yield.** `financial_facts_public` carries `net_income`,
`pretax_income` and `paid_capital` only. There is no book value, no equity
line, no dividend record of any kind, anywhere in the schema. Per §4 and §5 of
the brief these are **not invented**. The approved reference reaches the same
conclusion in `screenerData.ts`: *"No dividend data of any kind. No book value,
no revenue, no margins, no float, no beta."*

---

## 5 · Null semantics — the three cases that are not alike

**a · P/E is null for 52 of the 82 active companies.** Measured live on the
rendered page: 30 present, 52 missing. Two distinct causes, both correctly
yielding "no ratio":

- no published financials — at most **42 of 124** tickers have both
  `net_income` and `paid_capital`, so 82 can never produce one;
- **loss-making** — `fetchTtmPe` returns nothing when TTM net income or EPS is
  ≤ 0. This is the §5 requirement already satisfied: a negative P/E is never
  printed and never treated as a small positive one.

A P/E range filter must therefore **exclude** null rows. Screening for "P/E
under 10" asks for companies whose P/E is known and under 10; two thirds of the
exchange does not qualify by virtue of being unmeasured.

**b · `ff_net_30d` is never null — 89 of 124 rows are a literal `0`.** This is
a *computed net*, not a gap: 13 of the companies sitting at 0 do appear in
`foreign_flow_company_daily`, so the pipeline writes 0 for "buys and sells
cancelled" and for "no foreign trades in the window" alike. Both are true
statements about foreign activity.

⚠ **The current implementation renders this zero as `·` (unavailable).**
`ForeignFlowValue` returns the muted dot on `!value`, which is true for 0. That
is the `—` versus `0` rule broken: it reports a measured zero as missing data.
Fixing it is part of this phase.

**c · Period change is null when its reference close is null.** 1 row for 1w,
3 for 1m, 5 for 3m, 7 for ytd, 8 for 52w. A change filter must exclude these
rather than read them as 0%.

**The hard rule, applied everywhere:** a null row is **excluded** from a
numeric range, never silently admitted. `—` stays unavailable, `0` stays an
actual zero, and no unavailable metric is coerced.

**And the converse, per §11:** a company missing one metric is not dropped from
filters about other metrics. A bank with no P/E still answers a liquidity
question.

---

## 6 · Ratio and derived-field definitions

| field | definition |
|---|---|
| period change | `(last_close − close_ref) / close_ref × 100`, ref chosen by the period control |
| 52-week position | `(last_close − low_52w) / (high_52w − low_52w) × 100`, clamped 0–100 |
| market cap | `last_close × shares`; ISX par is 1 IQD so `paid_capital` **is** the share count |
| liquidity | `avg_value_20d` — mean daily traded VALUE over 20 sessions, IQD |
| foreign net | `ff_net_30d` — net foreign buy − sell over 30 days, IQD, sign carries direction |
| P/E (TTM) | `price ÷ (TTM net income ÷ shares)`; TTM = `Q1 2026 + FY2025 − Q1 2025`, falling back to `Q1 2026 + Q4 2025 − Q1 2025`, then to the latest positive full year |

⚠ Market cap on a **suspended** name is `last_close × shares` where the close
may be years old. It is not a valuation and is suppressed rather than printed.

---

## 7 · Current behaviour

| aspect | behaviour |
|---|---|
| row count | all matching rows, no pagination (~82 active) |
| default sort | market cap, descending |
| sortable | every column, via `DataTable` `sortValue` |
| filters | sector · text · listing status · one of eight presets |
| presets | mutually exclusive **modes** — opaque, not inspectable, not combinable |
| numeric ranges | **none** |
| active filters | not shown as removable tokens |
| search | `ticker`, merged `name`, `name_en` |
| company link | `/c/[sym]` ✅ |
| mobile | `.shared-data-grid` collapses to 4 columns via a global media rule |
| loading | `DataTable` skeleton |
| empty | generic |
| error | **none — a failed fetch leaves an empty table with no message** |

---

## 8 · Gaps this phase closes

1. the approved filter workspace — presets that **write a visible, editable
   condition** instead of entering an opaque mode;
2. the seven numeric range filters, which the reference adds and flags as its
   one deliberate step past today's functionality (every one is a metric the
   page already computes and already prints);
3. active-filter tokens, individually removable, with clear-all;
4. `ff_net_30d === 0` rendered as a real zero, not `·`;
5. a real error state with retry;
6. a mobile filter sheet instead of compressed desktop controls.
