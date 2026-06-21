#!/usr/bin/env python3
"""Local, low-cost extractor: scanned ISC financial PDF -> canonical JSON.

Uses Google Gemini (free tier: https://aistudio.google.com/apikey) to read the
scanned PDF and emit statement-sets in the EXACT format fundamentals_load.py
consumes. The accounting-identity checks in the loader are the safety net, so a
cheap/free model is fine: bad reads get flagged (status='failed'), not published.

This moves the expensive "read the pixels" step out of an interactive Claude
session and onto your machine, billed (if at all) to your own Gemini key.

Setup (one time):
    export GEMINI_API_KEY=...            # from aistudio.google.com/apikey (free)
    # uses the `requests` you already have; no extra packages needed.

Usage:
    python scripts/extract_gemini.py BNOI                 # latest annual report
    python scripts/extract_gemini.py BNOI --report 6597   # a specific ISC report id
    python scripts/extract_gemini.py --all-pending         # every not-yet-extracted ticker
    # then review the emitted JSON and load it:
    python scripts/fundamentals_load.py scripts/data/fundamentals/BNOI.gemini.json
    python scripts/fundamentals_load.py --publish BNOI     # after you've eyeballed it

Tip: --report can be repeated to bundle several years/quarters into one file.
"""
from __future__ import annotations
import argparse, json, os, sys, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = json.loads((ROOT / "data" / "fundamentals-schema.json").read_text())
OUTDIR = ROOT / "scripts" / "data" / "fundamentals"
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GKEY = os.environ.get("GEMINI_API_KEY")
GBASE = "https://generativelanguage.googleapis.com"


# ── Supabase (only to look up report ids / pdf urls / sector) ──────────────────
def _env():
    envf = ROOT / ".env.local"
    if envf.exists():
        for line in envf.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and key):
        sys.exit("Missing Supabase env (needed to look up report ids).")
    if not url.startswith("http"):
        url = f"https://{url}.supabase.co"
    return url, key


SB_URL, SB_KEY = _env()
SB_H = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}


def all_reports(ticker):
    params = {"ticker": f"eq.{ticker}", "select": "id,pdf_url,fiscal_year,period,status",
              "order": "fiscal_year.desc,period.asc"}
    return requests.get(f"{SB_URL}/rest/v1/financial_reports", headers=SB_H, params=params, timeout=60).json()


def reports_for(rows, report_ids=None, period_filter=None):
    """Which PDF(s) to actually send to the model."""
    if report_ids:
        ids = {int(x) for x in report_ids}
        return [r for r in rows if r["id"] in ids]
    if period_filter:
        matched = [r for r in rows if r["period"] == period_filter]
        return matched[:1]
    # default: the latest ANNUAL (its comparative column gives the prior year too)
    ann = [r for r in rows if r["period"] == "ANNUAL"]
    return ann[:1]


def build_year_ids(rows, target_report_ids=None):
    """Map fiscal_year -> report_id.

    For ANNUAL reports: each year maps to its own report.
    For quarterly reports (when specific IDs are requested): include those too,
    keyed by (fiscal_year, period) flattened as fiscal_year so the model can
    find them. When report_ids are explicit, include ALL periods in the map.
    """
    if target_report_ids:
        ids = {int(x) for x in target_report_ids}
        # Build map covering all periods, not just ANNUAL
        m = {}
        for r in rows:
            if r["period"] == "ANNUAL":
                m[r["fiscal_year"]] = r["id"]
        # Also add the explicit quarterly ones
        for r in rows:
            if r["id"] in ids and r["period"] != "ANNUAL":
                m[r["fiscal_year"]] = r["id"]  # may overwrite annual, that's fine
        return m
    # default: annual only
    return {r["fiscal_year"]: r["id"] for r in rows if r["period"] == "ANNUAL"}


