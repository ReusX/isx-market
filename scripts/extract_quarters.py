#!/usr/bin/env python3
"""Extract the 2026 interim (Q1/Q2/Q3) filings — free Gemini tier, keys rotated.

Why a separate script from extract_gemini.py
────────────────────────────────────────────
extract_gemini.py was written for ANNUAL reports and does two things that are
wrong for an interim filing:

  1. It asks for "Q2 = 6 months cumulative". The site stores the STANDALONE
     quarter — 26 of the 31 live Q2 2025 series are standalone — and
     lib/financials.ts shows every cell as filed, so a cumulative Q2 would sit
     beside standalone ones under the same «Q2» label.
  2. It extracts the comparative column too, and files it under the prior
     year's report id. For a Q2 2026 filing that rewrites Q2 2025 (and its
     balance column is usually the prior YEAR-END, not Q2) — the source of the
     double-extracted cells lib/financials.ts already has to work around.

So this one reads ONLY the filing's own period:
  · balance  — the column dated at the quarter's end, never the prior year-end
  · income   — the three-month column; if the filing prints only a cumulative
               (6/9-month) column, the income statement is DROPPED for that
               filing rather than stored under a label it doesn't match
  · cashflow — only when a three-month column exists (it rarely does)

Loads each report through fundamentals_load.py (identity + continuity checks;
failures stay status='failed'). It does NOT publish — that is a separate step
after review:  python scripts/fundamentals_load.py --publish TICKER

Resumable: only reports still 'pending' (or 'failed', for a retry) are taken,
and the loader moves each one on, so a re-run continues where it stopped.

Usage:
  python scripts/extract_quarters.py                  # every waiting 2026 interim
  python scripts/extract_quarters.py --only TASC,BNOI
  python scripts/extract_quarters.py --limit 5
"""
from __future__ import annotations
import argparse, json, os, subprocess, sys, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from extract_gemini import template_spec, guess_template  # noqa: E402  (reads .env.local)

OUT = ROOT / "scripts" / "data" / "fundamentals" / "quarters"
LOG = OUT / "_quarters.log"
YEAR = 2026
PERIODS = ("Q1", "Q2", "Q3")
QUARTER_END = {"Q1": "31/3", "Q2": "30/6", "Q3": "30/9"}
QUARTER_SPAN = {"Q1": "1/1 – 31/3", "Q2": "1/4 – 30/6", "Q3": "1/7 – 30/9"}

KEYS = [k.strip() for k in os.environ.get("GEMINI_API_KEYS", "").split(",") if k.strip()]
if not KEYS:
    sys.exit("GEMINI_API_KEYS missing from .env.local")
MODELS = ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-flash-latest"]
G = "https://generativelanguage.googleapis.com"

SB = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
if not SB.startswith("http"):
    SB = f"https://{SB}.supabase.co"
SK = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SBH = {"apikey": SK, "Authorization": f"Bearer {SK}", "User-Agent": "Mozilla/5.0"}


def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    with LOG.open("a") as f:
        f.write(line + "\n")


class Keys:
    """Rotate keys on quota; remember which model each key can call."""
    def __init__(self): self.i = 0; self.model = {}; self.dead = set()
    def current(self):
        for _ in range(len(KEYS)):
            k = KEYS[self.i % len(KEYS)]
            if k not in self.dead: return k
            self.i += 1
        return None
    def rotate(self, k): self.dead.add(k); self.i += 1


keys = Keys()


