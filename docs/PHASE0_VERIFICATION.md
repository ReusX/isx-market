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

**Left open deliberately:** the two missing months of `sector_monthly`
(2026-06, 2026-07) are not backfilled. That is a production data write and
wants explicit approval; the fixed loader is idempotent, so it is a one-command
repair whenever that is given.

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
