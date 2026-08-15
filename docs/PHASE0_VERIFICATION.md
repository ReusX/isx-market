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