def upload(k, pdf, name):
    start = requests.post(f"{G}/upload/v1beta/files", headers={
        "x-goog-api-key": k, "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": str(len(pdf)), "X-Goog-Upload-Header-Content-Type": "application/pdf",
        "Content-Type": "application/json"}, data=json.dumps({"file": {"display_name": name}}), timeout=60)
    if start.status_code in (429, 503):
        return None
    up_url = start.headers.get("X-Goog-Upload-URL")
    if not up_url:
        raise RuntimeError(f"upload init {start.status_code}")
    up = requests.post(up_url, headers={"Content-Length": str(len(pdf)), "X-Goog-Upload-Offset": "0",
                                        "X-Goog-Upload-Command": "upload, finalize"}, data=pdf, timeout=300)
    f = up.json()["file"]; state = f.get("state")
    while state == "PROCESSING":
        time.sleep(2)
        state = requests.get(f"{G}/v1beta/{f['name']}", headers={"x-goog-api-key": k}, timeout=60).json().get("state")
    if state != "ACTIVE":
        raise RuntimeError(f"file state {state}")
    return f["uri"]


def generate(k, uri, prompt):
    body = {"contents": [{"parts": [{"file_data": {"mime_type": "application/pdf", "file_uri": uri}}, {"text": prompt}]}],
            "generationConfig": {"temperature": 0, "response_mime_type": "application/json"}}
    for m in ([keys.model[k]] if k in keys.model else MODELS):
        r = requests.post(f"{G}/v1beta/models/{m}:generateContent",
                          headers={"x-goog-api-key": k, "Content-Type": "application/json"}, data=json.dumps(body), timeout=300)
        if r.status_code == 404:
            continue
        if r.status_code in (429, 503):
            return "quota", m
        if r.status_code >= 300:
            raise RuntimeError(f"generate {m}: {r.status_code} {r.text[:200]}")
        keys.model[k] = m
        return json.loads(r.json()["candidates"][0]["content"]["parts"][0]["text"]), m
    raise RuntimeError("no callable model for this key")


PROMPT = """You extract financial statements from a scanned Arabic interim (quarterly) filing with the Iraq Securities Commission. Output STRICT JSON only.

Company {ticker}, template "{tpl}". This filing is the {period} {year} interim report (quarter ending {qend}/{year}).

EXTRACT ONLY THIS FILING'S OWN PERIOD. Every interim filing also prints comparative columns (the prior year's same quarter, and the prior year-end 31/12/{prev}). IGNORE ALL COMPARATIVE COLUMNS. Output exactly ONE set.

WHICH COLUMN, PER STATEMENT (critical):
- balance (قائمة المركز المالي / الميزانية): the column dated {qend}/{year}. NOT the 31/12/{prev} column.
- income (قائمة الدخل / حساب الأرباح والخسائر): the THREE-MONTH column for this quarter alone ({span}/{year}; wording like «للثلاثة أشهر المنتهية في» or «من ... ولغاية ...» covering only this quarter).
  · For Q1 the quarter and the year-to-date are the same column.
  · For Q2/Q3 many filings print BOTH a three-month column and a cumulative column (6 or 9 months, «للستة أشهر» / «للتسعة أشهر» / from 1/1). Use the THREE-MONTH one.
  · If the filing prints ONLY a cumulative column, still read it, and set "income_basis": "cumulative". Otherwise set "income_basis": "quarter".
- cashflow: include ONLY if a three-month column exists. Interim cash-flow statements are usually cumulative-only — in that case omit "cashflow" entirely.

CANONICAL LINES (map the company's own line items onto these keys; leave out keys the filing doesn't have):
{spec}

ACCOUNTING IDENTITIES that must hold (self-check; fix misreads):
{ident}

WHERE TO LOOK: the primary statements. Read EXACT figures as printed, never rounded narrative numbers.

INCOME STATEMENT — the two lines readers see first, so get them exactly right:
- revenue = the TOP revenue line, BEFORE anything is deducted: «إيراد النشاط الجاري» / «المبيعات» / «الإيرادات». NEVER a subtotal left after deducting a cost — «اجمالي ايراد النشاط» or «مجمل الربح» printed AFTER a cost of sales/service is NOT revenue.
- If the filing deducts a cost of sales/service right under revenue (e.g. «كلفة النشاط التجاري والخدمي»), put it in purchases_opex; a regulator's revenue share (e.g. «حصة هيئة الاعلام والاتصالات من الايراد») goes in taxes_fees.
- operating_income = the filing's OWN printed operating surplus line («فائض النشاط التجاري» / «فائض العمليات الجارية» / «الربح التشغيلي»). NEVER calculate it yourself.
- total_operating_expenses = revenue - operating_income (everything the filing deducts between those two lines, cost of sales and interest included when they sit between them), so the identity operating_income = revenue - total_operating_expenses holds with BOTH lines as printed.
- ودائع العملاء → customer_deposits; ودائع المصارف / المؤسسات المصرفية → due_to_banks (different lines).
- Banks: صافي إيرادات الفوائد/التمويل → financing_income; net commissions (+ FX gains + other operating income when FX is large) → revenue_and_commissions. net_income = pretax_income - tax must hold.

UNITS: read the column header — مليون دينار (IQD_MILLIONS), ألف دينار (IQD_THOUSANDS) or plain دينار (IQD). Values EXACTLY as printed in that unit; do not scale. Wrong unit = off by 1000x.

OUTPUT — one object, this exact shape:
{{
  "ticker": "{ticker}", "template": "{tpl}", "fiscal_year": {year}, "period": "{period}",
  "unit_reported": "IQD_THOUSANDS",
  "income_basis": "quarter",
  "balance_date": "{qend}/{year}",
  "income_column": "<the income column's own header wording, verbatim>",
  "facts": {{
    "income":   {{ "<key>": {{"v": <number>, "label": "<the filing's own Arabic wording>", "page": <pdf page>, "conf": 0.0-1.0}} }},
    "balance":  {{ ... }},
    "cashflow": {{ ... }}
  }}
}}
"v" is a plain number (no commas; negative = minus sign). Return ONLY the JSON object."""


