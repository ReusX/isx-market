#!/usr/bin/env python3
"""ISC financial PDF extractor using Claude (Anthropic API).

Drop-in replacement for extract_gemini.py — same output format, same
fundamentals_load.py pipeline. Advantages over Gemini:
  • No file-upload step (PDF sent inline as base64) → faster
  • No JSON truncation on large PDFs (Claude outputs complete JSON)
  • Better accuracy on scanned Arabic text

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python scripts/extract_claude.py TZNI                  # latest annual
    python scripts/extract_claude.py TZNI --report 6709    # specific report
    python scripts/extract_claude.py HBAG --report 6236 --report 6379
    python scripts/extract_claude.py --all-missing         # all missing 2025A + 2026Q1
"""
from __future__ import annotations
import argparse, base64, json, os, sys, time
from pathlib import Path
import requests

import io
try:
    from pypdf import PdfReader, PdfWriter
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

ROOT   = Path(__file__).resolve().parent.parent
SCHEMA = json.loads((ROOT / "data" / "fundamentals-schema.json").read_text())
OUTDIR = ROOT / "scripts" / "data" / "fundamentals"
AKEY   = os.environ.get("ANTHROPIC_API_KEY")
MODEL  = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")


# ── Supabase ──────────────────────────────────────────────────────────────────
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
        sys.exit("Missing Supabase env.")
    if not url.startswith("http"):
        url = f"https://{url}.supabase.co"
    return url, key


SB_URL, SB_KEY = _env()
SB_H = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}


def all_reports(ticker):
    params = {"ticker": f"eq.{ticker}", "select": "id,pdf_url,fiscal_year,period,status",
              "order": "fiscal_year.desc,period.asc"}
    return requests.get(f"{SB_URL}/rest/v1/financial_reports", headers=SB_H,
                        params=params, timeout=60).json()


def reports_for(rows, report_ids=None, period_filter=None):
    if report_ids:
        ids = {int(x) for x in report_ids}
        return [r for r in rows if r["id"] in ids]
    if period_filter:
        matched = [r for r in rows if r["period"] == period_filter]
        return matched[:1]
    ann = [r for r in rows if r["period"] == "ANNUAL"]
    return ann[:1]


def build_year_ids(rows, target_report_ids=None):
    if target_report_ids:
        ids = {int(x) for x in target_report_ids}
        m = {}
        for r in rows:
            if r["period"] == "ANNUAL":
                m[r["fiscal_year"]] = r["id"]
        for r in rows:
            if r["id"] in ids and r["period"] != "ANNUAL":
                m[r["fiscal_year"]] = r["id"]
        return m
    return {r["fiscal_year"]: r["id"] for r in rows if r["period"] == "ANNUAL"}


def guess_template(ticker):
    comps = json.loads((ROOT / "public" / "data" / "companies.json").read_text())
    sec = next((c.get("sec") for c in comps if c.get("sym") == ticker), None)
    return "bank" if sec in ("BANK", "INS") else "industrial"


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


