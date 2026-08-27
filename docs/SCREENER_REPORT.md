# فارز الأسهم (`/screener`) — completion report

Branch `implement/iqwealth-redesign`, 18 August 2026.
Answers the eighteen-point completion gate. `main` is untouched at `d2f60cc`
and the reference app's working tree is clean.

Both apps were run side by side and the reference route read and measured
before any CSS was written. Every number below is `getComputedStyle` /
`getBoundingClientRect` off the live pages, or a value read out of the rendered
DOM — not inferred from source.

---

## 1 · Production route

`/screener`, prerendered `○` (confirmed in the build output), a client
component under a static shell. Title, canonical, OG and the
`Breadcrumbs`/`Freshness` JSON-LD in `app/screener/layout.tsx` are unchanged
and verified in the served HTML: canonical and `og:url` both
`https://iraqsm.com/screener`.

## 2 · Reference files and CSS used

| reference file | what came from it |
|---|---|
| `app/screener/ScreenerWorkspace.tsx` | the composition: head, sticky workspace, preset row, advanced panel, active-filter band, listing row, results table, empty/error states, mobile sheet |
| `app/screener/screenerData.ts` | the metric set, the eight presets and their conditions, the period list, the group headings, the input scales |
| `app/globals.css` «فارز الأسهم» block | `.sc-*` in full, plus its dark counterpart and the 1240 / 1000 / 720 responsive blocks |

**Class names are the reference's own `.sc-*`, used verbatim.** §13 asks for a
collision grep first: this repo had **zero** `.sc-*` selectors in any
stylesheet and zero in any component, so there is nothing to double-style. (The
market board could not do this — `.mv-*` was already taken by Phase 0
primitives — which is why that route is `.mk-*`.)

**One duplication, deliberate and recorded.** The reference draws its table
language from the shared `.mv-*` layer that `/market` also uses. Here that
language lives in `app/market/market.css` under `.mk-*`, and Market Movement is
approved and frozen — so rather than refactor an approved route mid-phase, the
board/table rules are a second copy under `.sc-*` carrying identical values.
This is real debt. The moment a third route needs a table, `.mk-*` and `.sc-*`
should be lifted into one `.iq-board` layer keyed off `.iq-page`, exactly as the
reference did when its screener first needed one.

## 3 · Data sources

Audited in full in `docs/SCREENER_DATA_MAP.md` before any UI.

| what | source |
|---|---|
| prices, period closes, 52-week band, liquidity, foreign flow | `company_metrics` — 124 rows, 19 columns |
| identity, sector, logo, issued shares | `public/data/companies.json` via `fetchCompanyMeta()` |
| TTM P/E | `lib/fundamentals.fetchTtmPe()` over `financial_facts_public`, a second request allowed to fail on its own |

Universe: **124** tickers, **82** active, **42** suspended (> 60 days). 20 carry
prices but have no identity row, so they can never carry a market cap.

## 4 · Supported filters

`UI filter → field → type → null → unit → operator`

| filter | field | type | null | unit | operator |
|---|---|---|---|---|---|
| القطاع | `sector` | categorical ×10 | never | — | equals |
| البحث | `ticker` · resolved name · `name_en` | text | — | — | contains |
| حالة الإدراج | `days_since_trade` | derived | never | days | `> 60` |
| السعر | `last_close` | number | never on an active row | IQD | min / max |
| التغيّر | `(last_close − close_ref)/close_ref` | number | when the ref close is null | ٪ | min / max |
| الموقع من مدى 52 أسبوعاً | `high_52w`/`low_52w` | number 0–100 | 2 of 82 active | ٪ | min / max |
| السيولة اليومية | `avg_value_20d` | number | 0 of 82 active | مليون IQD | min / max |
| القيمة السوقية | `last_close × shares` | number | 2 of 82 active | مليار IQD | min / max |
| صافي الأجانب 30ي | `ff_net_30d` | number | never | مليون IQD | min / max |
| مكرر الربحية (TTM) | `fetchTtmPe()` | number > 0 | **52 of 82 active** | — | min / max |

