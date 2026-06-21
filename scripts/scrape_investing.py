#!/usr/bin/env python3
"""Scrape quarterly financial statements from investing.com using Selenium.

Maps investing.com fields → canonical schema for fundamentals_load.py.

Usage:
    python scripts/scrape_investing.py IBSD
    python scripts/scrape_investing.py IBSD BBOB BNOI   # multiple
    python scripts/scrape_investing.py --all             # all configured tickers

Output: scripts/data/fundamentals/{TICKER}_Q1.investing.json etc.
Then load with:
    python scripts/fundamentals_load.py scripts/data/fundamentals/IBSD_Q1.investing.json
    python scripts/fundamentals_load.py --publish IBSD
"""
from __future__ import annotations
import argparse, json, re, sys, time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

ROOT = Path(__file__).resolve().parent.parent
OUTDIR = ROOT / "scripts" / "data" / "fundamentals"
OUTDIR.mkdir(parents=True, exist_ok=True)

DRIVER_PATH = str(Path.home() / ".wdm/drivers/chromedriver/mac-arm64/149.0.7827.155/chromedriver-mac-arm64/chromedriver")

# investing.com slug + template + report_ids per quarter/period
# report_ids from ISC (financial_reports table); None = investing.com only
COMPANY_CONFIG = {
    "AISP": {
        "slug": "iraqi-for-seed-production",
        "template": "industrial",
        "reports": {"2025_Q1": 6344, "2025_Q2": 6444, "2025_Q3": 6590},
    },
    "BBOB": {
        "slug": "bank-of-baghdad-pjsc",
        "template": "bank",
        "reports": {"2025_Q1": 6139, "2025_Q2": 6304, "2025_Q3": 6457, "2025_Q4": 6630},
    },
    "BCIH": {
        "slug": "cihan-bank-for-islamic-investment",
        "template": "bank",
        "reports": {"2025_Q1": 6153, "2025_Q2": 6247, "2025_Q3": 6402, "2025_Q4": 6539},
    },
    "BIIB": {
        "slug": "iraqi-islamic-bank-for-investment",
        "template": "bank",
        "reports": {"2025_Q1": 6114, "2025_Q2": 6300, "2025_Q3": 6487, "2026_Q1": 6695},
    },
    "BJAB": {
        "slug": "al-janoob-islamic-bank-for",
        "template": "bank",
        "reports": {"2025_Q1": 6140, "2025_Q2": 6301, "2025_Q3": 6474},
    },
    "BMNS": {
        "slug": "mansour-investment-bank-co-psc",
        "template": "bank",
        "reports": {"2025_Q1": 6099, "2025_Q2": 6256, "2025_Q3": 6396},
    },
    "BNAI": {
        "slug": "national-islamic-bank-psc",
        "template": "bank",
        "reports": {"2025_Q1": 6233, "2025_Q2": 6354, "2025_Q3": 6493},
    },
    "BNOI": {
        "slug": "national-bank-of-iraq-sa",
        "template": "bank",
        "reports": {"2025_Q1": 6150, "2025_Q2": 6275, "2025_Q3": 6447},
    },
    "HBAY": {
        "slug": "babylon-hotel",
        "template": "industrial",
        "reports": {"2025_Q1": 6096, "2025_Q2": 6242, "2025_Q3": 6382, "2025_Q4": 6547, "2026_Q1": 6634},
    },
    "IBSD": {
        "slug": "baghdad-soft-drinks-co",
        "template": "industrial",
        "reports": {"2025_Q1": 6088, "2025_Q2": 6243, "2025_Q3": 6390},
    },
    "IMAP": {
        "slug": "al-mansour-pharmaceuticals",
        "template": "industrial",
        "reports": {
            "2024_ANNUAL": 6110,
            "2025_Q1": 6154, "2025_Q2": 6238, "2025_Q3": 6387, "2025_Q4": 6540,
            "2026_Q1": 6636,
        },
    },
    "SMRI": {
        "slug": "al-mamoura-company-for-real-estate",
        "template": "industrial",
        "reports": {"2025_Q1": 6081, "2025_Q2": 6245, "2025_Q3": 6386},
    },
    "TZNI": {
        "slug": "al-khatem-telecommunications-co",
        "template": "industrial",
        "reports": {"2025_Q1": 6160, "2025_Q2": 6320, "2025_Q3": 6464, "2026_Q1": 6778},
    },
    # --- Additional companies discovered via slug testing ---
    "AIRP": {
        "slug": "iraqi-agricultural-products",
        "template": "industrial",
        "reports": {"2025_Q1": 6207, "2025_Q2": 6333, "2025_Q3": 6496, "2026_Q1": 6747},
    },
    "BAIB": {
        "slug": "asia-al-iraq-islamic-bank",
        "template": "bank",
        "reports": {"2025_Q1": 6169, "2025_Q2": 6322, "2025_Q3": 6394, "2025_Q4": 6566, "2026_Q1": 6714},
    },
    "BBAY": {
        "slug": "babylon-bank",
        "template": "bank",
        "reports": {"2024_Q1": 5652},  # last filed; no 2025 records in ISC index
    },
    "BCOI": {
        "slug": "commercial-bank-of-iraq-psc",
        "template": "bank",
        "reports": {"2025_Q1": 6200, "2025_Q2": 6323, "2025_Q3": 6473, "2025_Q4": 6598, "2026_Q1": 6732},
    },
    "BIBI": {
        "slug": "investment-bank-of-iraq-psc",
        "template": "bank",
        "reports": {"2025_Q1": 6137, "2025_Q2": 6325, "2025_Q3": 6482, "2026_Q1": 6760},
    },
    "BIME": {
        "slug": "iraqi-middle-east-investment-bank",
        "template": "bank",
        "reports": {"2025_Q1": 6121, "2025_Q2": 6353, "2025_Q3": 6475, "2025_Q4": 6595, "2026_Q1": 6757},
    },
    "BTRI": {
        "slug": "trans-iraq-bank-for-investment",
        "template": "bank",
        "reports": {"2025_Q1": 6206, "2025_Q2": 6366, "2025_Q3": 6471, "2026_Q1": 6708},
    },
    "BUOI": {
        "slug": "union-bank-of-iraq-psc",
        "template": "bank",
        "reports": {"2025_Q1": 6132, "2025_Q2": 6294, "2025_Q3": 6415, "2025_Q4": 6585, "2026_Q1": 6705},
    },
    "HBAG": {
        "slug": "baghdad-hotel",
        "template": "industrial",
        "reports": {"2025_Q1": 6077, "2025_Q2": 6236, "2025_Q3": 6379, "2025_Q4": 6554, "2026_Q1": 6651},
    },
    "HMAN": {
        "slug": "mansour-hotel",
        "template": "industrial",
        "reports": {"2025_Q1": 6145, "2025_Q2": 6336, "2025_Q3": 6463, "2026_Q1": 6709},
    },
    "IBPM": {
        "slug": "baghdad-for-packing-materials",
        "template": "industrial",
        "reports": {"2025_Q1": 6083, "2025_Q2": 6235, "2025_Q3": 6375, "2025_Q4": 6545, "2026_Q1": 6649},
    },
    "IIEW": {
        "slug": "iraqi-engineering-works-company",
        "template": "industrial",
        "reports": {"2025_Q1": 6079, "2025_Q2": 6230, "2025_Q3": 6371, "2025_Q4": 6522, "2026_Q1": 6617},
    },
    "IITC": {
        "slug": "iraqi-company-for-tufted-carpets",
        "template": "industrial",
        "reports": {"2025_Q1": 6075, "2025_Q2": 6229, "2025_Q3": 6369, "2025_Q4": 6521, "2026_Q1": 6718},
    },
    # --- Round 2: slugs recovered via slugify(name)[:35] truncation rule ---
    "BINI": {
        "slug": "iraq-noor-islamic-bank-for",
        "template": "bank",
        "reports": {"2025_Q1": 6168, "2025_Q2": 6298, "2025_Q3": 6460, "2026_Q1": 6696},
    },
    "BKUI": {
        "slug": "kurdistan-international-bank-for-in",
        "template": "bank",
        "reports": {"2025_Q1": 6280, "2025_Q2": 6334, "2025_Q3": 6480, "2025_Q4": 6693, "2026_Q1": 6741},
    },
    "BROI": {
        "slug": "credit-bank-of-iraq-sa",
        "template": "bank",
        "reports": {"2025_Q1": 6119, "2025_Q2": 6278, "2025_Q3": 6397, "2026_Q1": 6688},
    },
    "BZII": {
        "slug": "zain-iraq-islamic-bank-for",
        "template": "bank",
        "reports": {"2025_Q1": 6389, "2025_Q2": 6363, "2025_Q3": 6443, "2025_Q4": 6584, "2026_Q1": 6742},
    },
    "IIDP": {
        "slug": "iraqi-dates-processing-and-marking",
        "template": "industrial",
        "reports": {"2025_Q1": 6328, "2025_Q2": 6329, "2025_Q3": 6330, "2026_Q1": 6580, "2026_Q2": 6607},
    },
    "SBPT": {
        "slug": "baghdad-iraq-for-public-transport",
        "template": "industrial",
        "reports": {"2025_Q1": 6188, "2025_Q2": 6299, "2025_Q3": 6421, "2026_Q1": 6658},
    },
    "SILT": {
        "slug": "iraqi-company-for-land-transport",
        "template": "industrial",
        "reports": {},  # no SILT records in ISC financial_reports index — scrape only, can't load
    },
    # Pages exist but no income-statement data found despite valid slug: IICM (iraqi-company-for-manufacture-of-ca)
    # Not on investing.com at all (no equities page): AIPM, SIGT
    # No financial data despite having pages: BCIH, BJAB, BNAI
    # Not on investing.com at all: BAAI, BIDB, BRTB, BWOR
}

