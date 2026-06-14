#!/usr/bin/env python3
"""Load all parsed ISX monthly-report JSONs into Supabase (v2 — all tables).

Usage:
    # Load a single JSON
    load_to_supabase_v2.py data/parsed/2026-04.json

    # Load all JSONs in a directory
    load_to_supabase_v2.py data/parsed/

    # Dry-run (print counts, don't upsert)
    load_to_supabase_v2.py data/parsed/ --dry-run

    # Re-parse from PDFs then load
    load_to_supabase_v2.py data/pdfs/ --parse-first
"""
from __future__ import annotations

import argparse
import json

def _int(v):
    """Cast float-ish value to int, return None if missing."""
    return int(v) if v is not None else None
import os
import sys
import time
from pathlib import Path
from typing import Any

from supabase import create_client, Client

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # service role — write access

BATCH = 500  # rows per upsert call


def sb() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def upsert(client: Client, table: str, rows: list[dict], conflict: str, dry: bool) -> int:
    if not rows:
        return 0
    if dry:
        print(f"  DRY {table}: {len(rows)} rows (conflict: {conflict})")
        return len(rows)
    total = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i:i + BATCH]
        client.table(table).upsert(batch, on_conflict=conflict).execute()
        total += len(batch)
        if len(rows) > BATCH:
            time.sleep(0.1)
    return total


# ── loaders per table ─────────────────────────────────────────────────────────

def load_companies(client, data, dry):
    rows = []
    for c in data.get("companies", []):
        if not c.get("ticker"):
            continue
        rows.append({
            "ticker":       c["ticker"],
            "name_ar":      c.get("name_ar"),
            "name_en":      c.get("name_en"),
            "sector":       c.get("sector"),
            "listed_shares":c.get("listed_shares"),
        })
    n = upsert(client, "companies", rows, "ticker", dry)
    if n:
        print(f"  companies: {n}")


def load_daily_index(client, data, dry):
    rows = []
    for d in data.get("daily_index", []):
        if not d.get("date"):
            continue
        rows.append({
            "date":   d["date"],
            "index":  d.get("index"),
            "change": d.get("change"),
            "volume": d.get("volume"),
            "value":  d.get("value"),
            "trades": _int(d.get("trades")),
        })
    n = upsert(client, "daily_index", rows, "date", dry)
    if n:
        print(f"  daily_index: {n}")


def load_sector_monthly(client, data, dry):
    year, month = data.get("year"), data.get("month")
    rows = []
    for s in data.get("sectors", []):
        if not s.get("sector"):
            continue
        rows.append({
            "year":      year,
            "month":     month,
            "sector":    s["sector"],
            "volume":    s.get("volume"),
            "value":     s.get("value"),
            "trades":    _int(s.get("trades")),
            "companies": _int(s.get("companies")),
            "listed":    _int(s.get("listed")),
        })
    n = upsert(client, "sector_monthly", rows, "year,month,sector", dry)
    if n:
        print(f"  sector_monthly: {n}")


def load_market_cap(client, data, dry):
    year, month = data.get("year"), data.get("month")
    rows = []
    for mc in data.get("market_cap_by_sector", []):
        if not mc.get("sector"):
            continue
        rows.append({
            "year":       year,
            "month":      month,
            "sector":     mc["sector"],
            "market_cap": mc.get("market_cap"),
        })
    n = upsert(client, "market_cap_sector", rows, "year,month,sector", dry)
    if n:
        print(f"  market_cap_sector: {n}")


def load_foreign_flow_daily(client, data, dry):
    year, month = data.get("year"), data.get("month")
    rows = []
    flow = data.get("foreign_flow_daily", {})
    for side, items in [("buy", flow.get("buy", [])), ("sell", flow.get("sell", []))]:
        for item in items:
            if not item.get("date"):
                continue
            rows.append({
                "year":      year,
                "month":     month,
                "date":      item["date"],
                "side":      side,
                "volume":    item.get("volume"),
                "value":     item.get("value"),
                "trades":    _int(item.get("trades")),
                "companies": _int(item.get("companies")),
            })
    n = upsert(client, "foreign_flow_daily", rows, "date,side", dry)
    if n:
        print(f"  foreign_flow_daily: {n}")


def load_foreign_flow_sector(client, data, dry):
    year, month = data.get("year"), data.get("month")
    rows = []
    flow = data.get("foreign_flow_sector", {})
    for side, items in [("buy", flow.get("buy", [])), ("sell", flow.get("sell", []))]:
        for item in items:
            if not item.get("sector"):
                continue
            rows.append({
                "year":      year,
                "month":     month,
                "sector":    item["sector"],
                "side":      side,
                "volume":    item.get("volume"),
                "value":     item.get("value"),
                "trades":    _int(item.get("trades")),
                "companies": _int(item.get("companies")),
                "listed":    _int(item.get("listed")),
            })
    n = upsert(client, "foreign_flow_sector", rows, "year,month,sector,side", dry)
    if n:
        print(f"  foreign_flow_sector: {n}")


def load_company_caps(client, data, dry):
    year, month = data.get("year"), data.get("month")
    rows = []
    for c in data.get("company_caps", []):
        if not c.get("ticker"):
            continue
        rows.append({
            "year":       year,
            "month":      month,
            "ticker":     c["ticker"],
            "name_en":    c.get("name_en"),
            "capital":    c.get("capital"),
            "price":      c.get("price"),
            "market_cap": c.get("market_cap"),
        })
    n = upsert(client, "company_caps_monthly", rows, "year,month,ticker", dry)
    if n:
        print(f"  company_caps_monthly: {n}")


