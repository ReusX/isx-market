# Phase 0 — verification record

Run **15 August 2026** on branch `implement/iqwealth-redesign`, cut from
`main@d2f60cc`. Every claim below is an observation, not an inference; where
something could not be observed it says so.

---

## 1 · Branch and checkpoint

`implement/iqwealth-redesign` from `main`. Tag `pre-implementation-checkpoint`
pins the pre-implementation state.

## 2 · Reference points re-verified

| ref | commit | verdict |
|---|---|---|
| `main` | `d2f60cc` | clean tree |
| `origin/main` | `d2f60cc` | identical — 0 ahead, 0 behind |
| `archive/pre-design-mode-work` | `57d34aa` | 14 ahead of `main`, and a descendant of it |
| tag `archive-pre-design-mode` | `57d34aa` | pins the archive tip exactly |

Two further branches exist and are **fully contained in `main`** — `overhaul`
(0 ahead, 55 behind) and `redesign/iqwealth-2026-07` (0 ahead, 20 behind).
Neither holds unmerged work. Nothing to salvage; nothing to fear.

## 3 · `daily_index` loader drift — RESOLVED

Fixed in `2a54bf7`. The finding was larger than P0-1 described: the drift was
**live, not latent**, and it was four loaders, not one. See the commit message
for the evidence. Two facts govern the resolution:

- `load_to_supabase.py` is canonical — its column set is what the live table
  has, what the parser emits, and what every reader selects.
- The cause was never the column names. `process_json` caught every loader
  exception and returned, so the scheduled job exited 0 while `sector_monthly`
  silently stopped at 2026-05 and every other table it writes reached 2026-07.

### 3a · `sector_monthly` backfill — DONE, 15 August 2026

**Why it was needed.** The broken loader lost two months. `sector_monthly`
stopped at 2026-05 while every other table the monthly job writes reached
2026-07. Fixing the loader stops it recurring; it does not recover what was
already missed. Carrying a two-month hole into the redesign would mean building
the statistics surfaces against data known to be incomplete.

Authorised by the owner as a tightly scoped production-data repair. Run under
the safeguards they set, all of which are recorded below rather than asserted.

**⚠ One correction to the earlier report.** It said the job had been running
green "while /statistics quietly went stale". The first half is right; the
second is not. `sector_monthly` is written by the pipeline and **read by nothing
in the application** — a repository-wide grep finds no reader outside the loader
and the schema file. `/statistics` draws its sector panel from
`foreign_flow_sector`, which was current all along. The table was stale; the
page was not. The repair still matters, because `sector_monthly` is one of the
stored-but-unread tables the redesigned statistics surface is meant to expose —
but it was never a visible outage, and saying so was wrong.

**Source.** The two months were not present locally; the monthly PDFs stopped at
2026-05. Fetched from ISX and parsed on the day:

```
scripts/scrape_isx_reports.py            → 825 report files listed
scripts/download_pdfs.py                 → data/pdfs/2026-06.pdf, 2026-07.pdf
scripts/parse_monthly_full.py <each>     → data/parsed_full/2026-06.json, 2026-07.json
                                           both parsed with missing=[]
```

**Command** (scoped — see below):

```
python3 load_to_supabase_v2.py data/parsed_full/2026-06.json --only sector_monthly
python3 load_to_supabase_v2.py data/parsed_full/2026-07.json --only sector_monthly
```

`--only` was added for this: without it the loader runs all ten tables, and
rewriting nine of them with identical values makes "nothing else changed"
unprovable afterwards. Same corrected idempotent upsert path, just filtered.

**Recorded before the write**

| | rows |
|---|---|
| `sector_monthly` 2026-06 | **0** |
| `sector_monthly` 2026-07 | **0** |
| `sector_monthly` total | 1311 |
| expected sectors per month, from source | 10 (and 10 market-cap entries) |

**Dry run first**, scoped, both months: 10 rows each, conflict key
`year,month,sector`, no other loader invoked. Payload keys diffed against the
live table — an exact match on all nine columns, nothing extra.

**Verified after the write**