# Investing.com quarterly date → ISX period mapping
# investing.com shows period-ending date; map to ISX period key
def date_to_period(year_str: str, date_str: str) -> str | None:
    """Map investing.com col header (year='2025', date='31/03') to ISX period.
    Date format is DD/MM (e.g. '31/03' = March 31).
    """
    month_end = date_str.split("/")[1] if "/" in date_str else date_str[3:5]
    month = int(month_end)
    year = int(year_str)
    if month == 3:   return f"{year}_Q1"
    if month == 6:   return f"{year}_Q2"
    if month == 9:   return f"{year}_Q3"
    if month == 12:  return f"{year}_Q4"
    return None


def parse_num(s: str) -> float | None:
    """Parse a number from investing.com cell text. Returns None for locked/missing."""
    s = s.strip()
    if not s or s in ("-", "aa.aa", "N/A", "—"):
        return None
    # Remove commas and parse
    s = s.replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def parse_table(body_text: str) -> tuple[list[str], dict[str, list]]:
    """Parse a financial statement page text into headers and row data.

    Returns (period_keys, {row_label: [val_or_None, ...]})

    Investing.com quirk: locked values appear one-per-line as "aa.aa",
    but available (unlocked) values for the same row are all on ONE line
    space-separated, e.g. "187,414.19 218,585.53 255,999.35 294,695.47 212,600.07".
    """
    lines = [l.strip() for l in body_text.split("\n") if l.strip()]

    # Find header: alternating year / DD/MM date lines
    header_start = None
    for i, line in enumerate(lines):
        if re.match(r"^\d{4}$", line) and i + 1 < len(lines) and re.match(r"^\d{2}/\d{2}$", lines[i + 1]):
            header_start = i
            break

    if header_start is None:
        return [], {}

    col_years, col_dates = [], []
    i = header_start
    while i < len(lines):
        if re.match(r"^\d{4}$", lines[i]) and i + 1 < len(lines) and re.match(r"^\d{2}/\d{2}$", lines[i + 1]):
            col_years.append(lines[i])
            col_dates.append(lines[i + 1])
            i += 2
        else:
            break

    n_cols = len(col_years)
    period_keys = [date_to_period(y, d) for y, d in zip(col_years, col_dates)]

    def classify_line(line: str):
        """Return ('locked'|'multi'|'single'|'pct'|'label', parsed_values_or_None)"""
        # Single locked placeholder
        if line == "aa.aa":
            return "locked", [None]
        # Single dash = not available
        if line == "-":
            return "single", [None]
        # All-percentage line (e.g. growth rates)
        parts = line.split()
        if parts and all(re.match(r"^[+-]?\d+\.?\d*%$", p) for p in parts):
            return "pct", None
        # Try to parse all parts as numbers (handles space-separated multi-value line)
        parsed = []
        for p in parts:
            p_clean = p.replace(",", "")
            if p_clean in ("-", "—"):
                parsed.append(None)
            else:
                try:
                    parsed.append(float(p_clean))
                except ValueError:
                    return "label", None
        if parsed:
            return ("multi" if len(parsed) > 1 else "single"), parsed
        return "label", None

    rows: dict[str, list] = {}
    label = None
    values: list = []

    i_line = i
    while i_line < len(lines):
        line = lines[i_line]
        kind, parsed = classify_line(line)

        if kind == "label":
            if label and values:
                while len(values) < n_cols:
                    values.append(None)
                rows[label] = values[:n_cols]
                values = []
            label = line

        elif kind == "pct":
            pass  # skip growth rows

        elif kind in ("locked", "single") and label:
            values.extend(parsed)
            if len(values) >= n_cols:
                rows[label] = values[:n_cols]
                values = []
                label = None

        elif kind == "multi" and label:
            # All remaining unlocked values for this row on one line
            locked_count = len(values)
            remaining = n_cols - locked_count
            chunk = (parsed + [None] * n_cols)[:remaining]
            values.extend(chunk)
            rows[label] = values[:n_cols]
            values = []
            label = None

        i_line += 1

    if label and values:
        while len(values) < n_cols:
            values.append(None)
        rows[label] = values[:n_cols]

    return period_keys, rows