def load_ownership(client, data, dry):
    year, month = data.get("year"), data.get("month")
    rows = []
    for o in data.get("ownership", []):
        if not o.get("name_ar"):
            continue
        rows.append({
            "year":              year,
            "month":             month,
            "name_ar":           o["name_ar"],
            "sector":            o.get("sector"),
            "capital":           o.get("capital"),
            "deposited_capital": o.get("deposited_capital"),
            "deposit_ratio":     o.get("deposit_ratio"),
            "iraqi_shares":      o.get("iraqi_shares"),
            "foreign_shares":    o.get("foreign_shares"),
            "iraqi_count":       o.get("iraqi_count"),
            "foreign_count":     o.get("foreign_count"),
        })
    n = upsert(client, "ownership_monthly", rows, "year,month,name_ar", dry)
    if n:
        print(f"  ownership_monthly: {n}")


def load_major_shareholders(client, data, dry):
    year, month = data.get("year"), data.get("month")
    rows = []
    for s in data.get("major_shareholders", []):
        if not s.get("company_name_ar"):
            continue
        rows.append({
            "year":            year,
            "month":           month,
            "company_name_ar": s["company_name_ar"],
            "sector":          s.get("sector"),
            "rank":            s.get("rank"),
            "name_ar":         s.get("name_ar"),
            "nationality":     s.get("nationality"),
            "curr_shares":     s.get("curr_shares"),
            "curr_pct":        s.get("curr_pct"),
            "prev_shares":     s.get("prev_shares"),
            "prev_pct":        s.get("prev_pct"),
            "change_pct":      s.get("change_pct"),
        })
    n = upsert(client, "major_shareholders", rows, "year,month,company_name_ar,rank", dry)
    if n:
        print(f"  major_shareholders: {n}")


def load_depository(client, data, dry):
    year, month = data.get("year"), data.get("month")
    rows = []
    for d in data.get("depository", []):
        if not d.get("name_ar"):
            continue
        rows.append({
            "year":                year,
            "month":               month,
            "name_ar":             d["name_ar"],
            "sector":              d.get("sector"),
            "capital":             d.get("capital"),
            "deposited_shares":    d.get("deposited_shares"),
            "individual_iraqi":    d.get("individual_iraqi"),
            "individual_foreign":  d.get("individual_foreign"),
            "entity_iraqi":        d.get("entity_iraqi"),
            "entity_foreign":      d.get("entity_foreign"),
        })
    n = upsert(client, "depository_monthly", rows, "year,month,name_ar", dry)
    if n:
        print(f"  depository_monthly: {n}")


def load_capital_events(client, data, dry):
    year, month = data.get("year"), data.get("month")
    rows = []
    for e in data.get("capital_events", []):
        if not e.get("name_ar"):
            continue
        rows.append({
            "year":        year,
            "month":       month,
            "name_ar":     e["name_ar"],
            "event_type":  e.get("event_type"),
            "old_capital": e.get("old_capital"),
            "new_shares":  e.get("new_shares"),
            "new_capital": e.get("new_capital"),
            "count":       e.get("count"),
        })
    n = upsert(client, "capital_events", rows, "year,month,name_ar,event_type", dry)
    if n:
        print(f"  capital_events: {n}")


LOADERS = [
    load_companies,
    load_daily_index,
    load_sector_monthly,
    load_market_cap,
    load_foreign_flow_daily,
    load_foreign_flow_sector,
    load_company_caps,
    load_ownership,
    load_major_shareholders,
    load_depository,
    load_capital_events,
]


def process_json(path: Path, client: Client, dry: bool) -> None:
    data = json.loads(path.read_text())
    year, month = data.get("year"), data.get("month")
    mo_str = f"{month:02d}" if month else "??"
    print(f"\n── {path.name} ({year}-{mo_str}) ──")
    for loader in LOADERS:
        try:
            loader(client, data, dry)
        except Exception as e:
            print(f"  ERROR in {loader.__name__}: {e}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=Path, help="JSON file or directory of JSONs (or PDFs with --parse-first)")
    ap.add_argument("--dry-run",     action="store_true")
    ap.add_argument("--parse-first", action="store_true",
                    help="Re-parse PDFs in path/ before loading")
    args = ap.parse_args()

    client = sb()
    dry = args.dry_run

    if args.parse_first:
        # Parse PDFs first
        pdf_dir = args.path
        out_dir = pdf_dir.parent / "parsed"
        out_dir.mkdir(exist_ok=True)
        pdfs = sorted(pdf_dir.glob("*.pdf"))
        print(f"Parsing {len(pdfs)} PDFs → {out_dir}")

        # Import parse_monthly_full lazily (needs pdfplumber)
        sys.path.insert(0, str(Path(__file__).parent))
        from parse_monthly_full import parse_report_full

        for pdf in pdfs:
            out = out_dir / (pdf.stem + ".json")
            if out.exists():
                print(f"  skip (already parsed): {pdf.name}")
                continue
            try:
                result = parse_report_full(pdf)
                out.write_text(json.dumps(result, ensure_ascii=False, indent=1))
                print(f"  parsed: {pdf.name}")
            except Exception as e:
                print(f"  ERROR parsing {pdf.name}: {e}")

        json_dir = out_dir
    elif args.path.is_dir():
        json_dir = args.path
    else:
        process_json(args.path, client, dry)
        return

    import re as _re
    MAIN_PAT = _re.compile(r"^\d{4}-\d{2}\.json$")
    jsons = sorted(j for j in json_dir.glob("*.json") if MAIN_PAT.match(j.name))
    print(f"\nLoading {len(jsons)} main JSON files from {json_dir} (skipping sub-reports)")
    for j in jsons:
        process_json(j, client, dry)

    print("\nDone.")


if __name__ == "__main__":
    main()
