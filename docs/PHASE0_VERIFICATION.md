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
