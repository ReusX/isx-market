#!/usr/bin/env python3
"""Load extracted financial statement-sets → validate → compute ratios → DB.

Input: a JSON file holding a list of statement-sets, each:
{
  "ticker": "TASC", "template": "industrial",
  "fiscal_year": 2025, "period": "ANNUAL",
  "report_id": 6738,                      # the financial_reports.id this attaches to
  "unit_reported": "IQD_MILLIONS",        # IQD_MILLIONS | IQD_THOUSANDS | IQD
  "facts": {                               # statement -> line_key -> record
    "income":   {"revenue": {"v":2023617,"label":"ايراد النشاط الجاري","page":8,"conf":0.99}, ...},
    "balance":  {...}, "cashflow": {...}, "metrics": {...}
  }
}

Pipeline per set:
  1. normalize values to absolute IQD using unit_reported
  2. run the template's accounting identities (data/fundamentals-schema.json)
     → write pass/fail to financial_reports.checks
  3. upsert financial_facts (value_iqd + value_reported + provenance)
  4. set financial_reports.status: 'reviewed' if all checks pass else 'failed'
Then, once per ticker:
  5. compute financial_ratios across all loaded years (uses latest daily_prices
     close for trailing price ratios; shares derived from paid_capital, par=1)

Publishing (status -> 'published') is a separate explicit step (--publish) so a
human gates what goes live.

Env: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
Usage:
  ./.venv/bin/python scripts/fundamentals_load.py scripts/data/fundamentals/TASC.json
  ./.venv/bin/python scripts/fundamentals_load.py --publish TASC
"""
from __future__ import annotations
import argparse
import json
import os
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = json.loads((ROOT / "data" / "fundamentals-schema.json").read_text())

UNIT_MULT = {"IQD": 1, "IQD_THOUSANDS": 1_000, "IQD_MILLIONS": 1_000_000}


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
        sys.exit("Missing Supabase env")
    if not url.startswith("http"):
        url = f"https://{url}.supabase.co"
    return url, key


URL, KEY = _env()
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def rest(method, path, params="", body=None, prefer=None):
    headers = dict(H)
    if prefer:
        headers["Prefer"] = prefer
    r = requests.request(method, f"{URL}/rest/v1/{path}{params}", headers=headers,
                         data=json.dumps(body) if body is not None else None, timeout=60)
    if r.status_code >= 300:
        sys.exit(f"{method} {path} [{r.status_code}]: {r.text[:400]}")
    return r.json() if r.text and r.headers.get("content-type", "").startswith("application/json") else None


# ── identity checking ────────────────────────────────────────────────────────
def _val(facts, key):
    for stmt in facts.values():
        if key in stmt:
            return stmt[key]
    return None


def _eval_rhs(expr, getv):
    # tiny safe evaluator for "a + b - c" over line_keys
    import re
    tokens = re.findall(r"[a-z_]+|[-+]", expr)
    total, op = 0.0, "+"
    for t in tokens:
        if t in ("+", "-"):
            op = t
        else:
            v = getv(t)
            if v is None:
                return None
            total += v if op == "+" else -v
    return total


def run_identities(template, norm):
    """norm: {statement: {line_key: value_iqd}}; returns list of check dicts."""
    getv = lambda k: _val(norm, k)
    out = []
    for ident in SCHEMA["templates"][template].get("identities", []):
        lhs = getv(ident["lhs"])
        rhs = _eval_rhs(ident["rhs"], getv)
        if lhs is None or rhs is None:
            out.append({"name": ident["name"], "status": "skip", "lhs": lhs, "rhs": rhs})
            continue
        scale = max(abs(lhs), abs(rhs), 1.0)
        ok = abs(lhs - rhs) <= ident["tol"] * scale
        out.append({"name": ident["name"], "status": "pass" if ok else "FAIL",
                    "lhs": lhs, "rhs": rhs, "diff": lhs - rhs})
    return out