# Reuse same prompt as extract_gemini.py
PROMPT = """You extract financial statements from a scanned Arabic PDF filed with the Iraq Securities Commission (ISC). Output STRICT JSON only.

The company is {ticker}, template "{tpl}". This document covers period "{expected_period}" (fiscal year {expected_year}). Below is the canonical chart of accounts: each line has a fixed `key`, a professional Arabic display name, and `aliases` (wordings you may see in the PDF). Map the company's own line items onto these keys. It is fine to leave a key out if the statement doesn't have it.

CANONICAL LINES (by statement):
{spec}

ACCOUNTING IDENTITIES that must hold (use them to self-check; fix misreads):
{ident}

WHERE TO LOOK: use the audited PRIMARY statements — قائمة المركز المالي / الميزانية العامة (balance), قائمة الدخل / حساب الأرباح والخسائر (income), and قائمة التدفقات النقدية (cash flow) if present. Read EXACT figures to the dinar as printed — do NOT use rounded summary/narrative numbers. Most filings show TWO columns: current year and prior year — extract BOTH as separate sets.

CRITICAL DISTINCTIONS (do not confuse these):
- ودائع العملاء (customer deposits) → customer_deposits. ودائع المصارف / المؤسسات المصرفية (deposits FROM other banks) → due_to_banks. These are different lines; assign each value to its OWN key.
- For income: صافي إيرادات الفوائد/التمويل → financing_income; net_income = pretax_income - tax MUST hold.

UNITS: read the column header. IQD_MILLIONS / IQD_THOUSANDS / IQD. Put values EXACTLY as printed (do NOT scale). Wrong unit = off by 1000x.

KNOWN REPORT IDS by fiscal year (set "report_id" from this map):
{year_ids}

PERIOD RULES:
- ANNUAL report → "period": "ANNUAL"
- Quarterly: الربع الأول=Q1 (3mo), الربع الثاني=Q2 (6mo), الربع الثالث=Q3 (9mo), الربع الرابع=Q4
- Expected period for primary column: "{expected_period}"
- Comparative column gets same period of prior year.

OUTPUT — JSON array, one object per fiscal_year column:
[
  {{
    "ticker": "{ticker}", "template": "{tpl}",
    "fiscal_year": 2025, "period": "Q1",
    "report_id": <id from map>,
    "unit_reported": "IQD_THOUSANDS",
    "facts": {{
      "income":  {{ "<key>": {{"v": <number>, "label": "<PDF Arabic wording>", "page": <n>, "conf": 0.0-1.0}}, ... }},
      "balance": {{ ... }},
      "cashflow": {{ ... }},
      "metrics": {{ ... }}
    }}
  }}
]

Rules: "v" is a plain number (no commas; negative = minus sign). Emit one set per year. Return ONLY the JSON array."""


def truncate_pdf(pdf_bytes: bytes, max_pages: int = 90) -> bytes:
    """Return first max_pages of PDF — financial statements are always near the front."""
    if not HAS_PYPDF:
        return pdf_bytes
    reader = PdfReader(io.BytesIO(pdf_bytes))
    if len(reader.pages) <= max_pages:
        return pdf_bytes
    print(f"    PDF has {len(reader.pages)} pages — trimming to first {max_pages}", flush=True)
    writer = PdfWriter()
    for i in range(min(max_pages, len(reader.pages))):
        writer.add_page(reader.pages[i])
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# ── Claude API ────────────────────────────────────────────────────────────────
def claude_extract(pdf_bytes: bytes, prompt: str) -> list:
    if not AKEY:
        sys.exit("Set ANTHROPIC_API_KEY.")
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode()
    body = {
        "model": MODEL,
        "max_tokens": 8192,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "document",
                 "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64}},
                {"type": "text", "text": prompt}
            ]
        }]
    }
    for attempt in range(8):
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": AKEY, "anthropic-version": "2023-06-01",
                     "content-type": "application/json"},
            data=json.dumps(body), timeout=300)
        if r.status_code == 429:
            wait = min(30 * (2 ** attempt), 600)
            print(f"    rate-limited, retrying in {wait}s (attempt {attempt+1}/8)…")
            time.sleep(wait)
            continue
        if r.status_code == 529:
            wait = 30
            print(f"    overloaded, retrying in {wait}s…")
            time.sleep(wait)
            continue
        if r.status_code >= 300:
            sys.exit(f"Claude API error: {r.status_code} {r.text[:400]}")
        txt = r.json()["content"][0]["text"].strip()
        # strip markdown code fences if present
        if txt.startswith("```"):
            txt = txt.split("```")[1]
            if txt.startswith("json"):
                txt = txt[4:]
        return json.loads(txt)
    sys.exit("Claude API: exceeded retry limit")