def waiting(only=None):
    rows = requests.get(f"{SB}/rest/v1/financial_reports", headers=SBH, params={
        "select": "id,ticker,fiscal_year,period,status,pdf_url",
        "fiscal_year": f"eq.{YEAR}", "period": f"in.({','.join(PERIODS)})",
        "status": "in.(pending,failed)", "pdf_url": "not.is.null", "limit": "1000"}, timeout=60).json()
    if only:
        rows = [r for r in rows if r["ticker"] in only]
    # Biggest companies first: if the day's quota runs out, the names most
    # readers look at are the ones already updated.
    mcap = {c["sym"]: c.get("mcap") or 0 for c in json.loads((ROOT / "public" / "data" / "companies.json").read_text())}
    return sorted(rows, key=lambda r: (-mcap.get(r["ticker"], 0), r["ticker"], r["period"]))


def history(ticker):
    """The company's most recent earlier quarter with revenue/net income, for the swing check."""
    rows = requests.get(f"{SB}/rest/v1/financial_facts", headers=SBH, params={
        "select": "fiscal_year,period,line_key,value_iqd", "ticker": f"eq.{ticker}",
        "statement": "eq.income", "period": "in.(Q1,Q2,Q3)",
        "line_key": "in.(revenue,net_income,financing_income)", "limit": "500"}, timeout=60).json()
    by = {}
    for r in rows:
        by.setdefault((r["fiscal_year"], r["period"]), {})[r["line_key"]] = r["value_iqd"]
    return by