def guess_template(ticker):
    comps = json.loads((ROOT / "public" / "data" / "companies.json").read_text())
    sec = next((c.get("sec") for c in comps if c.get("sym") == ticker), None)
    return "bank" if sec in ("BANK", "INS") else "industrial"


def pending_tickers():
    params = {"select": "ticker,status", "status": "eq.pending"}
    rows = requests.get(f"{SB_URL}/rest/v1/financial_reports", headers=SB_H, params=params, timeout=60).json()
    return sorted({r["ticker"] for r in rows})


# ── schema -> compact spec the model maps onto ────────────────────────────────
def template_spec(tpl):
    t = SCHEMA["templates"][tpl]
    spec = {}
    for stmt, v in t["statements"].items():
        spec[stmt] = [{"key": l["key"], "name_ar": l.get("name_ar"), "aliases": l.get("ar", [])}
                      for l in v["lines"]]
    if t.get("metrics"):
        spec["metrics"] = [{"key": l["key"], "name_ar": l.get("name_ar")}
                           for l in (t["metrics"].get("lines") or [])]
    ident = t.get("identities", [])
    return spec, ident


PROMPT = """You extract financial statements from a scanned Arabic PDF filed with the Iraq Securities Commission (ISC). Output STRICT JSON only.

The company is {ticker}, template "{tpl}". This document covers period "{expected_period}" (fiscal year {expected_year}). Below is the canonical chart of accounts: each line has a fixed `key`, a professional Arabic display name, and `aliases` (wordings you may see in the PDF). Map the company's own line items onto these keys. It is fine to leave a key out if the statement doesn't have it.

CANONICAL LINES (by statement):
{spec}

ACCOUNTING IDENTITIES that must hold (use them to self-check; fix misreads):
{ident}

WHERE TO LOOK: use the audited PRIMARY statements — قائمة المركز المالي / الميزانية العامة (balance), قائمة الدخل / حساب الأرباح والخسائر (income), and قائمة التدفقات النقدية (cash flow) if present. Read EXACT figures to the dinar as printed — do NOT use rounded summary/narrative numbers (e.g. "270.5 مليار"). Only if the primary statements are an illegible rotated scan, fall back to the board-report narrative تقرير مجلس الإدارة. Most filings show TWO columns: current year and prior year — extract BOTH as separate sets.

CRITICAL DISTINCTIONS (do not confuse these):
- ودائع العملاء (customer deposits) → customer_deposits. ودائع المصارف / المؤسسات المصرفية (deposits FROM other banks) → due_to_banks. These are different lines; assign each value to its OWN key. For most banks customer_deposits is the LARGER of the two.
- For income, prefer the precise lines: صافي إيرادات الفوائد/التمويل → financing_income; صافي العمولات (+ أرباح العملات + إيرادات أخرى if FX is large) → revenue_and_commissions; total expenses → ga_expenses; الربح قبل الضريبة → pretax_income; ضريبة الدخل → tax; صافي الربح → net_income. The identity net_income = pretax_income - tax MUST hold to the dinar.

UNITS: read the column header. It is one of مليون دينار (IQD_MILLIONS), ألف دينار (IQD_THOUSANDS), or plain دينار (IQD). Put values EXACTLY as printed in that unit (do NOT scale them). Set "unit_reported" accordingly. Wrong unit = off by 1000x, so be careful.

BANKS: if foreign-exchange trading gains are a large income line, include net commissions + FX gains + other operating income together in `revenue_and_commissions` so it represents total non-interest income. `financing_income` = net interest / financing income. Put CAR / NPL / LCR / NSFR percentages (if disclosed) under "metrics" as the raw percent number (e.g. 23.91).

KNOWN REPORT IDS by fiscal year (set "report_id" from this map; if a year you read is NOT in this map, OMIT that year's set):
{year_ids}

PERIOD RULES (CRITICAL):
- If this is an ANNUAL report (full 12-month year), set "period": "ANNUAL".
- If this is a QUARTERLY report, the period label printed in Arabic will say:
  الربع الأول (Q1, 3 months), الربع الثاني (Q2, 6 months cumulative),
  الربع الثالث (Q3, 9 months cumulative), الربع الرابع (Q4, 12 months / same as annual).
  Set "period" to exactly "Q1", "Q2", "Q3", or "Q4" accordingly.
- The expected period for the PRIMARY (current) column is "{expected_period}".
  Use that as the period for the current column unless you see clear evidence it's wrong.
- For the comparative (prior-period) column: set its period to match the same quarter/annual of the prior year.

OUTPUT: a JSON array of statement-sets, one set per fiscal_year present in the columns. Use this exact shape:
[
  {{
    "ticker": "{ticker}", "template": "{tpl}",
    "fiscal_year": 2025, "period": "Q1",
    "report_id": <id from the map above for that year>,
    "unit_reported": "IQD_THOUSANDS",
    "facts": {{
      "income":  {{ "<key>": {{"v": <number>, "label": "<the PDF's own Arabic wording>", "page": <pdf page>, "conf": 0.0-1.0}}, ... }},
      "balance": {{ ... }},
      "cashflow": {{ ... }},
      "metrics": {{ ... }}
    }}
  }}
]

Rules:
- "v" is a plain number (no commas, no parentheses; negative = minus sign).
- "label" must be the company's OWN wording from that line (for audit), not the canonical name.
- Emit one set per fiscal_year you can read (typically the current year and the prior-year comparative column). Each must use the matching report_id from the map.
- Return ONLY the JSON array. No markdown, no commentary."""