| check | result |
|---|---|
| both months present | ✅ 10 rows each |
| sector count matches source | ✅ 10 / 10, names identical |
| duplicate `(year, month, sector)` | ✅ none |
| every value equals the source | ✅ volume, value, trades, traded_companies, market_cap |
| `traded_companies` populated | ✅ 10/10 both months |
| `market_cap` populated | ✅ 10/10 both months |
| `listed_companies` populated | 0/10 — **the source carries none**, identical to the existing 2026-05 rows. Not fabricated. |
| `sector_monthly` total | 1311 → **1331**, exactly +20 |
| every other table's row count | ✅ unchanged — `daily_index` 3780, `ownership_monthly` 1822, `major_shareholders` 1657, `depository_monthly` 903, `capital_events` 38, `company_caps_monthly` 513, `foreign_flow_daily` 1867, `foreign_flow_sector` 424, `companies` 119 |
| latest month in `sector_monthly` | **2026-07** |

**Plausibility.** Σ market cap holds steady across the three months — 32.57 T,
32.43 T, 33.46 T IQD — and traded value declines 184.5 B → 118.6 B → 104.9 B,
which is a quiet summer, not a broken parse.

Nothing was fabricated and no other month was touched.

## 4 · RLS on personal data — VERIFIED

Probed with the **anon** key against production, read-only.

| table | rows (service_role) | anon sees | verdict |
|---|---|---|---|
| `profiles` | 73 | `42501` permission denied | ✅ no grant at all |
| `holdings` | 12 | `[]` | ✅ RLS blocking |
| `transactions` | 59 | `[]` | ✅ |
| `wallet_requests` | 4 | `[]` | ✅ |
| `quest_completions` | 82 | `[]` | ✅ |
| `snake_scores` | 42 | `[]` | ✅ |
| `penalty_shots` | 160 | `[]` | ✅ |
| `news_pipeline_log` | 51 | `[]` | ✅ |
| `financial_facts` / `_ratios` / `_reports` | — | `42501` | ✅ raw locked, `_public` views readable |
| `chat_messages` | 1 | readable | ⚠ by design, see below |

An empty array alone proves nothing — it is equally consistent with an empty
table — so each was cross-checked against a service_role count. Every one of
those tables holds rows the anon key cannot see.

`20260624_security_hardening.sql` is confirmed **applied**, not merely present:
the `revoke all on profiles from anon` in that file is exactly the error the
anon probe returns. The same migration scopes `select` / `update` / `insert` on
`profiles` to `(select auth.uid()) = id` for `authenticated` only, which is what
protects `portfolio` and `price_alerts` — both are JSONB columns on `profiles`
(`20260622_portfolio_alerts.sql`) and inherit its policies.

**Not verified, and it needs saying:** the *authenticated* boundary was not
probed live. Proving that a signed-in user cannot write another user's row
needs a real second account, and creating accounts is out of scope. The
evidence is the migration source plus the confirmed application of its sibling
statement. If a stronger guarantee is wanted, it is a two-account manual test,
not something to assume.

**Two consequences worth carrying forward:**

- `profiles` has **no DELETE policy**, so account deletion cannot be done from
  the client at all. P1-2 needs a server route holding the service_role key —
  it is not a UI-only task.
- `chat_messages` is world-readable by design (`chat_read_all … using (true)`),
  exposing `user_id` and `username`. It holds one test message and nothing in
  the app reads the table. Not a leak; a dead feature with a public surface.
  Retire it or leave it, but decide rather than inherit it.

---

## 5 · Phase 0.7 — archive recovery, commit by commit

All 14 commits on `archive/pre-design-mode-work` reviewed individually. The
branch was never merged and never will be; four commits landed, each as its own
revertable commit.

**4 accepted · 1 hand-ported · 4 deferred to 0.8/0.9 · 5 rejected**