def extract_income(rows: dict, period_idx: int, template: str) -> dict:
    """Extract income statement fields for one period."""
    def g(key: str) -> float | None:
        vals = rows.get(key, [])
        if period_idx < len(vals):
            return vals[period_idx]
        return None

    if template == "bank":
        return {
            "financing_income": {"v": g("Net Interest Income")},
            "revenue_and_commissions": {"v": g("Total Non-Interest Income")},
            "pretax_income": {"v": g("EBT, Incl. Unusual Items") or g("Pre-Tax Income")},
            "net_income": {"v": g("Net Income")},
        }
    else:  # industrial
        return {
            "revenue": {"v": g("Total Revenues")},
            "goods_supplies": {"v": g("Cost Of Revenues")},
            "other_expenses": {"v": g("Other Operating Expenses, Total")},
            "pretax_income": {"v": g("EBT, Incl. Unusual Items") or g("Pre-Tax Income")},
            "net_income": {"v": g("Net Income") or g("EBT, Incl. Unusual Items")},
        }


def extract_balance(rows: dict, period_idx: int, template: str) -> dict:
    def g(key: str) -> float | None:
        vals = rows.get(key, [])
        if period_idx < len(vals):
            return vals[period_idx]
        return None

    if template == "bank":
        return {
            "cash": {"v": g("Cash And Equivalents")},
            "total_assets": {"v": g("Total Assets")},
            "paid_capital": {"v": g("Common Stock, Total") or g("Common Stock")},
            "total_equity": {"v": g("Total Equity")},
            "total_equity_and_liabilities": {"v": g("Total Liabilities And Equity") or g("Total Assets")},
        }
    else:
        return {
            "cash": {"v": g("Cash And Equivalents")},
            "inventory": {"v": g("Inventory")},
            "receivables": {"v": g("Total Receivables")},
            "total_current_assets": {"v": g("Total Current Assets")},
            "net_fixed_assets": {"v": g("Net Property Plant And Equipment")},
            "investments": {"v": g("Long-term Investments") or g("Short Term Investments")},
            "total_assets": {"v": g("Total Assets")},
            "paid_capital": {"v": g("Common Stock, Total") or g("Common Stock")},
            "total_equity": {"v": g("Total Equity")},
            "short_term_payables": {"v": g("Accounts Payable, Total") or g("Accounts Payable")},
            "total_equity_and_liabilities": {"v": g("Total Liabilities And Equity") or g("Total Assets")},
        }


