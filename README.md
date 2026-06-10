# iraqsm.com — Iraq Stock Market

Next.js app for live ISX prices, charts, and bilingual company profiles, plus
a Python data pipeline (`scripts/`) for the historical backfill from ISX
monthly/daily reports.

## Required environment variables (Vercel)

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app + API routes | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app | public, read-only via RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | API routes only | secret — never expose client-side |
| `CRON_SECRET` | `/api/cron/daily-prices` | secret — Vercel sends it as `Authorization: Bearer <value>` on cron invocations; generate with `openssl rand -hex 32` |

## Cron jobs

`vercel.json` schedules `/api/cron/daily-prices` daily at **10:00 UTC**
(after the ISX session closes ~13:00 Baghdad). It fetches the last week of
daily-report workbooks from isx-iq.net, parses the trading bulletin, and
upserts into the `daily_prices` table. Sessions already in the table are
skipped, so reruns are idempotent; append `?force=1` to reload regardless.

Manual trigger:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://iraqsm.com/api/cron/daily-prices
```

## Local data pipeline (historical backfill)

```bash
cd scripts
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
cp .env.example .env   # SUPABASE_URL + service-role SUPABASE_KEY
./venv/bin/python run_pipeline.py                 # monthly reports 2009→now
./venv/bin/python run_pipeline.py --mode daily --days 30
```

Schema for all pipeline tables: `scripts/schema.sql` (run in the Supabase SQL
editor). See `scripts/data/errors.log` and `scripts/data/processed.json` for
backfill state.
