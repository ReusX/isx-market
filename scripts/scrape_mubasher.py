#!/usr/bin/env python3
"""Scrape ISX financial statements from Mubasher (english.mubasher.info).

Mubasher exposes per-ticker financial statements at a trivial ticker-based URL —
no slug discovery, no locked columns. Data is summary-level (aggregates only):
Total Assets, Total Equity, Net Income, and the four cash-flow lines.

URL:    https://english.mubasher.info/markets/ISX/stocks/{TICKER}/financial-statements
Period: a <select> (0=Q4, 1=Q1, 2=Q2, 3=Q3, 4=annual); columns are YEARS.
Units:  thousands of IQD  ->  unit_reported = "IQD_THOUSANDS"

We grab, per ticker:  2024 + 2025 annual, 2025 Q4, 2026 Q1 (when present),
and only emit a period that has a matching ISC report_id (from /tmp/mub_targets.json,
built from the financial_reports index).

Usage:
    python scripts/scrape_mubasher.py --all
    python scripts/scrape_mubasher.py IBSD BCOI
Output: scripts/data/fundamentals/{TICKER}_{YEAR}_{PERIOD}.mubasher.json
Then:   python scripts/fundamentals_load.py <file>   /   --publish <TICKER>
"""
from __future__ import annotations
import argparse, json, re, sys, time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

ROOT = Path(__file__).resolve().parent.parent
OUTDIR = ROOT / "scripts" / "data" / "fundamentals"
OUTDIR.mkdir(parents=True, exist_ok=True)
DRIVER_PATH = str(Path.home() / ".wdm/drivers/chromedriver/mac-arm64/149.0.7827.155/chromedriver-mac-arm64/chromedriver")
TARGETS = json.load(open("/tmp/mub_targets.json"))  # {ticker: {template, sec, reports:{"2024_ANNUAL":id,...}}}

# Mubasher period <select> value -> the period key + which years we want from its columns
PERIOD_PLAN = {
    "4": {"period": "ANNUAL", "years": [2024, 2025]},  # annual
    "0": {"period": "Q4",     "years": [2025]},          # Fourth Quarter
    "1": {"period": "Q1",     "years": [2026]},          # First Quarter
}

# Mubasher row label -> canonical key. Bank balance uses a different equity-and-liab key.
LABEL_MAP_COMMON = {
    "Total Assets": "total_assets",
    "Total Owners' Equity & Minority Interest Equity": "total_equity",
    "Net Income or Loss": "net_income",
    "Net Cash Flow from (Used In) Operating Activities": "cfo",
    "Net Cash Flow from (Used In) Investing Activities": "cfi",
    "Net Cash Flow from (Used In) Financing Activities": "cff",
    "Net Change In Cash & Cash Equivalents": "net_change_in_cash",
}
SECTION_OF = {
    "total_assets": "balance", "total_equity": "balance",
    "total_equity_and_liabilities": "balance", "total_liabilities_and_equity": "balance",
    "net_income": "income",
    "cfo": "cashflow", "cfi": "cashflow", "cff": "cashflow", "net_change_in_cash": "cashflow",
}


def make_driver() -> webdriver.Chrome:
    o = Options()
    o.add_argument("--headless=new"); o.add_argument("--no-sandbox")
    o.add_argument("--disable-dev-shm-usage"); o.add_argument("--disable-blink-features=AutomationControlled")
    o.add_experimental_option("excludeSwitches", ["enable-automation"]); o.add_experimental_option("useAutomationExtension", False)
    o.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36")
    d = webdriver.Chrome(service=Service(DRIVER_PATH), options=o)
    d.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument",
                      {"source": "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"})
    return d


def parse_num(tok: str):
    tok = tok.strip()
    if not tok or tok in ("-", "—", "N/A"):
        return None
    try:
        return float(tok.replace(",", ""))
    except ValueError:
        return None