# ── load one statement-set ───────────────────────────────────────────────────
def load_set(s):
    template = s["template"]
    mult = UNIT_MULT[s["unit_reported"]]
    norm: dict[str, dict[str, float]] = {}
    fact_rows = []
    for stmt, lines in s["facts"].items():
        norm[stmt] = {}
        for line_key, rec in lines.items():
            raw = rec["v"]
            # metrics (ratios like %, x) are NOT scaled by unit
            is_metric = stmt == "metrics"
            v_iqd = raw if is_metric else (raw * mult if raw is not None else None)
            norm[stmt][line_key] = v_iqd
            fact_rows.append({
                "report_id": s["report_id"], "ticker": s["ticker"],
                "fiscal_year": s["fiscal_year"], "period": s["period"],
                "statement": stmt, "line_key": line_key,
                "value_iqd": v_iqd, "value_reported": raw,
                "unit_reported": "IQD" if is_metric else s["unit_reported"],
                "source_label_ar": rec.get("label"), "page": rec.get("page"),
                "confidence": rec.get("conf"),
            })
    checks = run_identities(template, norm)
    failed = [c for c in checks if c["status"] == "FAIL"]
    status = "failed" if failed else "reviewed"

    rest("POST", "financial_facts", "?on_conflict=report_id,statement,line_key",
         fact_rows, prefer="resolution=merge-duplicates,return=minimal")
    rest("PATCH", "financial_reports", f"?id=eq.{s['report_id']}",
         {"template": template, "unit_reported": s["unit_reported"],
          "status": status, "checks": checks, "extracted_at": "now()"},
         prefer="return=minimal")

    mark = "✓" if not failed else "✗"
    print(f"  {mark} {s['ticker']} {s['fiscal_year']} {s['period']}: "
          f"{len(fact_rows)} facts, {sum(c['status']=='pass' for c in checks)}/"
          f"{sum(c['status']!='skip' for c in checks)} checks pass"
          + (f"  FAILED: {[c['name'] for c in failed]}" if failed else ""))
    return norm, template, status


# ── ratios ───────────────────────────────────────────────────────────────────
def latest_close(ticker):
    rows = rest("GET", "daily_prices", f"?ticker=eq.{ticker}&select=close&order=date.desc&limit=1")
    return float(rows[0]["close"]) if rows else None


def pct(n, d):
    return (n / d) if (n is not None and d not in (None, 0)) else None


