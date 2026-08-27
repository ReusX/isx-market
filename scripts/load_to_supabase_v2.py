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

# `companies` is deliberately NOT loaded from the monthly reports. The full RTL
# parse mangles Arabic company names — the table still carries "9", "5", "اسٌا سٌل"
# from when this ran — and nothing in the app reads that table; the site's company
# register is public/data/companies.json, maintained by sync_companies.py. Writing
# it from here only corrupts it, so the loader is gone rather than fixed.


def load_daily_index(client, data, dry):
    """Official monthly index series → daily_index.

    Column names follow load_to_supabase.py, which is the canonical schema: it is
    what the table actually has, and every reader in the app selects `isx60`.
    """
    rows = []
    for d in data.get("daily_index", []):
        if not d.get("date"):
            continue
        rows.append({
            "date":             d["date"],
            "isx60":            d.get("isx60"),
            "isx15":            d.get("isx15"),
            "total_volume":     d.get("volume"),
            "total_value":      d.get("value"),
            "total_trades":     _int(d.get("trades")),
            "traded_companies": _int(d.get("traded_companies")),
            "listed_companies": _int(d.get("listed_companies")),
        })
    n = upsert(client, "daily_index", rows, "date", dry)
    if n:
        print(f"  daily_index: {n}")


def load_sector_monthly(client, data, dry):
    """Sector activity + market cap → sector_monthly.

    Market cap by sector lives in this table, not a separate `market_cap_sector`
    one — that table has never existed in the database.
    """
    year, month = data.get("year"), data.get("month")
    mcap = {m["sector"]: m.get("market_cap")
            for m in (data.get("market_cap_by_sector") or []) if m.get("sector")}

    rows = []
    for s in data.get("sectors", []):
        if not s.get("sector"):
            continue
        rows.append({
            "year":             year,
            "month":            month,
            "sector":           s["sector"],
            "volume":           s.get("volume"),
            "value":            s.get("value"),
            "trades":           _int(s.get("trades")),
            "traded_companies": _int(s.get("traded_companies")),
            "listed_companies": _int(s.get("listed_companies")),
            "market_cap":       mcap.pop(s["sector"], None),
        })
    # sectors that appear only in the market-cap table
    rows += [{"year": year, "month": month, "sector": sec, "market_cap": cap}
             for sec, cap in mcap.items()]

    # one upsert batch must not carry the same (year,month,sector) twice
    seen: set[str] = set()
    rows = [r for r in rows if not (r["sector"] in seen or seen.add(r["sector"]))]

    n = upsert(client, "sector_monthly", rows, "year,month,sector", dry)
    if n:
        print(f"  sector_monthly: {n}")


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
    load_daily_index,
    load_sector_monthly,
    load_foreign_flow_daily,
    load_foreign_flow_sector,
    load_company_caps,
    load_ownership,
    load_major_shareholders,
    load_depository,
    load_capital_events,
]


def process_json(path: Path, client: Client, dry: bool, failures: list[str],
                 only: set[str] | None = None) -> None:
    """Run every loader over one report.

    A failing loader does not abort the other ten — one unparseable table should
    not cost the whole report — but it IS recorded, and main() exits non-zero on
    any failure. Printing the error and exiting 0 is how four broken loaders ran
    green in CI for months while sector_monthly silently went two months stale.
    """
    data = json.loads(path.read_text())
    year, month = data.get("year"), data.get("month")
    mo_str = f"{month:02d}" if month else "??"
    print(f"\n── {path.name} ({year}-{mo_str}) ──")
    for loader in LOADERS:
        # `--only` exists for scoped repairs: when one table has to be fixed,
        # rewriting ten others with identical values makes it impossible to say
        # afterwards that nothing else changed.
        if only and loader.__name__.removeprefix("load_") not in only:
            continue
        try:
            loader(client, data, dry)
        except Exception as e:
            print(f"  ERROR in {loader.__name__}: {e}", file=sys.stderr)
            failures.append(f"{path.name} · {loader.__name__}: {e}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=Path, help="JSON file or directory of JSONs (or PDFs with --parse-first)")
    ap.add_argument("--dry-run",     action="store_true")
    ap.add_argument("--parse-first", action="store_true",
                    help="Re-parse PDFs in path/ before loading")
    ap.add_argument("--only", default=None,
                    help="Comma-separated table names to load, e.g. --only sector_monthly. "
                         "Every other loader is skipped, so a scoped repair leaves the rest "
                         "of the database provably untouched.")
    args = ap.parse_args()

    client = sb()
    dry = args.dry_run
    failures: list[str] = []
    only = {s.strip() for s in args.only.split(",")} if args.only else None

    if only:
        known = {f.__name__.removeprefix("load_") for f in LOADERS}
        unknown = only - known
        if unknown:
            sys.exit(f"--only: no such loader(s): {', '.join(sorted(unknown))}\n"
                     f"known: {', '.join(sorted(known))}")
        print(f"Scoped run — loading only: {', '.join(sorted(only))}")

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
                print(f"  ERROR parsing {pdf.name}: {e}", file=sys.stderr)
                failures.append(f"parse {pdf.name}: {e}")

        json_dir = out_dir
    elif args.path.is_dir():
        json_dir = args.path
    else:
        process_json(args.path, client, dry, failures, only)
        _finish(failures)
        return

    import re as _re
    MAIN_PAT = _re.compile(r"^\d{4}-\d{2}\.json$")
    jsons = sorted(j for j in json_dir.glob("*.json") if MAIN_PAT.match(j.name))
    print(f"\nLoading {len(jsons)} main JSON files from {json_dir} (skipping sub-reports)")
    for j in jsons:
        process_json(j, client, dry, failures, only)

    _finish(failures)


def _finish(failures: list[str]) -> None:
    if not failures:
        print("\nDone.")
        return
    print(f"\nFAILED — {len(failures)} loader error(s):", file=sys.stderr)
    for f in failures:
        print(f"  · {f}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
