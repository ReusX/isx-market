#!/usr/bin/env python3
"""Re-parse foreign-flow tables from the monthly PDFs and upsert them.

The earlier parser keyed buy/sell off hardcoded table numbers (6/7) and a
case-sensitive "Non-Iraqi" gate, which mislabeled or dropped the buy table on
many report formats (≈44% of days ended up with buy==sell or no buy at all).
The parser now keys off the Purchase/Sales page heading; this rewrites the
affected rows. Upsert keys are (date, side) for daily and
(year, month, sector, side) for sector, so this is idempotent.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import pdfplumber
from supabase import create_client

from parse_monthly_full import parse_foreign_daily, parse_foreign_sector

MAIN = re.compile(r"^(\d{4})-(\d{2})\.pdf$")
MIN_YEAR = 2022  # 2020-21 use an older format the parser can't read; DB starts 2023

sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"],
                   os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def _int(v):
    return int(v) if v is not None else None


def main() -> None:
    pdfs = sorted(p for p in (Path("data/pdfs")).glob("*.pdf") if MAIN.match(p.name))
    daily_rows: list[dict] = []
    sector_rows: list[dict] = []
    summary: list[str] = []

    for p in pdfs:
        m = MAIN.match(p.name)
        year, month = int(m.group(1)), int(m.group(2))
        if year < MIN_YEAR:
            continue
        try:
            with pdfplumber.open(p) as pdf:
                fd = parse_foreign_daily(pdf)
                fs = parse_foreign_sector(pdf)
        except Exception as e:
            summary.append(f"{p.name}: ERROR {e}")
            continue

        nb = ns = 0
        for side, items in [("buy", fd.get("buy", [])), ("sell", fd.get("sell", []))]:
            for it in items:
                if not it.get("date"):
                    continue
                daily_rows.append({
                    "year": year, "month": month, "date": it["date"], "side": side,
                    "volume": it.get("volume"), "value": it.get("value"),
                    "trades": _int(it.get("trades")), "companies": _int(it.get("companies")),
                })
                nb += side == "buy"; ns += side == "sell"
        for side, items in [("buy", fs.get("buy", [])), ("sell", fs.get("sell", []))]:
            for it in items:
                if not it.get("sector"):
                    continue
                sector_rows.append({
                    "year": year, "month": month, "sector": it["sector"], "side": side,
                    "volume": it.get("volume"), "value": it.get("value"),
                    "trades": _int(it.get("trades")), "companies": _int(it.get("companies")),
                    "listed": _int(it.get("listed")),
                })
        summary.append(f"{p.name}: buy={nb} sell={ns}")

    print("\n".join(summary))
    print(f"\nTotal daily rows: {len(daily_rows)}, sector rows: {len(sector_rows)}")
    if "--dry-run" in sys.argv:
        return

    for tbl, rows, key in [("foreign_flow_daily", daily_rows, "date,side"),
                           ("foreign_flow_sector", sector_rows, "year,month,sector,side")]:
        for i in range(0, len(rows), 500):
            sb.table(tbl).upsert(rows[i:i + 500], on_conflict=key).execute()
        print(f"upserted {len(rows)} → {tbl}")
    print("done")


if __name__ == "__main__":
    main()