Money metrics are entered in the magnitude the table prints them in — millions
for liquidity and foreign flow, billions for market cap — with the unit beside
the field. Nobody should type nine digits to mean «900 million».

**Not built, because the data does not exist: P/B, ROE, dividend yield.**
`financial_facts_public` carries `net_income`, `pretax_income` and
`paid_capital` only. There is no book value, no equity line and no dividend
record anywhere in the schema. Per §4 and §5 they are not invented, and the
footnote says so on the page.

## 5 · Null semantics

The rule, enforced in `inRange()`: **an unmeasured value is excluded from a
numeric range, never admitted.** Screening for «P/E under 10» asks for
companies whose P/E is known and under 10.

The converse, per §11, is enforced by keeping the metrics independent: **a
company missing one metric is not dropped from filters about other metrics.**
Verified — a liquidity filter returning 31 rows keeps 11 that have no P/E at
all.

Three distinct cases, handled differently:

- **P/E null for 52 of 82 active.** Two causes, both correctly yielding no
  ratio: at most 42 of 124 tickers have both `net_income` and `paid_capital`,
  and `fetchTtmPe` already refuses to emit a P/E for a loss-making company. A
  negative multiple is never printed and never treated as a small positive one.
- **`ff_net_30d` is never null; 89 of 124 are a literal 0** — a computed net,
  not a gap, since 13 of those zeros belong to companies that do appear in the
  foreign-flow table. **This fixes a live bug:** the previous implementation
  rendered every one of those zeros as an unavailable dot.
- **Period change null when its reference close is null** (1–8 rows by window).

`—` remains unavailable, `0` remains an actual zero, and each dash carries a
`title` saying which of the two it is.

## 6 · Active-filter behaviour

Always on screen, panel open or shut — the band that answers «why am I only
seeing six companies». Every criterion is its own token showing the real value
or range (`مكرر الربحية (TTM)  0.1 – 10`, not a vague chip), each individually
removable with a labelled button and a 44px target, plus «إعادة ضبط» for
clear-all. Removing a token also clears its number fields and unmarks its
column.

Presets **write their condition into the filter set** rather than entering a
mode. Verified: pressing «الأقل مكرراً» produces the token above, fills the
advanced inputs with `0.1` and `10`, sorts by P/E ascending, and returns 5 rows
all within the range.

## 7 · Result count

Updates on every keystroke and every control change, `aria-live="polite"`, and
takes the brand colour for a beat **only when the number actually moves** — so
a filter that did something and one that did nothing stop looking identical.
Reads «N شركة مطابقة من M», where M switches with the listing tab.

## 8 · Table columns

Nine, the reference's, all backed by real fields:
الشركة (pinned, 300px) · السعر · التغيّر·period · مكرر الربحية · مدى 52 أسبوعاً
(track + position) · السيولة اليومية · صافي الأجانب 30ي · القيمة السوقية ·
القطاع. Company links go to `/c/[sym]`. Rows are 46px with tabular numerals and
end-aligned numerics; a column carrying an active filter is marked in the
header.

## 9 · Sorting and search

Numeric, not string — verified: ascending P/E reads 0.05, 6.7, 7.1, 7.3 … A
string sort would place «12.0» before «6.7». All 52 nulls sort last in both
directions. `aria-sort` on the header and `data-dir` on the button; state is
carried by caret direction, caret opacity and ink weight, so nothing depends on
colour alone. Sort survives filter and search changes; a preset moves it
deliberately, which is the reference's behaviour.

Search matches ticker, the resolved company name (Arabic or English by the
active language) and the raw English name. It deliberately does **not** match
the raw `name_ar` — see §18.

Filters compose predictably: sector ∧ search ∧ listing ∧ every set range. There
is no boolean-query builder.

## 10 · Mobile filter behaviour

A sheet, not a crushed desktop bar. Below 720px the period segment and the
advanced toggle disappear and the sheet trigger takes their place; what stays
inline is what you READ (search, presets, tokens, count), and what moves into
the sheet is what you SET.