# ── Main extraction logic ─────────────────────────────────────────────────────
def extract_ticker(ticker: str, report_ids=None, period_filter=None):
    tpl  = guess_template(ticker)
    rows = all_reports(ticker)
    reps = reports_for(rows, report_ids, period_filter)
    if not reps:
        print(f"  ! {ticker}: no matching reports"); return

    year_ids   = build_year_ids(rows, report_ids)
    spec, ident = template_spec(tpl)
    all_sets   = []

    for rep in reps:
        url = rep["pdf_url"]
        if not url:
            print(f"  ! {ticker} {rep['fiscal_year']} {rep['period']}: no pdf_url"); continue
        print(f"  · {ticker} {rep['fiscal_year']} {rep['period']} (id {rep['id']}) — downloading…", flush=True)
        pdf = requests.get(url, timeout=120).content
        print(f"    {len(pdf)//1024} KB — sending to Claude…", flush=True)
        pdf = truncate_pdf(pdf)

        prompt = PROMPT.format(
            ticker=ticker, tpl=tpl,
            year_ids=json.dumps(year_ids),
            spec=json.dumps(spec, ensure_ascii=False, indent=0),
            ident=json.dumps(ident, ensure_ascii=False),
            expected_period=rep["period"],
            expected_year=rep["fiscal_year"])

        sets = claude_extract(pdf, prompt)
        periods_str = ', '.join(str(s["fiscal_year"]) + '/' + s["period"] for s in sets)
        print(f"    → {len(sets)} set(s): {periods_str}", flush=True)

        for s in sets:
            rid = year_ids.get(s.get("fiscal_year"))
            if not rid:
                match = next((r for r in rows
                              if r["fiscal_year"] == s.get("fiscal_year")
                              and r["period"] == s.get("period", rep["period"])), None)
                if match:
                    rid = match["id"]
            if rid:
                s["report_id"] = rid
            all_sets.append(s)

    if not all_sets:
        print(f"  ! {ticker}: no sets extracted"); return

    # deduplicate by (fiscal_year, period)
    seen = {}
    for s in all_sets:
        k = (s.get("fiscal_year"), s.get("period"))
        seen[k] = s
    all_sets = list(seen.values())

    suffix = ""
    if report_ids and len(report_ids) > 1:
        suffix = "_batch"
    elif report_ids:
        suffix = f"_{rep['period']}"

    out = OUTDIR / f"{ticker}{suffix}.claude.json"
    out.write_text(json.dumps(all_sets, ensure_ascii=False, indent=1))
    print(f"  ✓ wrote {out}  ({len(all_sets)} sets) — load with:", flush=True)
    print(f"      python scripts/fundamentals_load.py {out}", flush=True)


def missing_tickers():
    """Companies that lack 2025 ANNUAL or 2026 Q1 — our TTM targets."""
    params = {"select": "ticker,fiscal_year,period,status",
              "status": "in.(published,reviewed)",
              "order": "ticker.asc"}
    rows = requests.get(f"{SB_URL}/rest/v1/financial_reports", headers=SB_H,
                        params=params, timeout=60).json()
    have = {}
    for r in rows:
        t = r["ticker"]
        if t not in have:
            have[t] = set()
        have[t].add((r["fiscal_year"], r["period"]))

    # Find tickers that have 2024 ANNUAL but are missing 2025 ANNUAL or 2026 Q1
    targets = []
    for t, periods in sorted(have.items()):
        has_2024a = (2024, "ANNUAL") in periods
        has_2025a = (2025, "ANNUAL") in periods
        has_2026q1 = (2026, "Q1") in periods
        if has_2024a and (not has_2025a or not has_2026q1):
            targets.append(t)
    return targets


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ticker", nargs="?")
    ap.add_argument("--report", action="append", help="specific ISC report id(s)")
    ap.add_argument("--period", help="ANNUAL, Q1, Q2, Q3, Q4")
    ap.add_argument("--all-missing", action="store_true",
                    help="extract 2025 ANNUAL + 2026 Q1 for all companies missing them")
    ap.add_argument("--model", default=MODEL,
                    help=f"Claude model (default: {MODEL})")
    args = ap.parse_args()

    if args.model != MODEL:
        os.environ["CLAUDE_MODEL"] = args.model

    if args.all_missing:
        tickers = missing_tickers()
        print(f"Missing TTM data for {len(tickers)} tickers: {tickers}")
        for t in tickers:
            print(f"\n── {t} ──")
            rows = all_reports(t)
            # find 2025 ANNUAL and 2026 Q1 report ids
            ids = []
            for r in rows:
                if (r["fiscal_year"] == 2025 and r["period"] == "ANNUAL" and r["pdf_url"]):
                    ids.append(str(r["id"]))
                if (r["fiscal_year"] == 2026 and r["period"] == "Q1" and r["pdf_url"]):
                    ids.append(str(r["id"]))
            if ids:
                extract_ticker(t, report_ids=ids)
            else:
                print(f"  ! {t}: no 2025 ANNUAL or 2026 Q1 PDFs on ISC yet")
    elif args.ticker:
        extract_ticker(args.ticker, args.report, args.period)
    else:
        ap.error("give a TICKER or --all-missing")


if __name__ == "__main__":
    main()
