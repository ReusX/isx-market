#!/usr/bin/env python3
"""Dump what we currently hold for a ticker, to compare against a source screenshot.

Prints:
  - template + the financial_reports rows (id, year, period, status) we can attach to
  - a pivot of every stored fact: line_key  x  (year/period)  ->  value_iqd

Usage:  ./.venv/bin/python scripts/fundamentals_show.py TASC
        ./.venv/bin/python scripts/fundamentals_show.py TASC --raw   # show value_reported+unit
"""
from __future__ import annotations
import argparse, json, os, sys
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent


def _env():
    for line in (ROOT / ".env.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url.startswith("http"):
        url = f"https://{url}.supabase.co"
    return url, key


URL, KEY = _env()
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}


def get(path):
    r = requests.get(f"{URL}/rest/v1/{path}", headers=H, timeout=60)
    r.raise_for_status()
    return r.json()


def human(v):
    if v is None:
        return "—"
    a = abs(v)
    if a >= 1e12: return f"{v/1e12:.2f}T"
    if a >= 1e9:  return f"{v/1e9:.2f}B"
    if a >= 1e6:  return f"{v/1e6:.2f}M"
    if a >= 1e3:  return f"{v/1e3:.2f}K"
    return f"{v:.0f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ticker")
    ap.add_argument("--raw", action="store_true")
    args = ap.parse_args()
    t = args.ticker.upper()

    reports = get(f"financial_reports?ticker=eq.{t}&select=id,fiscal_year,period,status,template,unit_reported&order=fiscal_year.desc,period")
    if not reports:
        print(f"No financial_reports rows for {t}"); return
    tmpl = reports[0].get("template")
    print(f"\n=== {t}   template={tmpl} ===")
    print("REPORTS (attach corrections to these report_id):")
    for r in reports:
        print(f"  id={r['id']:<6} {r['fiscal_year']} {r['period']:<7} status={r['status']:<10} unit={r.get('unit_reported')}")

    facts = get(f"financial_facts?ticker=eq.{t}&select=fiscal_year,period,statement,line_key,value_iqd,value_reported,unit_reported&order=statement,line_key")
    if not facts:
        print("\n(no facts stored)"); return

    cols = sorted({(f["fiscal_year"], f["period"]) for f in facts},
                  key=lambda c: (c[0], {"ANNUAL":0,"Q4":1,"Q3":2,"Q2":3,"Q1":4}.get(c[1],9)))
    colhdr = [f"{y} {p}" for (y, p) in cols]

    by = {}
    for f in facts:
        by.setdefault((f["statement"], f["line_key"]), {})[(f["fiscal_year"], f["period"])] = f
    statements_order = {"income":0,"balance":1,"cashflow":2,"metrics":3}

    print("\nFACTS (value_iqd, human-readable):")
    w = 34
    print(" " * w + "".join(f"{c:>16}" for c in colhdr))
    last_stmt = None
    for (stmt, key) in sorted(by, key=lambda sk: (statements_order.get(sk[0],9), sk[1])):
        if stmt != last_stmt:
            print(f"[{stmt}]")
            last_stmt = stmt
        cells = []
        for c in cols:
            f = by[(stmt, key)].get(c)
            if not f:
                cells.append("—")
            elif args.raw:
                cells.append(f"{f['value_reported']}·{f['unit_reported']}")
            else:
                cells.append(human(f["value_iqd"]))
        print(f"  {key:<32}" + "".join(f"{x:>16}" for x in cells))


if __name__ == "__main__":
    main()