Verified at 375×812: `role="dialog"`, `aria-modal`, focus moves to the close
button on open and **returns to the trigger** on close, body scroll locked and
restored, the sheet body scrolls internally, and **all 32 of its controls have
a ≥44px hit area** — buttons through a transparent pseudo-element that keeps
the reference's box, inputs and selects by taking the height directly. The
results table keeps its columns and scrolls with the company column pinned; it
is never restacked into cards.

## 11 · Visual comparison

Measured at 1440×900. Reference page width 1166 with a 226px rail; identical here.

| | reference | now | before |
|---|---|---|---|
| page height | 972 | **959** | **3,967** |
| workspace | 140, sticky | **143, sticky** | four loose static rows |
| board | 572, own scroll | 542, own scroll | none — the page scrolled |
| h1 | 27.36px / 400 | **27.36px / 400** | 20px / 600 |
| lede | .76rem | **.76rem** | — |
| row height | 46 | **46** | 44 |
| header row | 36 | **36** | — |
| table min-width | 1120 | **1120** | — |
| company column | 300 | **300** | — |
| search | 320×34 | **320×34** | — |
| preset pill | 5/11px, r999, .69rem | **identical** | — |
| count | 16.32px / 700 | **16.32px / 700** | — |
| band track | 68×3 | **68×3** | — |
| band column | 132 | **132** | — |
| workspace offset | 90px | 70px | — |

The 70px offset is not a miss: the reference floats its header with a 16px top
margin, and this application's header sits flush at `top: 0` and is 62px tall.
Same visual gap under different chrome. The sector column measures 103px
against 92 because `inline-size` is a hint on auto table layout and «التحويل
المالي» is wider than the reference's label.

Six screenshots at identical viewports accompany this report.

## 12 · Light / dark

Ported from the reference's own dark block, re-picked rather than inverted. The
inputs matter most: a pale field that works on bone disappears on `#202020`, so
borders step up and the field sits on a surface **lighter** than the panel.
Token, preset, row-active and filtered-header tints all have their own dark
values. Verified across 4 viewports × 2 themes: zero horizontal overflow, 82
rows, 46px rows, sticky workspace, pinned company column in all eight.

## 13 · Legacy CSS removed

21 rules across three places in `app/globals.css` — the main `.screener-*`
block, the ≤720px overrides, and one stray rule 4,500 lines below. All 11 class
names were grepped first and proved to have no remaining `.tsx` user. The diff
is 104 lines and every removed selector starts with `.screener-`.

Worth recording: the first attempt cut from `.screener-page {` to the next
section comment and removed **1,345 lines**, swallowing the statistics,
heatmap, foreign-flow and company-detail chrome that sat between them. The diff
caught it and it was reverted. No broad prefix deletion was used.

Kept, because other routes still need them: `listing-status-note`,
`table-wrap`, `company-cell`, `logo-chip`, `stacked-cell`, `stale-flag`,
`num-roll`, `row-link`, `page-footnote`, `app-eyebrow`, `empty-state`.
`/companies`, `/market`, `/heatmap`, `/pulse`, `/statistics` and `/c/[sym]`
re-checked afterwards — `/companies` still renders 82 rows at 53px with its
30px chip and no overflow.

**Newly dead, and deliberately not removed:** `components/design/DataTable.tsx`
and its 17 `.shared-data-grid` rules. This route was their last consumer.
Deleting a shared primitive is wider than this phase's cleanup step, so it is
reported rather than done.

## 14 · Performance

All matching rows render, no pagination, as before. What changed is that they
live inside a 542px scroll container instead of a 3,967px page, so the browser
composites one scrollport rather than laying out the whole document on every
scroll. Two requests as before — `company_metrics` plus the failure-tolerant
P/E — and no new dependency. Route stays prerendered `○` at 12.1 kB / 173 kB
first load.

## 15 · Verification cases

Every case run through the real UI and read back from the DOM.

