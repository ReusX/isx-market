#!/usr/bin/env python3
"""Ingest the ISC financial-report INDEX into financial_reports.

The ISC site exposes clean JSON (no scraping needed):
  • company list   GET  api.isc.gov.iq/api/companies?page=N   → {id, code, ...}
  • per-company     GET  api.isc.gov.iq/api/companies/<id>/reports
        → [{year, q1, q2, q3, q4, annual}, ...] where each quarter/annual is
          {id, url, year, quarter, adddate} or null.

We map ISC company_id ↔ our ticker (companies.json `sym` == ISC `code`), flatten
every (year, period) into a financial_reports row, and upsert by the ISC report
id so re-runs are idempotent. We do NOT touch `status`/extraction columns on
update, so re-ingesting never resets extraction progress.

We store the stable ISC pdf_url and extract from it on demand — PDFs are NOT
bulk-archived (≈20GB would blow the free storage tier).

Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
Usage:
  ./.venv/bin/python scripts/ingest_fundamentals_index.py            # all companies
  ./.venv/bin/python scripts/ingest_fundamentals_index.py --only TASC,BCIH
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
COMPANIES_JSON = ROOT / "public" / "data" / "companies.json"

API = "https://api.isc.gov.iq/api"
UA = {"User-Agent": "Mozilla/5.0 (iraqsm.com fundamentals pipeline)"}
RETRIES = 4
DELAY_S = 0.4

PERIODS = [("q1", "Q1"), ("q2", "Q2"), ("q3", "Q3"), ("q4", "Q4"), ("annual", "ANNUAL")]


def _load_env() -> None:
    env = ROOT / ".env.local"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def fetch_json(url: str):
    last = None
    for attempt in range(1, RETRIES + 1):
        try:
            r = requests.get(url, headers=UA, timeout=45)
            r.raise_for_status()
            return r.json()
        except (requests.RequestException, ValueError) as e:
            last = e
            time.sleep(2 * attempt)
    print(f"  ! giving up on {url}: {last}", file=sys.stderr)
    return None


def isc_company_map() -> dict[str, int]:
    """{TICKER (upper, stripped): isc_company_id} across all pages."""
    out: dict[str, int] = {}
    page = 1
    while True:
        data = fetch_json(f"{API}/companies?page={page}")
        rows = (data or {}).get("data") or []
        if not rows:
            break
        for c in rows:
            code = (c.get("code") or "").strip().upper()
            if code and c.get("id") is not None and code not in out:
                out[code] = c["id"]
        last_page = (data or {}).get("last_page") or page
        if page >= last_page:
            break
        page += 1
        time.sleep(DELAY_S)
    return out


def flatten_reports(reports_json, company_id: int, ticker: str) -> list[dict]:
    rows: list[dict] = []
    for yr in reports_json or []:
        for field, period in PERIODS:
            rec = yr.get(field)
            if not rec or not rec.get("url"):
                continue
            try:
                fiscal_year = int(str(rec.get("year") or yr.get("year")).strip())
            except (TypeError, ValueError):
                continue
            rows.append({
                "id": rec["id"],
                "company_id": company_id,
                "ticker": ticker,
                "fiscal_year": fiscal_year,
                "period": period,
                "pdf_url": rec["url"],
                "source_added_date": rec.get("adddate"),
            })
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated tickers to limit ingestion")
    args = ap.parse_args()

    _load_env()
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing Supabase env (URL + SERVICE_ROLE_KEY)", file=sys.stderr)
        return 1
    if not url.startswith("http"):
        url = f"https://{url}.supabase.co"

    companies = json.loads(COMPANIES_JSON.read_text())
    want = None
    if args.only:
        want = {t.strip().upper() for t in args.only.split(",")}
    tickers = [c["sym"].strip().upper() for c in companies
               if not want or c["sym"].strip().upper() in want]

    print(f"Building ISC company id map…")
    cmap = isc_company_map()
    print(f"  {len(cmap)} ISC companies have codes")

    all_rows: list[dict] = []
    matched = unmatched = 0
    for tk in tickers:
        cid = cmap.get(tk)
        if cid is None:
            unmatched += 1
            print(f"  - {tk}: no ISC company id (skipped)")
            continue
        matched += 1
        reports = fetch_json(f"{API}/companies/{cid}/reports")
        rows = flatten_reports(reports, cid, tk)
        all_rows.extend(rows)
        print(f"  + {tk} (isc {cid}): {len(rows)} reports")
        time.sleep(DELAY_S)

    print(f"\nMatched {matched} tickers, {unmatched} unmatched; {len(all_rows)} report rows.")
    if not all_rows:
        return 0

    # Upsert by ISC report id; omit status/extraction cols so re-runs don't reset them.
    sb_url = f"{url}/rest/v1/financial_reports?on_conflict=id"
    headers = {
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    BATCH = 500
    for i in range(0, len(all_rows), BATCH):
        chunk = all_rows[i:i + BATCH]
        r = requests.post(sb_url, headers=headers, data=json.dumps(chunk), timeout=90)
        if r.status_code >= 300:
            print(f"  ! upsert failed [{r.status_code}]: {r.text[:400]}", file=sys.stderr)
            return 1
        print(f"  upserted {i + len(chunk)}/{len(all_rows)}")
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