def gemini_upload(pdf_bytes, name):
    size = len(pdf_bytes)
    start = requests.post(
        f"{GBASE}/upload/v1beta/files?key={GKEY}",
        headers={"X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
                 "X-Goog-Upload-Header-Content-Length": str(size),
                 "X-Goog-Upload-Header-Content-Type": "application/pdf",
                 "Content-Type": "application/json"},
        data=json.dumps({"file": {"display_name": name}}), timeout=60)
    up_url = start.headers.get("X-Goog-Upload-URL")
    if not up_url:
        sys.exit(f"Gemini upload init failed: {start.status_code} {start.text[:300]}")
    up = requests.post(up_url, headers={"Content-Length": str(size), "X-Goog-Upload-Offset": "0",
                                        "X-Goog-Upload-Command": "upload, finalize"},
                       data=pdf_bytes, timeout=300)
    f = up.json()["file"]
    fname, uri, state = f["name"], f["uri"], f.get("state")
    while state == "PROCESSING":
        time.sleep(2)
        state = requests.get(f"{GBASE}/v1beta/{fname}?key={GKEY}", timeout=60).json().get("state")
    if state != "ACTIVE":
        sys.exit(f"Gemini file not ACTIVE: {state}")
    return uri


def gemini_extract(file_uri, prompt):
    body = {"contents": [{"parts": [{"file_data": {"mime_type": "application/pdf", "file_uri": file_uri}},
                                    {"text": prompt}]}],
            "generationConfig": {"temperature": 0, "response_mime_type": "application/json"}}
    MAX_RETRIES = 12
    for attempt in range(MAX_RETRIES):
        r = requests.post(f"{GBASE}/v1beta/models/{MODEL}:generateContent?key={GKEY}",
                          headers={"Content-Type": "application/json"}, data=json.dumps(body), timeout=300)
        if r.status_code in (429, 503):
            wait = min(30 * (2 ** attempt), 1800)  # cap at 30 min
            label = '429 rate-limited' if r.status_code == 429 else '503 overloaded'
            print(f"    {label}, retrying in {wait}s (attempt {attempt+1}/{MAX_RETRIES})…")
            time.sleep(wait)
            continue
        if r.status_code >= 300:
            sys.exit(f"Gemini generate failed: {r.status_code} {r.text[:400]}")
        txt = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(txt)
    sys.exit("Gemini generate: exceeded retry limit (429 persists)")