| case | result |
|---|---|
| no filters | 82 rows, count 82, no tokens, «لا فلاتر مطبّقة» |
| one categorical (المصارف) | 30 rows, one token, every visible sector = المصارف |
| numeric min (P/E ≥ 5, ∧ Banks) | 15 rows, every P/E real and ≥ 5, **zero dashes** |
| numeric range (P/E 5–12, ∧ Banks) | 3 rows: 7.1, 6.7, 12.0 |
| multiple filters | composed correctly at each step above |
| search only | «مصرف بغداد» → 1 row |
| search + filters | 0 rows; empty state names all three criteria |
| zero-result combination | `data-empty` set, board collapses, criteria listed |
| remove one filter | P/E token removed → inputs cleared, header unmarked, 1 row |
| clear all | back to 82, search and sector reset, tokens gone |
| representative sorting | numeric ascending, 52 nulls last, `aria-sort` exposed |
| null / unavailable metric | 11 of 31 liquidity-filtered rows have no P/E and stay |
| foreign zero | 10 rows print `0`, **0 rows print `—`**, 21 signed |
| invalid range (50M – 10M) | row flagged, note explains, returns nothing — never silently swapped |
| preset | writes an editable token, fills the inputs, moves the sort |

## 16 · Checks

```
npx tsc --noEmit                      clean
npx eslint app/screener lib/screener  clean
npm run check:tokens                  16 tokens/theme in parity · 22 contrast pairs · 0 tracking reaching Arabic
npm run check:routes                  44 routes, no rendering-mode regressions
isolated production build             /screener ○ prerendered, 12.1 kB
/screener 200 · canonical + og:url    https://iraqsm.com/screener
1440 / 1280 / 1000 / 375 × light+dark  overflowX 0 in all 8
keyboard                              123 focusables, 0 removed from tab order, focus-visible ring present
accessibility                         1 main, 1 h1, 0 unlabelled controls, aria-sort, aria-live count, aria-pressed presets
main untouched                        d2f60cc
reference app untouched               working tree clean
no /en · no duplicate shell           confirmed
```

`/alerts` still exists, and that is correct: `docs/ALERTS_REMOVAL_MAP.md`
records the owner's decision that the route stays live but **unlinked** as a
compatibility route until the shell phase removes its entry points. This work
adds no link to it.

## 17 · Commits

| | |
|---|---|
| `27bd968` | screener data audit |
| `08a3766` | filter/data adapter |
| `73c2963` | approved filter workspace, results table, interactions, mobile |
| `275239b` | legacy CSS cleanup |
| `018fda5` | name-precedence fix |
| this file | verification and docs |

## 18 · Intentional differences and unresolved issues

1. **The bilingual layer.** The reference is Arabic-only; this route serves
   `ar`/`en` from `AppContext` and keeps doing so.
2. **No design-mode state selector and no page-local theme toggle.** The first
   is a reference-only review affordance; the second is the shell's job here.
3. **Real company logos in the 30×27 mark**, falling back to the reference's
   two-letter Electric-Blue chip. Same box, same role.
4. **Sector list comes from the data**, not a hard-coded list — the live
   `sector` column has ten values including «التحويل المالي», which the
   reference's fixed list of nine does not carry.
5. **A `usableName` guard, which the reference has no need for.** 54 of the 124
   `company_metrics.name_ar` values are a bare row index («5», «13», «44») left
   by the upstream workbook parse. `companies.json` therefore wins and the
   metrics table is a fallback. My first draft had this precedence backwards and
   rendered «مصرف الاقليم التجاري» as «5»; it is fixed and verified at 0 of 82.
   **The underlying data is still wrong and is worth a pipeline fix** — this
   route now works around it, and any other surface reading `name_ar` directly
   will show the same debris.
6. **Duplicated table CSS** under `.sc-*` rather than a shared layer, to avoid
   touching the frozen `/market`. See §2 — this is the one piece of debt this
   phase knowingly takes on.
7. **`DataTable` and `.shared-data-grid` are now dead** and were left in place.

Stopping here. Statistics is not started and will not be until Stock Screener
is explicitly approved.