| # | archive commit | verdict | action | modifications | verification |
|---|---|---|---|---|---|
| 1 | `681a3dc` Step 0: root artefacts, Tailwind, route gate | ✅ **accepted** | cherry-picked → `3c80500` | none | re-verified all 117 root files still present and still dead; `public/` holds the real favicons and og-image, `app/robots.ts`/`app/sitemap.ts` the real robots and sitemap. Confirmed `--font-body`/`--font-numeric` already exist here, so the Tailwind hunk carries no dependency on the archived tokens. |
| 2 | `6afd865` Step 1: quarantine `globals.css` | ⏸ **deferred to 0.8** | not landed | — | a byte-identical 15-file split of the 6,940-line sheet. Genuinely useful — it is what makes the legacy bridge deletable line by line — but it is CSS restructuring, and landing it in an infrastructure phase means every later token commit rebases onto it for no gain. It belongs with the token work. |
| 3 | `0ffd2b8` Step 2: token layer + checkers | ⚖ **split — checkers deferred to 0.8** | not landed | — | `token-parity.mjs` (theme key parity) and `contrast.mjs` (WCAG AA both themes) are exactly the CI gates this project wants. Both hard-read `styles/tokens.css` and `styles/legacy/02-tokens.css`, **neither of which exists in this tree** — they arrive with #2 and with the token layer itself. Landing them now adds two gates that crash on a missing file. The token *values* are rejected outright: superseded by the approved reference app. |
| 4 | `e1db683` Arabic letter-spacing guard | ⏸ **deferred to 0.8** | not landed | — | the rule is right and stays right. But it lives in `styles/materials.css` (arrives with #3), and its opt-back-in clause references `--track-wide`, which does not exist here. Checked for a live bug first: this tree sets `body { letter-spacing: 0 }` and has only two positive-tracking rules, a chart watermark and a mono numeric — **no Arabic text is being tracked today**, so this is preventive, not a fix. It lands with the token that makes it coherent. |
| 5 | `c93a3c6` Step 3: primitives, drop Noto Kufi | ⛔ **rejected** | not landed | — | two independent reasons. The font change is **reversed by decision** — Noto Kufi Arabic is the approved typography, verified still intact at `app/layout.tsx:23`. And the primitives are not separable from the archived tokens: `styles/primitives.css` references `--r-control`, `--ink-2`, `--blue-400`, `--dur-2`, `--ease-out`, `--sp-3` and others, **none of which exist in this tree**. Primitives come from the reference app in 0.9. |
| 6 | `abfd31a` build isolation | ✅ **accepted** | cherry-picked → `c1cb568` | dropped the `check:tokens` script (points at #3's files); kept `tsconfig.json` compact rather than the archive's whole-file reformat | builds now write to `.next-check`, so the verification loop stops deleting the chunks the dev server is handing out. |
| 7 | `86389e0` Step 4: `lib/seo.ts` + 8 canonicals | ⚖ **accepted, rewritten** | cherry-picked, helper rewritten → `ead945e` | **all locale machinery removed** — see below | all 8 canonical bugs re-verified as still live before taking. Production build: every canonical and og:url correct and in agreement, 0 hreflang, 0 hardcoded origins outside the helper. |
| 8 | `25053f6` retire `/analysis` | ⛔ **rejected for this phase** | not landed | — | a **product decision, not infrastructure**. `/analysis` is one of six route families whose removal and redirect target are open (P1-5), pending a traffic, backlink and internal-link audit. Landing the retirement here would settle that decision by accident. Note the two are independent: #7 gave `/analysis` a correct canonical, which is right whether it is later kept or retired. |
| 9 | `f111f7e` Step 5: i18n scaffold | ⛔ **rejected — deferred project** | not landed | — | the locale project is deferred until the redesign is stable. The catalogue and `translate.ts` are locale-*independent* enough to reuse in principle, but nothing consumes them without the routing, so landing them adds dead code to the tree the redesign is about to rebuild. |
| 10 | `b736eb9` OG image fix | ✅ **accepted, hand-ported** | ported → `3bee75a` | only the one real hunk taken | the commit is 69 renames into `app/[locale]/` plus one fix; cherry-picking it would have dragged in the deferred locale move. **Reproduced the bug first**: `curl` → exit 52, empty reply, 0 bytes. After: 200, `image/png`, 1200×630, 94,978 bytes, rendered and visually inspected. |
| 11 | `b4254bf` Step 6: `app/[locale]` + middleware | ⛔ **rejected — explicit** | not landed | — | changes URL structure and adds locale middleware. Both named in the decision as do-not-reuse. ⚠ It also contains `lib/fonts.ts`, which serves fonts from `@fontsource` via `next/font/local` instead of `next/font/google` — a real fix for the build re-downloading fonts whenever the layout moved. **The technique is worth recovering in 0.8**; the file itself configures IBM Plex and cannot be taken as-is. |
| 12 | `c670926` Step 7: English tree | ⛔ **rejected — explicit** | not landed | — | makes `/en` reachable and flips `ENGLISH_LIVE`. The entire deferred project. |
| 13 | `24d600d` Step 8a: rebuild the shell | ⛔ **rejected — superseded** | not landed | — | the shell is rebuilt from the approved reference app in 0.9. |
| 14 | `57d34aa` Step 8b: rebuild market/companies/screener | ⛔ **rejected — superseded** | not landed | — | superseded market-page UI, and page migration does not begin in Phase 0 at all. |

### 5a · Exactly what changed in `lib/seo.ts`

Kept: `SITE`, `absUrl(path)`, `seoAlternates(path)`, and the `normalise` helper.
Those are what all 37 call sites use — every one with a single argument.

Removed **entirely**, not disabled: the `Locale` type, `DEFAULT_LOCALE`,
`LOCALES`, `ENGLISH_LIVE`, `localePath`, `localesFor`, `ogLocale`, the `/en`
prefix branch inside `absUrl`, and the `languages` / `x-default` hreflang block
inside `seoAlternates`.

The archive shipped `ENGLISH_LIVE = false`, which is correct today and one
boolean away from emitting `/en` canonicals and hreflang for routes that would
not exist. That is the exact deploy the deferral is meant to prevent, and a
flag that consequential should not sit dormant in the tree while the project it
serves is on hold. When the locale project starts, this is where it comes back —
next to the routing that makes those URLs real.

### 5b · Checks run

| check | result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors, after every commit |
| `npx eslint app lib components` | ✅ 0 errors, 3 pre-existing warnings (2 `<img>`, 1 exhaustive-deps) |
| `npm run check:routes` | ✅ 43 routes, 32 prerendered, 11 dynamic. Baseline regenerated: +1 prerendered vs the archive's 42/31, which is `/auth/reset` from earlier on this branch. No route regressed. |
| canonicals / og:url | ✅ every prerendered route correct and in agreement |
| `/en` leakage | ✅ none — 0 hreflang emitted, no `/en` path emitted anywhere |
| removed-route navigation | ✅ none returned; no navigation was touched in this phase |
| Noto Kufi | ✅ intact, `app/layout.tsx:23` |
| visual page migration | ✅ none started — this phase is infrastructure only |
| `main` | ✅ untouched at `d2f60cc` |
| working tree | ✅ clean |

`/profile` and `/auth/reset` still inherit the root canonical. Both are
`noindex, nofollow` and neither is in the sitemap, so nothing acts on it.

---

## 6 · Phase 0.8 — tokens, fonts and design-system gates

### 6a · Font approach — `next/font/google` KEPT, conversion tested and rejected

Phase 0.7 flagged the archive's `@fontsource` + `next/font/local` technique as
worth recovering. It was built, wired, measured, and reverted.

**What is already true.** `next/font/google` self-hosts. The build emits 27
`.woff2` files into its own `static/media`; there is no runtime request to
Google from a visitor's browser. The only cost the archive technique removes is
a *build-time* download.

**What it costs.** `@fontsource` ships each family split by subset —
`…-arabic-700-normal.woff2` and `…-latin-700-normal.woff2` as separate files
with separate `unicode-range`s. `next/font/local` accepts multiple `src`
entries but cannot express a per-entry `unicode-range`, and two entries cannot
share a weight. So a faithful conversion of a font used for BOTH Arabic and
Latin is not expressible with this technique at all.

Measured on the same string (`أسعار الأسهم العراقية اليوم 1,234.56`), after
`document.fonts.ready`:

| probe | `next/font/google` | `@fontsource` local | drift |
|---|---|---|---|
| body, 16px / 500 | 232.789 px | 228.188 px | **−4.60 px (−2.0%)** |
| display, 24px / 700 | 439.211 px | 436.578 px | −2.63 px (−0.6%) |
| numeric, 14px / 600 | 245.602 px | 242.258 px | −3.34 px (−1.4%) |

The Latin run falls to the fallback face because the Arabic-subset file has no
Latin glyphs. On a site where nearly every line mixes Arabic with a ticker or a
price, −2% on body text is material.

`next/font/google` also generates metric-matched `_Fallback_` faces
automatically, which is what prevents layout shift during load. The local path
keeps them only incidentally.

**Verdict: keep `next/font/google`.** Per §3 of the brief — visual fidelity
beats technical cleverness. `lib/fonts.ts` was deleted and the three
`@fontsource` packages uninstalled; the working tree is identical to before the
experiment.

Typography is otherwise unchanged and needed no work: the reference app and
this repo already load the **same three families, same weights, same subsets,
same CSS variables**. Noto Kufi Arabic is intact at `app/layout.tsx:23`. No IBM
Plex display dependency was introduced — Plex remains body copy only, as it is
in the approved reference app.

### 6b · Token files

| file | what |
|---|---|
| `styles/design-tokens.css` | the whole layer — colour (both themes), scale, focus, motion, Arabic tracking guard, legacy containment |
| `app/globals.css` | one line: `@import '../styles/design-tokens.css'` |
| `scripts/token-parity.mjs` | theme parity · base-layer collisions · dangling refs · pinned brand constants |
| `scripts/contrast.mjs` | WCAG pairs, both themes, alpha composited |
| `scripts/arabic-tracking.mjs` | repo-wide positive-tracking guard |
| `app/dev/foundation/*` | the proof sheet — **delete at end of migration** |

**The base layer was not touched.** `--page`, `--surface`, `--ink`, `--border`,
`--up`, `--down` and 16 more were diffed against the reference app and are
**byte-identical on all 22 tokens in both themes**. The reference app inherited
them from this repo unchanged. The new work is the `--mv-*` layer only.

Approved colour values, copied literally:

| token | light | dark |
|---|---|---|
| `--mv-hero` | `#3171c6` | `#3171c6` |
| `--mv-hero-bright` | `#4a8ae0` | `#74a9ef` |
| `--mv-ink` | `#1e2220` | `#f0efec` |
| `--mv-ink-2` | `#565c58` | `#b4b6b2` |
| `--mv-ink-3` | `#868c88` | `#8b8e8a` |
| `--mv-line` | `rgba(30,34,32,.09)` | `rgba(240,239,236,.085)` |
| `--mv-line-strong` | `rgba(30,34,32,.16)` | `rgba(240,239,236,.16)` |
| `--mv-panel` | `rgba(255,255,255,.72)` | `rgba(35,35,35,.82)` |
| `--mv-panel-solid` | `#fbfbfa` | `#1f1f1f` |
| `--mv-well` | `rgba(255,255,255,.5)` | `rgba(255,255,255,.04)` |
| `--mv-up` | **`#117f59`** ⚠ corrected | `#35c98a` |
| `--mv-down` | `#b5432f` | `#ee6a6f` |
| `--mv-env` | Cotton gradient | Moonless Night `#161616` |

### 6c · The one corrected reference value

| | |
|---|---|
| token | `--mv-up`, light theme only |
| old | `#12805a` |
| new | `#117f59` |
| reason | measured **4.444:1** on Cotton — six thousandths under AA for body text |

The reference app's own comment beside this colour states it was darkened "to
carry 4.5:1 as body text". It reaches 4.76:1 on a panel and fails only against
the page environment, which is why it was never caught by eye — and that
asymmetry is also the evidence that it is an accident rather than a decision.
One step down per channel clears it at **4.505:1**; the shift is far below the
threshold of perception. Nothing else was altered.

### 6d · CSS quarantine — decided, and larger than expected

**What is legacy:** all 6,940 lines of `app/globals.css`.
**What is new:** `styles/design-tokens.css` plus each migrated route's own CSS.
**How precedence is controlled:** by scope, in both directions.

The archive's `styles/legacy/` split is **not adopted**. It is a 15-file
byte-identical move that makes the old sheet easier to read but does nothing
about precedence, which is the actual problem. Closed rather than deferred.

Scoping to `.iq-page` handles one direction: no declaration in the new layer
can reach an un-migrated route. The proof sheet showed that is only half the
job — **26 legacy rules are bare element selectors** (`table`, `th`, `td`,
`tbody tr`, `td::before`, `h1..h3`, `a:focus-visible`, `bdi`, `p`) and those
match inside `.iq-page` as happily as outside. `table { min-inline-size: 900px }`
put a 900px table inside a 498px panel, silently, because the component set a
different property.

The containment block neutralises exactly those rules inside the new layer,
using `.iq-page :where(…)` at specificity (0,1,0): enough to beat a bare
element selector (0,0,1), deliberately **not** enough to beat a component's own
`.fd-table td` (0,1,1). Two earlier drafts got this wrong in the other
direction and repainted the components they were meant to protect.

**How legacy removal will work.** Each migrated route deletes its own section
of `globals.css` in the same commit that migrates it. The containment block is
the ledger of what is still owed: when the last bare element rule is gone from
`globals.css`, the containment block is deleted too. They are the same debt
seen from two sides.

### 6e · Hard-coded style audit — classified, not rewritten

895 inline `style={{}}` blocks across 47 files and 165 hard-coded hex colours
across 35 files. **Nothing was rewritten** — a search-and-replace here would be
page redesign by stealth.

| class | count | disposition |
|---|---|---|
| **dangerous global** | 2 files | `components/KChart.tsx` (24 hexes) and `app/charts/page.tsx` (5) hard-code chart palettes with **no theme awareness at all** — no `data-theme` read, no observer. Both are already broken in light theme today, before any redesign. They need a `lib/chartTheme.ts` reading computed custom properties. **Gates the charts work; not a Phase 0.8 task.** |
| **route-local legacy** | 45 files | inline styles inside a single un-migrated route. Each dies with its own route's migration. |
| **shared, migrate now** | 0 | none found — no shared component hard-codes a value the new layer needs to own. |
| **dead** | — | deferred to the per-route passes, where "dead" can actually be proven. |

The one genuinely theme-aware chart component today is
`components/design/IndexChart.tsx`, which is the model the other two should
follow.

### 6f · Theme mechanism — verified, unchanged, not duplicated

`data-theme` on `<html>`, set pre-paint by the inline script at
`app/layout.tsx:102` from `localStorage`, toggled through `AppContext`. Light,
dark, persistence, and no flash.

The reference app carries theme **per page** as `.iq-dark` / `.iq-light`
classes, because every page there has its own toggle. That is a design-app
convenience, not a product mechanism. The token layer therefore takes the
reference app's **values** and this app's **selector** — a second theme system
would be two sources of truth for one fact.

### 6g · Verification

**Build**

| check | result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint app lib components scripts` | ✅ 0 errors, 3 pre-existing warnings |
| `npm run check:routes` | ✅ no rendering-mode regressions |
| build directory | ✅ isolated `.next-check` |
| external font dependency | unchanged — build-time only, self-hosted at runtime |

**Gates**

| gate | result |
|---|---|
| `token-parity.mjs` | ✅ 16 tokens per theme in parity, 61 total, no base-layer collisions, no dangling refs |
| `contrast.mjs` | ✅ 22 pairs pass in both themes (after the 6c correction) |
| `arabic-tracking.mjs` | ✅ 2 positive-tracking rules found, both exempt with reasons, 0 reaching Arabic |

Each gate was proven to **fail** as well as pass: `contrast.mjs` caught the real
`--mv-up` shortfall on first run, and an injected
`.mv-eyebrow { letter-spacing: .08em }` makes `arabic-tracking.mjs` exit 1 and
name the file, line and selector.

**Rendered — `/dev/foundation`, both themes, desktop and 375px**

| check | result |
|---|---|
| Noto Kufi rendered on the Arabic heading | ✅ |
| IBM Plex body, Roboto Mono numerals, tabular figures aligned | ✅ |
| `--mv-up` computes to the corrected `#117f59` | ✅ |
| semantic down / muted / header colours resolve to their tokens | ✅ |
| table fits its panel; component padding survives containment | ✅ |
| focus ring `2px solid rgb(74,138,224)` at 3px offset | ✅ `--mv-hero-bright`, beating the legacy 3px `--accent` — inside `.iq-page` only |
| 375px: the table stays a table | ✅ legacy card-restack contained |
| Cotton and Moonless Night both present | ✅ |
| **leak check** — `--mv-ink` on `<body>` | ✅ **undefined**: the layer cannot escape `.iq-page` |

**Safety**

`main` untouched at `d2f60cc` · no locale routing · no `/en` alternates or
hreflang · no removed route reintroduced · no Alerts navigation added · **no
visible page migrated** — the only new route is the noindex proof sheet, which
nothing links to and which is deleted at the end of the migration.
