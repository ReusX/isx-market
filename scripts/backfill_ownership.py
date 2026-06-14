#!/usr/bin/env python3
"""Re-parse ownership (Table 38) and major-shareholders (Table 39) from the
monthly PDFs and reload them cleanly.

An earlier parser run mis-mapped the RTL columns, so some months (e.g. 2026-05)
landed in Supabase with the *capital* number stored as `name_ar`
("1,000,000,000") and share counts in the wrong fields. The parser is fixed now,
but those corrupt rows have garbage conflict keys, so a plain upsert would leave
them behind. This script therefore DELETES each affected (year, month) before
inserting the freshly parsed rows.

Only 2025+ reports carry these tables.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import pdfplumber
from supabase import create_client

from parse_monthly_full import parse_ownership, parse_major_shareholders

MAIN = re.compile(r"^(\d{4})-(\d{2})\.pdf$")
MIN_YEAR = 2025  # ownership / major-shareholder tables only exist from 2025

# env (.env.local lives one level up; shell doesn't export it)
_env = {}
for line in (Path(__file__).parent.parent / ".env.local").read_text().splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        _env[k] = v.strip().strip('"')

sb = create_client(_env["NEXT_PUBLIC_SUPABASE_URL"], _env["SUPABASE_SERVICE_ROLE_KEY"])

DRY = "--dry-run" in sys.argv


def _int(v):
    return int(v) if v is not None else None


def main() -> None:
    pdfs = sorted(p for p in Path("data/pdfs").glob("*.pdf") if MAIN.match(p.name))
    summary: list[str] = []

    for p in pdfs:
        m = MAIN.match(p.name)
        year, month = int(m.group(1)), int(m.group(2))
        if year < MIN_YEAR:
            continue
        try:
            with pdfplumber.open(p) as pdf:
                own = parse_ownership(pdf)
                sh = parse_major_shareholders(pdf)
        except Exception as e:
            summary.append(f"{p.name}: ERROR {e}")
            continue

        own_rows = [{
            "year": year, "month": month,
            "name_ar": o["name_ar"], "sector": o.get("sector"),
            "capital": o.get("capital"), "deposited_capital": o.get("deposited_capital"),
            "deposit_ratio": o.get("deposit_ratio"),
            "iraqi_shares": o.get("iraqi_shares"), "foreign_shares": o.get("foreign_shares"),
            "iraqi_count": o.get("iraqi_count"), "foreign_count": o.get("foreign_count"),
        } for o in own if o.get("name_ar")]

        sh_rows = [{
            "year": year, "month": month,
            "company_name_ar": s["company_name_ar"], "sector": s.get("sector"),
            "rank": s.get("rank"), "name_ar": s.get("name_ar"),
            "nationality": s.get("nationality"),
            "curr_shares": s.get("curr_shares"), "curr_pct": s.get("curr_pct"),
            "prev_shares": s.get("prev_shares"), "prev_pct": s.get("prev_pct"),
            "change_pct": s.get("change_pct"),
        } for s in sh if s.get("company_name_ar")]

        summary.append(f"{p.name}: ownership={len(own_rows)} shareholders={len(sh_rows)}")
        if DRY:
            continue

        for tbl, rows in [("ownership_monthly", own_rows), ("major_shareholders", sh_rows)]:
            if not rows:
                continue
            # wipe the month first — corrupt rows have garbage conflict keys
            sb.table(tbl).delete().eq("year", year).eq("month", month).execute()
            for i in range(0, len(rows), 500):
                sb.table(tbl).insert(rows[i:i + 500]).execute()

    print("\n".join(summary))
    print("done" if not DRY else "(dry run — nothing written)")


if __name__ == "__main__":
    main()
