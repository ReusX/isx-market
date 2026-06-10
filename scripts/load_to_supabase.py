#!/usr/bin/env python3
"""Upsert parsed monthly-report JSON into Supabase.

Usage: load_to_supabase.py parsed1.json [parsed2.json ...]

Reads SUPABASE_URL and SUPABASE_KEY from scripts/.env (or the environment).
SUPABASE_KEY must be the service-role key — the tables are RLS-protected and
anon is read-only. Never commit the .env file.

Company names: the PDFs' Arabic text extracts in visual order and is only
heuristically recovered, so existing name_ar/name_en values in the companies
table are NEVER overwritten — PDF names fill gaps only.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

BATCH = 500


def chunked(rows: list, n: int = BATCH):
    for i in range(0, len(rows), n):
        yield rows[i:i + n]


def load_file(sb, path: Path) -> None:
    data = json.loads(path.read_text())
    year, month = data.get("year"), data.get("month")
    if not year or not month:
        print(f"  {path.name}: missing year/month — skipped", file=sys.stderr)
        return

    companies = data.get("companies") or []

    # companies — fill-only (don't clobber curated names/sectors)
    existing = {
        r["ticker"]: r
        for r in (sb.table("companies").select("ticker,name_en,name_ar,sector").execute().data or [])
    }
    comp_rows = []
    for c in companies:
        old = existing.get(c["ticker"], {})
        comp_rows.append({
            "ticker":  c["ticker"],
            "name_en": old.get("name_en") or c.get("name_en"),
            "name_ar": old.get("name_ar") or c.get("name_ar"),
            "sector":  old.get("sector") or c.get("sector"),
        })
    for batch in chunked(comp_rows):
        sb.table("companies").upsert(batch, on_conflict="ticker").execute()

    price_rows = [{
        "ticker": c["ticker"], "year": year, "month": month,
        "open": c.get("open"), "high": c.get("high"), "low": c.get("low"),
        "close": c.get("close"), "avg_price": c.get("avg"),
        "prev_close": c.get("prev_close"), "change_pct": c.get("change_pct"),
        "volume": c.get("volume"), "value": c.get("value"),
        "trades": c.get("trades"),
        "trading_days": int(c["trading_days"]) if c.get("trading_days") is not None else None,
    } for c in companies]
    for batch in chunked(price_rows):
        sb.table("monthly_prices").upsert(batch, on_conflict="ticker,year,month").execute()

    daily_rows = [{
        "date": d["date"], "isx60": d.get("isx60"), "isx15": d.get("isx15"),
        "total_volume": d.get("volume"), "total_value": d.get("value"),
        "total_trades": d.get("trades"),
        "traded_companies": int(d["traded_companies"]) if d.get("traded_companies") is not None else None,
        "listed_companies": int(d["listed_companies"]) if d.get("listed_companies") is not None else None,
    } for d in (data.get("daily_index") or [])]
    for batch in chunked(daily_rows):
        sb.table("daily_index").upsert(batch, on_conflict="date").execute()

    mcap = {m["sector"]: m["market_cap"] for m in (data.get("market_cap_by_sector") or [])}
    sector_rows = [{
        "year": year, "month": month, "sector": s["sector"],
        "volume": s.get("volume"), "value": s.get("value"), "trades": s.get("trades"),
        "traded_companies": s.get("traded_companies"),
        "listed_companies": s.get("listed_companies"),
        "market_cap": mcap.pop(s["sector"], None),
    } for s in (data.get("sectors") or [])]
    # sectors that only appear in the market-cap table
    sector_rows += [{"year": year, "month": month, "sector": sec, "market_cap": cap}
                    for sec, cap in mcap.items()]
    for batch in chunked(sector_rows):
        sb.table("sector_monthly").upsert(batch, on_conflict="year,month,sector").execute()

    print(f"  {path.name}: companies={len(comp_rows)} prices={len(price_rows)} "
          f"daily={len(daily_rows)} sectors={len(sector_rows)}")


def main() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit("Set SUPABASE_URL and SUPABASE_KEY in scripts/.env")
    if len(sys.argv) < 2:
        sys.exit("Usage: load_to_supabase.py parsed1.json [...]")
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    for arg in sys.argv[1:]:
        load_file(sb, Path(arg))


if __name__ == "__main__":
    main()