def swing(rep, s):
    """Why a new quarter needs a human look before publishing, or None.

    The identity checks prove a set is internally consistent, not that the
    right line was read: a model that takes a subtotal for revenue can make
    every identity hold. Comparing against the company's previous quarter
    catches exactly that — a 40% revenue swing in one quarter is rare, a
    misread line is not.
    """
    inc = (s.get("facts") or {}).get("income") or {}
    if not inc:
        return None
    mult = {"IQD": 1, "IQD_THOUSANDS": 1e3, "IQD_MILLIONS": 1e6}.get(s.get("unit_reported"), 1)
    val = lambda k: (inc.get(k) or {}).get("v") if isinstance(inc.get(k), dict) else inc.get(k)
    order = [(y, p) for y in (YEAR, YEAR - 1) for p in ("Q3", "Q2", "Q1")]
    prev_key = next((k for k in order[order.index((YEAR, rep["period"])) + 1:] if k in HIST.get(rep["ticker"], {})), None) \
        if (YEAR, rep["period"]) in order else None
    if not prev_key:
        return None
    prev = HIST[rep["ticker"]][prev_key]
    why = []
    for k in ("revenue", "financing_income"):
        v, pv = val(k), prev.get(k)
        if v and pv and pv > 0 and abs(v * mult / pv - 1) > 0.35:
            why.append(f"{k} {v * mult / 1e9:,.1f}B vs {pv / 1e9:,.1f}B in {prev_key[1]} {prev_key[0]}")
    v, pv = val("net_income"), prev.get("net_income")
    if v is not None and pv and ((v * mult) * pv < 0 or abs(v * mult / pv - 1) > 1.0):
        why.append(f"net_income {v * mult / 1e9:,.1f}B vs {pv / 1e9:,.1f}B in {prev_key[1]} {prev_key[0]}")
    return "; ".join(why) or None


def fix_signs(s):
    """Deductions are stored as positive amounts; filings print them in parentheses.

    Flip a negative tax or expense total only when the flipped value is the one
    that makes the filing's own printed subtotals tie — never blindly.
    """
    inc = (s.get("facts") or {}).get("income") or {}
    g = lambda k: inc[k]["v"] if isinstance(inc.get(k), dict) and isinstance(inc[k].get("v"), (int, float)) else None
    near = lambda a, b: a is not None and b is not None and abs(a - b) <= max(1.0, abs(b) * 0.01)
    tax, pre, net = g("tax"), g("pretax_income"), g("net_income")
    if tax is not None and tax < 0 and near(pre - (-tax), net):
        inc["tax"]["v"] = -tax
    toe, rev, op = g("total_operating_expenses"), g("revenue"), g("operating_income")
    if toe is not None and toe < 0 and near(rev - (-toe), op):
        inc["total_operating_expenses"]["v"] = -toe


HIST: dict = {}
REVIEW = OUT / "_review.json"


