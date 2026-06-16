#!/usr/bin/env python3
"""Backfill foreign_flow_company_daily from every local daily workbook.

Parses the foreign-investor sheet of each scripts/data/daily/*.xls{,x} via
parse_foreign_company(), then upserts to Supabase on (date, ticker, side).
Idempotent — safe to re-run; the daily Vercel cron keeps it current going
forward, so this is a one-time history load.

Usage:
  backfill_foreign_company.py                 # all local workbooks
  backfill_foreign_company.py --from 2024-01  # only YYYY-MM and later
  backfill_foreign_company.py --dry-run       # parse + count, no writes
"""
from __future__ import annotations

import argparse
import os
import time
from pathlib import Path

from supabase import create_client, Client

from parse_foreign_company import parse_foreign_company

DAILY_DIR = Path(__file__).parent / "data" / "daily"
BATCH = 500


def sb() -> Client:
    return create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="date_from", default=None, help="YYYY-MM lower bound")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    files = sorted(p for p in DAILY_DIR.glob("*.xls*"))
    if args.date_from:
        files = [p for p in files if p.stem[:7] >= args.date_from]
    print(f"{len(files)} workbooks to scan"
          + (f" (from {args.date_from})" if args.date_from else ""))

    client = None if args.dry_run else sb()
    all_rows: list[dict] = []
    sessions_with_data = 0
    errors = 0

    for i, path in enumerate(files):
        try:
            rows = parse_foreign_company(path)
        except Exception as e:
            errors += 1
            if errors <= 20:
                print(f"  ERR {path.name}: {e}")
            continue
        if rows:
            sessions_with_data += 1
            all_rows.extend(rows)
        if (i + 1) % 500 == 0:
            print(f"  scanned {i + 1}/{len(files)} — {len(all_rows)} rows so far")

    print(f"\nParsed {len(all_rows)} (date,ticker,side) rows "
          f"from {sessions_with_data} sessions; {errors} read errors.")

    if args.dry_run:
        print("DRY RUN — nothing written.")
        return

    written = 0
    for i in range(0, len(all_rows), BATCH):
        batch = all_rows[i:i + BATCH]
        client.table("foreign_flow_company_daily").upsert(
            batch, on_conflict="date,ticker,side"
        ).execute()
        written += len(batch)
        if i and i % (BATCH * 10) == 0:
            print(f"  upserted {written}/{len(all_rows)}")
        time.sleep(0.05)
    print(f"Done: upserted {written} rows.")


if __name__ == "__main__":
    main()