def extract_cashflow(rows: dict, cf_net_income_rows: dict, period_idx: int) -> dict:
    def g(key: str, src: dict = rows) -> float | None:
        vals = src.get(key, [])
        if period_idx < len(vals):
            return vals[period_idx]
        return None

    cfo = g("Cash from Operations")
    cfi = g("Cash from Investing")
    cff = g("Cash from Financing")
    capex_raw = g("Capital Expenditure")

    return {
        "cfo": {"v": cfo},
        "capex": {"v": abs(capex_raw) if capex_raw is not None else None},
        "cfi": {"v": cfi},
        "cff": {"v": cff},
        "net_change_in_cash": {"v": g("Net Change in Cash") or g("Net Cash Change")},
    }


def make_driver() -> webdriver.Chrome:
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_argument(
        "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
    )
    driver = webdriver.Chrome(service=Service(DRIVER_PATH), options=opts)
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"},
    )
    return driver


def fetch_page(driver: webdriver.Chrome, url: str, quarterly: bool = True) -> str:
    driver.get(url)
    time.sleep(6)
    if quarterly:
        try:
            btn = driver.find_element(By.XPATH, "//button[text()='Quarterly']")
            btn.click()
            time.sleep(4)
        except Exception:
            pass
    return driver.find_element(By.TAG_NAME, "body").text