def compute_ratios(ticker, sets_norm, template):
    """sets_norm: {fiscal_year: {statement:{line_key:value_iqd}}} for one period type."""
    price = latest_close(ticker)
    years = sorted(sets_norm)
    rows = []
    for i, yr in enumerate(years):
        n = sets_norm[yr]
        g = lambda k: _val(n, k)
        prev = sets_norm[years[i - 1]] if i > 0 else None
        gp = (lambda k: _val(prev, k)) if prev else (lambda k: None)

        shares = g("paid_capital")  # par = 1 IQD on ISX
        equity = g("total_equity") or _eval_rhs("paid_capital + reserves + retained_earnings",
                                                lambda k: g(k) or 0)
        assets = g("total_assets")
        ni = g("net_income")
        is_latest = (yr == years[-1]) and price is not None
        mcap = price * shares if (is_latest and shares) else None

        r = {}
        eps = pct(ni, shares)
        bvps = pct(equity, shares)
        r["eps"] = eps
        r["bvps"] = bvps
        r["roe"] = pct(ni, equity)
        r["roa"] = pct(ni, assets)
        r["net_income_growth_yoy"] = pct(ni, gp("net_income")) and (ni / gp("net_income") - 1) if gp("net_income") else None

        if template == "industrial":
            rev = g("revenue")
            r["net_margin"] = pct(ni, rev)
            r["operating_margin"] = pct(g("operating_income"), rev)
            r["revenue_growth_yoy"] = (rev / gp("revenue") - 1) if (rev and gp("revenue")) else None
            stl = _eval_rhs("short_term_provisions + short_term_payables", lambda k: g(k) or 0)
            r["current_ratio"] = pct(g("total_current_assets"), stl)
            liabilities = (assets - equity) if (assets and equity) else None
            r["debt_to_equity"] = pct(liabilities, equity)
            r["debt_to_assets"] = pct(liabilities, assets)
            if is_latest:
                r["pe"] = pct(price, eps)
                r["pb"] = pct(price, bvps)
                r["ps"] = pct(mcap, rev)
                div = g("dividends_paid")
                r["dividend_yield"] = pct(abs(div) if div else None, mcap)
        elif template == "bank":
            income = _eval_rhs("financing_income + revenue_and_commissions", lambda k: g(k) or 0)
            r["net_margin"] = pct(ni, income)
            dep = g("customer_deposits")
            r["loan_to_deposit"] = pct(g("islamic_financing"), dep)
            r["deposit_growth_yoy"] = (dep / gp("customer_deposits") - 1) if (dep and gp("customer_deposits")) else None
            # reported as a percent (e.g. 200) but ratios are stored as fractions
            # (the UI's % formatter multiplies by 100), so divide here.
            for m in ("capital_adequacy_ratio", "npl_ratio"):
                if g(m) is not None:
                    r[m] = g(m) / 100
            if is_latest:
                r["pe"] = pct(price, eps)
                r["pb"] = pct(price, bvps)

        # ── sanity flags: plausible-but-unchecked-by-identities red flags that a
        # human should eyeball before publishing (cheap guard for auto-extraction).
        warn = []
        if r.get("loan_to_deposit") and r["loan_to_deposit"] > 2.0:
            warn.append(f"loan/deposit {r['loan_to_deposit']:.0%} (>200% — customer_deposits likely misread/swapped)")
        if template == "bank" and g("due_to_banks") and g("customer_deposits") and g("due_to_banks") > g("customer_deposits"):
            warn.append("due_to_banks > customer_deposits (verify the two deposit lines aren't swapped)")
        if r.get("net_margin") and abs(r["net_margin"]) > 1.2:
            warn.append(f"net_margin {r['net_margin']:.0%} (>120% — income base may be incomplete)")
        if r.get("roe") and abs(r["roe"]) > 1.0:
            warn.append(f"ROE {r['roe']:.0%} (>100% — check equity)")
        for w in warn:
            print(f"  ⚠ {ticker} {yr}: {w}")

        for k, v in r.items():
            if v is None:
                continue
            rows.append({"ticker": ticker, "fiscal_year": yr, "period": "ANNUAL",
                         "ratio_key": k, "value": round(float(v), 6),
                         "inputs": {"price_used": price if k in ("pe", "pb", "ps", "dividend_yield") else None}})
    if rows:
        rest("POST", "financial_ratios", "?on_conflict=ticker,fiscal_year,period,ratio_key",
             rows, prefer="resolution=merge-duplicates,return=minimal")
    print(f"  computed {len(rows)} ratio values across {len(years)} years (price={price})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", nargs="?", help="statement-set JSON file")
    ap.add_argument("--publish", metavar="TICKER", help="flip reviewed→published for a ticker")
    args = ap.parse_args()

    if args.publish:
        rest("PATCH", "financial_reports",
             f"?ticker=eq.{args.publish}&status=eq.reviewed",
             {"status": "published", "published_at": "now()"}, prefer="return=minimal")
        print(f"Published all reviewed reports for {args.publish}.")
        return

    sets = json.loads(Path(args.input).read_text())
    if isinstance(sets, dict):
        sets = [sets]
    by_ticker_tpl: dict[tuple, dict] = {}
    for s in sets:
        norm, template, _ = load_set(s)
        # ratios are annual-only; quarterly sets are loaded as facts but never
        # fed to the (annual) ratio engine — mixing periods would corrupt them.
        if s["period"] == "ANNUAL":
            by_ticker_tpl.setdefault((s["ticker"], template), {})[s["fiscal_year"]] = norm
    for (ticker, template), sets_norm in by_ticker_tpl.items():
        compute_ratios(ticker, sets_norm, template)


if __name__ == "__main__":
    main()
