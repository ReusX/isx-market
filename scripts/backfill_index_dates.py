#!/usr/bin/env python3
"""Backfill daily_index with session dates from all parsed daily JSON files.

For old sessions (pre-2017) where extract_index() couldn't find the ISX60 sheet,
we at least insert the date + totals computed from company rows so that the
forward-fill session calendar works in the chart code.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent / ".env")
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

DAILY_PARSED = Path(__file__).parent / "data" / "daily_parsed"
BATCH = 500

def chunked(rows, n=BATCH):
    for i in range(0, len(rows), n):
        yield rows[i:i + n]

# Fetch existing dates so we don't overwrite good data
existing = {r["date"] for r in sb.table("daily_index").select("date").execute().data or []}
print(f"Existing daily_index rows: {len(existing)}")

to_insert: list[dict] = []
skipped = 0

for f in sorted(DAILY_PARSED.glob("*.json")):
    d = json.loads(f.read_text())
    date = d.get("date")
    if not date:
        continue
    if date in existing:
        skipped += 1
        continue
    rows = d.get("rows") or []
    if not rows:
        continue  # no company data = probably a bad file, skip

    # Compute session totals from company rows
    total_vol   = sum((r.get("volume") or 0) for r in rows)
    total_val   = sum((r.get("value")  or 0) for r in rows)
    total_trades= sum((r.get("trades") or 0) for r in rows)
    traded      = sum(1 for r in rows if (r.get("volume") or 0) > 0)

    to_insert.append({
        "date": date,
        "isx60": None,          # old sessions don't have ISX60
        "isx15": None,
        "total_volume": total_vol or None,
        "total_value":  total_val or None,
        "total_trades": int(total_trades) if total_trades else None,
        "traded_companies": traded or None,
        "listed_companies": None,
    })

print(f"Skipped (already in DB): {skipped}")
print(f"To insert: {len(to_insert)}")

inserted = 0
for batch in chunked(to_insert):
    sb.table("daily_index").upsert(batch, on_conflict="date").execute()
    inserted += len(batch)
    print(f"  inserted {inserted}/{len(to_insert)}")

print(f"Done. daily_index now has {len(existing) + len(to_insert)} rows.")
