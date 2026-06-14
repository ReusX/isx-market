#!/usr/bin/env python3
"""Re-extract ISX60/ISX15 + session totals from every daily workbook on or
after the 2015-03-05 rebase and upsert into daily_index.

Earlier loads missed the 2015–2024 era because extract_index only read the
modern "المؤشرات الكلية" sheet; those workbooks carry the index on the trading
bulletin instead. parse_daily_xlsx.extract_index now handles both layouts.

Pre-rebase values (≤ 2015-03-04, old ~70-100 base) are skipped so the series
stays on one consistent scale.
"""
from __future__ import annotations

import glob
import os
import sys
from pathlib import Path

import pandas as pd
from supabase import create_client

from parse_daily_xlsx import extract_index

REBASE = "2015-03-05"  # ISX60 rebased here (68.69 -> 846.36)
BATCH = 500

sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"],
                   os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def main() -> None:
    files = sorted(glob.glob("data/daily/*.xls*"))
    rows: list[dict] = []
    skipped_pre = miss = 0
    for f in files:
        date = Path(f).stem[:10]
        if date < REBASE:
            skipped_pre += 1
            continue
        try:
            idx = extract_index(pd.ExcelFile(f), date)
        except Exception:
            idx = None
        if not idx or idx.get("isx60") is None:
            miss += 1
            continue
        rows.append({
            "date": idx["date"], "isx60": idx.get("isx60"), "isx15": idx.get("isx15"),
            "total_volume": idx.get("volume"), "total_value": idx.get("value"),
            "total_trades": int(idx["trades"]) if idx.get("trades") is not None else None,
            "traded_companies": int(idx["traded_companies"]) if idx.get("traded_companies") is not None else None,
            "listed_companies": int(idx["listed_companies"]) if idx.get("listed_companies") is not None else None,
        })

    print(f"workbooks: {len(files)}  pre-rebase skipped: {skipped_pre}  "
          f"no-index: {miss}  to upsert: {len(rows)}")
    if "--dry-run" in sys.argv:
        if rows:
            print("  first:", rows[0]["date"], rows[0]["isx60"])
            print("  last: ", rows[-1]["date"], rows[-1]["isx60"])
        return

    for i in range(0, len(rows), BATCH):
        sb.table("daily_index").upsert(rows[i:i + BATCH], on_conflict="date").execute()
        print(f"  upserted {min(i + BATCH, len(rows))}/{len(rows)}")
    print("done")


if __name__ == "__main__":
    main()