def parse_table(text: str) -> tuple[list[int], dict[str, list]]:
    """Return (years, {canonical_label: [vals...]}). Generic over both templates."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    years: list[int] = []
    for l in lines:
        toks = l.split()
        if len(toks) >= 2 and all(re.fullmatch(r"(19|20)\d{2}", t) for t in toks):
            years = [int(t) for t in toks]
            break
    if not years:
        return [], {}
    n = len(years)
    rows: dict[str, list] = {}
    for l in lines:
        # value tokens are the last n whitespace-separated tokens IF they're all numeric/dash
        toks = l.split()
        if len(toks) <= n:
            continue
        tail = toks[-n:]
        if not all(re.fullmatch(r"-|—|N/A|-?[\d,]+\.?\d*", t) for t in tail):
            continue
        label = " ".join(toks[:-n])
        rows[label] = [parse_num(t) for t in tail]
    return years, rows


def read_table_for(driver, value: str) -> tuple[list[int], dict]:
    """Select a period <option> value, wait, read the statements table."""
    try:
        sel = Select(driver.find_element(By.TAG_NAME, "select"))
        sel.select_by_value(value)
    except Exception:
        return [], {}
    time.sleep(4)
    tables = driver.find_elements(By.TAG_NAME, "table")
    if not tables:
        return [], {}
    big = max(tables, key=lambda t: len(t.text))
    return parse_table(big.text)


def scrape_company(ticker: str, driver) -> list[dict]:
    cfg = TARGETS.get(ticker)
    if not cfg:
        print(f"  {ticker}: not in target map, skip"); return []
    template = cfg["template"]
    report_map = cfg["reports"]
    eq_liab_key = "total_liabilities_and_equity" if template == "bank" else "total_equity_and_liabilities"

    driver.get(f"https://english.mubasher.info/markets/ISX/stocks/{ticker}/financial-statements")
    time.sleep(6)
    if not driver.find_elements(By.TAG_NAME, "select"):
        print(f"  {ticker}: no financial-statements page/data, skip"); return []

    results = []
    for value, plan in PERIOD_PLAN.items():
        period = plan["period"]
        # only bother if at least one wanted year has a report_id
        wanted = [(y, f"{y}_{period}") for y in plan["years"] if f"{y}_{period}" in report_map]
        if not wanted:
            continue
        years, rows = read_table_for(driver, value)
        if not years:
            continue
        for year, period_key in wanted:
            if year not in years:
                print(f"  {ticker} {period_key}: column not on Mubasher, skip"); continue
            idx = years.index(year)

            def g(label):
                v = rows.get(label, [])
                return v[idx] if idx < len(v) else None

            income, balance, cashflow = {}, {}, {}
            for label, key in LABEL_MAP_COMMON.items():
                val = g(label)
                if val is None:
                    continue
                sec = SECTION_OF[key]
                {"income": income, "balance": balance, "cashflow": cashflow}[sec][key] = {"v": val}
            # equity-and-liabilities (template-specific key)
            tl_se = g("Total Liabilities & Shareholders' Equity")
            if tl_se is not None:
                balance[eq_liab_key] = {"v": tl_se}
            # banks: schema has no cashflow section -> drop it
            if template == "bank":
                cashflow = {}

            if not balance and not income:
                print(f"  {ticker} {period_key}: empty, skip"); continue

            results.append({
                "ticker": ticker, "template": template,
                "fiscal_year": year, "period": period,
                "report_id": report_map[period_key],
                "unit_reported": "IQD_THOUSANDS",
                "facts": {"income": income, "balance": balance, "cashflow": cashflow},
            })
            print(f"  {ticker} {period_key}: {len(income)} inc, {len(balance)} bal, {len(cashflow)} cf")
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tickers", nargs="*")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    tickers = sorted(TARGETS.keys()) if args.all else args.tickers
    if not tickers:
        ap.print_help(); sys.exit(1)

    driver = make_driver()
    written = 0
    try:
        for t in tickers:
            print(f"\n=== {t} ===")
            try:
                sets = scrape_company(t, driver)
            except Exception as e:
                print(f"  {t}: ERROR {e}"); continue
            for s in sets:
                out = OUTDIR / f"{s['ticker']}_{s['fiscal_year']}_{s['period']}.mubasher.json"
                out.write_text(json.dumps([s], ensure_ascii=False, indent=2))
                written += 1
    finally:
        driver.quit()
    print(f"\nDone. {written} files written to {OUTDIR}")


if __name__ == "__main__":
    main()