def scrape_company(ticker: str, driver: webdriver.Chrome | None = None) -> list[dict]:
    """Scrape all available quarterly periods for a company. Returns list of statement-sets."""
    cfg = COMPANY_CONFIG.get(ticker)
    if not cfg:
        print(f"  {ticker}: not in config, skip")
        return []

    slug = cfg["slug"]
    template = cfg["template"]
    report_map = cfg["reports"]
    base = f"https://www.investing.com/equities/{slug}"

    owns_driver = driver is None
    if owns_driver:
        driver = make_driver()

    try:
        print(f"  Fetching income statement...")
        income_text = fetch_page(driver, f"{base}-income-statement")
        print(f"  Fetching balance sheet...")
        balance_text = fetch_page(driver, f"{base}-balance-sheet")
        print(f"  Fetching cash flow...")
        cf_text = fetch_page(driver, f"{base}-cash-flow")
    except Exception as e:
        print(f"  ERROR fetching pages for {ticker}: {e}")
        if owns_driver:
            driver.quit()
        return []

    # Check we actually got financial data
    if "Total Revenues" not in income_text and "Net Interest Income" not in income_text and "Cash from Operations" not in cf_text:
        print(f"  {ticker}: page loaded but no financial data found (404 or blocked)")
        if owns_driver:
            driver.quit()
        return []

    inc_periods, inc_rows = parse_table(income_text)
    bal_periods, bal_rows = parse_table(balance_text)
    cf_periods, cf_rows = parse_table(cf_text)

    print(f"  Income periods: {inc_periods}")
    print(f"  Balance periods: {bal_periods}")
    print(f"  CashFlow periods: {cf_periods}")

    results = []
    for period_key, report_id in report_map.items():
        # Find column index for this period in each statement
        inc_idx = inc_periods.index(period_key) if period_key in inc_periods else None
        bal_idx = bal_periods.index(period_key) if period_key in bal_periods else None
        cf_idx = cf_periods.index(period_key) if period_key in cf_periods else None

        if inc_idx is None and bal_idx is None:
            print(f"  {ticker} {period_key}: not available on investing.com, skip")
            continue

        year, period = period_key.split("_", 1)

        income = extract_income(inc_rows, inc_idx, template) if inc_idx is not None else {}
        balance = extract_balance(bal_rows, bal_idx, template) if bal_idx is not None else {}
        cashflow = extract_cashflow(cf_rows, {}, cf_idx) if cf_idx is not None else {}

        # Remove None-valued keys to keep JSON clean
        income = {k: v for k, v in income.items() if v.get("v") is not None}
        balance = {k: v for k, v in balance.items() if v.get("v") is not None}
        cashflow = {k: v for k, v in cashflow.items() if v.get("v") is not None}

        # Skip if almost no data
        if len(income) < 2 and len(balance) < 2:
            print(f"  {ticker} {period_key}: too little data, skip")
            continue

        entry = {
            "ticker": ticker,
            "template": template,
            "fiscal_year": int(year),
            "period": period,
            "report_id": report_id,
            "unit_reported": "IQD_MILLIONS",  # investing.com always in millions IQD
            "facts": {
                "income": income,
                "balance": balance,
                "cashflow": cashflow,
            },
        }
        results.append(entry)
        print(f"  {ticker} {period_key}: {len(income)} income, {len(balance)} balance, {len(cashflow)} cf fields")

    if owns_driver:
        driver.quit()

    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("tickers", nargs="*", help="Ticker(s) to scrape")
    parser.add_argument("--all", action="store_true", help="Scrape all configured tickers")
    args = parser.parse_args()

    tickers = list(COMPANY_CONFIG.keys()) if args.all else args.tickers
    if not tickers:
        parser.print_help()
        sys.exit(1)

    driver = make_driver()
    try:
        for ticker in tickers:
            print(f"\n=== {ticker} ===")
            sets = scrape_company(ticker, driver)
            if not sets:
                print(f"  {ticker}: no data extracted")
                continue

            # Group by ticker (one file per period)
            by_period: dict[str, list] = {}
            for s in sets:
                key = f"{s['fiscal_year']}_{s['period']}"
                by_period.setdefault(key, []).append(s)

            for period_key, items in by_period.items():
                out = OUTDIR / f"{ticker}_{period_key}.investing.json"
                out.write_text(json.dumps(items, ensure_ascii=False, indent=2))
                print(f"  Written: {out.name}")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
