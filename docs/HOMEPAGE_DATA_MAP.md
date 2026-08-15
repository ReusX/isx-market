# Homepage data map

Audited **15 August 2026** against production, before any UI was written — §4
of the Phase 1 brief is explicit that the UI must not be built first and then
have data found to fit it.

Every figure below was read from the live database, not inferred from the code.

---

## 1 · Element → source

| Homepage element | source | period | timestamp | transformation |
|---|---|---|---|---|
| ISX60 level | `daily_index.isx60` | latest session | `daily_index.date` | none |
| ISX60 change | `daily_index.isx60` | latest vs **prior row**, not prior calendar day | `date` | `now − prev`, and `/prev × 100` |
| ISX60 chart | `daily_index` | trailing 400 days | per row | none; 5Y/ALL fetch on demand |
| قيمة التداول | `daily_index.total_value` | latest session | `date` | none |
| حجم التداول | `daily_index.total_volume` | latest session | `date` | none |
| الصفقات | `daily_index.total_trades` | latest session | `date` | none |
| breadth | `daily_prices.close`, latest vs prior session | latest session | `date` | derived — see §4 |
| sector movement | `daily_prices` + `companies.json` | latest session | `date` | market-cap-weighted mean of `pct` |
| الشركات الأكثر حركة | `daily_prices` + `companies.json` | latest session | `date` | sort by the chosen metric |
| 7D sparkline | `daily_prices.close` | trailing 7 sessions | per row | none |
| تدفق المستثمر الأجنبي | `foreign_flow_company_daily.value` | latest session | `date` | Σ by `side` |

`companies.json` supplies name, sector, logo and share count only. It carries a
`mcap` field that is **static and stale** — market cap is recomputed as
`price × shares` at read time, never taken from the file.

---

## 2 · Canonical period — all three sources agree

The homepage mixes three tables, and each defines "latest" independently. They
were checked against each other rather than assumed:

```
daily_prices                (prices, breadth, sectors, table)  2026-08-13
daily_index                 (ISX60, value, volume, trades)     2026-08-13
foreign_flow_company_daily  (foreign flow)                     2026-08-13
```

**All three agree.** That is a fact about today, not a guarantee: the pipelines
are independent and can diverge. The implementation therefore resolves ONE
canonical session and labels every module with it, rather than each module
saying "latest" and meaning its own.

⚠ Sessions are not consecutive calendar days — the last three are 08-13, 08-11,
08-10. Any label implying "yesterday" would be wrong; the change is against the
**prior session**, and the date is stated.

`/statistics/foreign-flow` resolves its window the same way (max date in the
same table), so the homepage and the detail page cannot disagree.

---

## 3 · §5 foreign-flow reconciliation — PASSES

Session **2026-08-13**, 7 rows (3 buy, 4 sell):

| | IQD |
|---|---|
| FB foreign buy | 17,824,831 |
| FS foreign sell | 138,314,170 |
| net (FB − FS) | **−120,489,338** |
| M market traded value, same session | 940,677,115 |

| condition | result |
|---|---|
| `FB ≤ M` | 17,824,831 ≤ 940,677,115 ✅ |
| `FS ≤ M` | 138,314,170 ≤ 940,677,115 ✅ |
| `FB + FS ≤ 2M` | 156,139,001 ≤ 1,881,354,230 ✅ |

Foreign share of traded value: **1.9 % buy, 14.7 % sell.** Plausible for ISX.

The old homepage's scale contradiction is **not present in this tree** — a grep
for the hard-coded `318.7B` (P1-9) returns nothing. It was removed before this
phase.

Per-company values also reconcile with the index totals: Σ `daily_prices.value`
= 937,835,310 against `daily_index.total_value` = 940,677,115, a ratio of
**0.9970**.

---

## 4 · §10 breadth — a real finding

Counting 2026-08-13 against the prior session 2026-08-11:

| category | count |
|---|---|
| advancing | 14 |
| declining | 14 |
| unchanged | 13 |
| **no prior close — change is UNKNOWN** | **8** |
| total rows | 49 |

`daily_index.traded_companies` for the same session is **49**, so the
denominator is confirmed rather than assumed.

**The existing homepage reports 14 / 21 / 14.** Those 8 companies with no prior
close are being counted as *unchanged*. They are not unchanged — a company with
no prior close has an **unknown** change, and calling it unchanged states a fact
about the market that is not in the data.

This is exactly the `—` versus `0` rule from the decision log, and it is the
one place the homepage currently breaks it. The redesigned breadth module
reports **four** categories, with the fourth shown honestly rather than folded
into the third.

---

## 5 · Metrics available but unused

`daily_index` populates `traded_companies` (49) and `listed_companies` (103) on
every recent session. Neither appears on the current homepage. They are the
honest denominator for breadth — "49 of 103 listed companies traded" — and cost
nothing extra, since the row is already fetched.

---

## 6 · What is NOT available

Nothing in the approved homepage design requires a metric the sources lack. No
substitution was needed and none was made.