def extract(rep):
    pdf = requests.get(rep["pdf_url"], headers={"User-Agent": "Mozilla/5.0"}, timeout=120, allow_redirects=True).content
    if not pdf.startswith(b"%PDF"):
        raise RuntimeError("not a PDF")
    tpl = guess_template(rep["ticker"])
    spec, ident = template_spec(tpl)
    spec.pop("metrics", None)  # CAR/LCR/NSFR are disclosed annually; an interim guess is worse than none
    prompt = PROMPT.format(ticker=rep["ticker"], tpl=tpl, year=YEAR, prev=YEAR - 1, period=rep["period"],
                           qend=QUARTER_END[rep["period"]], span=QUARTER_SPAN[rep["period"]],
                           spec=json.dumps(spec, ensure_ascii=False, indent=0), ident=json.dumps(ident, ensure_ascii=False))
    strikes = {}
    while True:
        k = keys.current()
        if not k:
            raise SystemExit("all keys exhausted for today")
        uri = upload(k, pdf, f"{rep['ticker']}_{rep['id']}.pdf")
        out, m = (None, None) if uri is None else generate(k, uri, prompt)
        if uri is None or out == "quota":
            # On the free tier a 429 is usually the per-minute token window, not the day.
            strikes[k] = strikes.get(k, 0) + 1
            if strikes[k] <= 2:
                log(f"    key …{k[-4:]} rate-limited → waiting 70s"); time.sleep(70); continue
            log(f"    key …{k[-4:]} still limited → next key"); keys.rotate(k); continue
        return out, m, tpl


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated tickers")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--redo", help="comma-separated report ids to re-extract even if already reviewed")
    a = ap.parse_args()
    only = {t.strip().upper() for t in a.only.split(",")} if a.only else None
    todo = waiting(only)
    if a.redo:
        ids = ",".join(x.strip() for x in a.redo.split(","))
        todo = requests.get(f"{SB}/rest/v1/financial_reports", headers=SBH, params={
            "select": "id,ticker,fiscal_year,period,status,pdf_url", "id": f"in.({ids})"}, timeout=60).json()
    if a.limit:
        todo = todo[:a.limit]
    log(f"=== {len(todo)} interim report(s) to extract, {len(KEYS)} keys ===")
    stats = {"reviewed": 0, "failed": 0, "error": 0, "income_dropped": 0}
    for i, rep in enumerate(todo, 1):
        tag = f"[{i}/{len(todo)}] {rep['ticker']} {rep['period']} {YEAR} (id {rep['id']})"
        try:
            out, model, tpl = extract(rep)
        except SystemExit as e:
            log(f"{tag}: stopped — {e}"); break
        except Exception as e:  # one bad PDF never stops the run
            log(f"{tag}: ! {e}"); stats["error"] += 1; continue
        s = out[0] if isinstance(out, list) else out
        s.update({"ticker": rep["ticker"], "template": tpl, "fiscal_year": YEAR, "period": rep["period"], "report_id": rep["id"]})
        s.setdefault("facts", {})
        s["facts"].pop("metrics", None)
        if rep["period"] != "Q1" and s.get("income_basis") == "cumulative":
            s["facts"].pop("income", None)
            s["facts"].pop("cashflow", None)
            stats["income_dropped"] += 1
            log(f"{tag}: income is cumulative-only in this filing → kept balance sheet, dropped income")
        bal = (s.get("facts") or {}).get("balance") or {}
        if "total_assets" not in bal:
            # Nothing to check means nothing fails — an empty read would load as
            # 'reviewed'. Leave it pending so the next run tries again.
            log(f"{tag}: ! no balance-sheet total in the read — not loaded, will retry"); stats["error"] += 1; continue
        fix_signs(s)
        if rep["ticker"] not in HIST:
            HIST[rep["ticker"]] = history(rep["ticker"])
        flag = swing(rep, s)
        # A re-extraction replaces the report's facts outright: an upsert alone
        # would leave behind any line the earlier (wrong) read had and this one hasn't.
        if rep["status"] != "published":
            requests.delete(f"{SB}/rest/v1/financial_facts", headers=SBH, params={"report_id": f"eq.{rep['id']}"}, timeout=60)
        path = OUT / f"{rep['ticker']}_{YEAR}{rep['period']}.json"
        path.write_text(json.dumps([s], ensure_ascii=False, indent=2))
        p = subprocess.run([sys.executable, "scripts/fundamentals_load.py", str(path)], cwd=ROOT, capture_output=True, text=True)
        res = (p.stdout + p.stderr).strip().splitlines()
        summary = next((l for l in reversed(res) if "checks pass" in l or "facts" in l), res[-1] if res else "")
        status = "failed" if ("✗" in summary or "FAILED" in summary or p.returncode) else "reviewed"
        stats[status] += 1
        log(f"{tag}: {model} · {s.get('unit_reported')} · basis={s.get('income_basis')} → {summary.strip()}")
        review = json.loads(REVIEW.read_text()) if REVIEW.exists() else {}
        if flag:
            review[str(rep["id"])] = {"ticker": rep["ticker"], "period": rep["period"], "why": flag, "pdf": rep["pdf_url"]}
            log(f"    ⚠ REVIEW before publishing: {flag}")
        else:
            review.pop(str(rep["id"]), None)
        REVIEW.write_text(json.dumps(review, ensure_ascii=False, indent=2))
    log(f"=== done: {stats} ===")


if __name__ == "__main__":
    main()