def extract_ticker(ticker, report_ids=None, period_filter=None):
    if not GKEY:
        sys.exit("Set GEMINI_API_KEY (free key at https://aistudio.google.com/apikey).")
    tpl = guess_template(ticker)
    rows = all_reports(ticker)
    reps = reports_for(rows, report_ids, period_filter)
    if not reps:
        print(f"  ! {ticker}: no matching reports"); return
    year_ids = build_year_ids(rows, report_ids)
    spec, ident = template_spec(tpl)
    all_sets = []
    for rep in reps:
        url = rep["pdf_url"]
        if not url:
            print(f"  ! {ticker} {rep['fiscal_year']} {rep['period']}: no pdf_url"); continue
        print(f"  · {ticker} {rep['fiscal_year']} {rep['period']} (id {rep['id']}) — downloading…")
        pdf = requests.get(url, timeout=120).content
        uri = gemini_upload(pdf, f"{ticker}_{rep['id']}.pdf")
        prompt = PROMPT.format(ticker=ticker, tpl=tpl,
                               year_ids=json.dumps(year_ids),
                               spec=json.dumps(spec, ensure_ascii=False, indent=0),
                               ident=json.dumps(ident, ensure_ascii=False),
                               expected_period=rep["period"],
                               expected_year=rep["fiscal_year"])
        sets = gemini_extract(uri, prompt)
        for s in sets:
            # Trust the year->id map over whatever the model echoed.
            # For quarterly reports, also accept the report's own period.
            rid = year_ids.get(s.get("fiscal_year"))
            if not rid:
                # Try to find this year in the full rows list
                match = next((r for r in rows if r["fiscal_year"] == s.get("fiscal_year")
                              and r["period"] == s.get("period", rep["period"])), None)
                if match:
                    rid = match["id"]
                else:
                    print(f"    · skip {s.get('fiscal_year')} {s.get('period')}: no known report id"); continue
            s["report_id"] = rid
            # Ensure period is set correctly from the rep if not emitted by model
            if "period" not in s:
                s["period"] = rep["period"]
            all_sets.append(s)
        print(f"    → {len(sets)} set(s): " + ", ".join(f"{s['fiscal_year']}/{s.get('period')}/{s.get('unit_reported')}" for s in sets))
    if not all_sets:
        print(f"  ! {ticker}: nothing extracted"); return
    # Name includes period suffix when extracting quarters so files don't collide
    periods_in = set(s.get("period","") for s in all_sets)
    suffix = ""
    if periods_in and not (periods_in == {"ANNUAL"} or not periods_in):
        suffix = "_" + "_".join(sorted(p for p in periods_in if p != "ANNUAL"))
    out = OUTDIR / f"{ticker}{suffix}.gemini.json"
    out.write_text(json.dumps(all_sets, ensure_ascii=False, indent=2))
    print(f"  ✓ wrote {out}  ({len(all_sets)} sets) — review, then:\n"
          f"      python scripts/fundamentals_load.py {out.relative_to(ROOT)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ticker", nargs="?")
    ap.add_argument("--report", action="append", help="specific ISC report id(s)")
    ap.add_argument("--period", help="period filter when no --report given: ANNUAL, Q1, Q2, Q3, Q4")
    ap.add_argument("--all-pending", action="store_true", help="every not-yet-extracted ticker")
    args = ap.parse_args()
    if args.all_pending:
        for t in pending_tickers():
            print(f"=== {t} ===")
            try:
                extract_ticker(t)
            except SystemExit as e:
                print(f"  ! {t} failed: {e}")
    elif args.ticker:
        extract_ticker(args.ticker, args.report, args.period)
    else:
        ap.error("give a TICKER or --all-pending")


if __name__ == "__main__":
    main()
