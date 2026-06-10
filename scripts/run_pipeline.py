#!/usr/bin/env python3
"""Master runner: scrape → download → parse → load.

Usage:
  run_pipeline.py                                  # full backfill
  run_pipeline.py --start-date 2009-01 --end-date 2026-05
  run_pipeline.py --skip-scrape --skip-download    # re-parse/load local PDFs

Tracks processed PDFs in scripts/data/processed.json; already-processed files
are skipped. Errors are logged to scripts/data/errors.log and don't stop the
run.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
import traceback
from pathlib import Path

SCRIPTS = Path(__file__).parent
DATA = SCRIPTS / "data"
PDF_DIR = DATA / "pdfs"
PARSED_DIR = DATA / "parsed"
PROCESSED_FILE = DATA / "processed.json"
ERROR_LOG = DATA / "errors.log"

# Only the MAIN monthly report files are parsed (named strictly YYYY-MM.{ext}
# by download_pdfs.py; market-segment bulletins get a suffixed name).
# 2012-2018 mains are .xls workbooks; ~2019+ are .pdf.
MAIN_PDF_RE = re.compile(r"^(\d{4})-(\d{2})\.(pdf|xls|xlsx)$")


def log_error(context: str, exc: Exception | str) -> None:
    ERROR_LOG.parent.mkdir(parents=True, exist_ok=True)
    with ERROR_LOG.open("a") as f:
        f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {context}: {exc}\n")
        if isinstance(exc, Exception):
            f.write(traceback.format_exc() + "\n")


def run_step(name: str, argv: list[str]) -> bool:
    print(f"\n=== {name} ===")
    proc = subprocess.run([sys.executable, *argv], cwd=SCRIPTS)
    if proc.returncode != 0:
        log_error(name, f"exit code {proc.returncode}")
        print(f"{name} failed (exit {proc.returncode}) — see {ERROR_LOG}", file=sys.stderr)
        return False
    return True


DAILY_DIR = DATA / "daily"
DAILY_PARSED_DIR = DATA / "daily_parsed"


def run_daily(args, processed: dict[str, dict]) -> None:
    """Daily mode: scrape the daily list, download session workbooks named
    YYYY-MM-DD.{xls,xlsx}, parse, and load into daily_prices."""
    import requests
    from parse_daily_xlsx import parse_daily

    DAILY_DIR.mkdir(parents=True, exist_ok=True)
    DAILY_PARSED_DIR.mkdir(parents=True, exist_ok=True)

    if not args.skip_scrape:
        if not run_step("scrape-daily", ["scrape_daily_xlsx.py", "--days", str(args.days)]):
            sys.exit(1)

    reports = json.loads((DATA / "daily_reports.json").read_text())
    if not args.skip_download:
        session = requests.Session()
        from download_pdfs import download
        for rep in reports:
            d, m, y = rep["date"].split("/")
            dest = DAILY_DIR / f"{y}-{int(m):02d}-{int(d):02d}.{rep['ext']}"
            if dest.exists() and dest.stat().st_size > 0:
                continue
            download(session, rep["url"], dest)
            print(f"  downloaded {dest.name}")
            time.sleep(1.5)

    ok = skipped = failed = 0
    to_load: list[Path] = []
    for wb in sorted(DAILY_DIR.glob("*.xls*")):
        key = f"daily:{wb.name}"
        if processed.get(key, {}).get("status") == "ok":
            skipped += 1
            continue
        out = DAILY_PARSED_DIR / f"{wb.stem}.json"
        try:
            result = parse_daily(wb)
            out.write_text(json.dumps(result, ensure_ascii=False))
            if result["missing"]:
                log_error(wb.name, f"missing: {result['missing']}")
            processed[key] = {"status": "ok", "rows": len(result["rows"]),
                              "parsed_at": time.strftime("%Y-%m-%d %H:%M:%S")}
            to_load.append(out)
            ok += 1
            print(f"  parsed {wb.name}: rows={len(result['rows'])}")
        except Exception as e:
            failed += 1
            processed[key] = {"status": "error", "error": str(e)}
            log_error(wb.name, e)
            print(f"  ERROR parsing {wb.name}: {e}", file=sys.stderr)
        finally:
            PROCESSED_FILE.write_text(json.dumps(processed, ensure_ascii=False, indent=1))

    print(f"\ndaily parse summary: ok={ok} skipped={skipped} failed={failed}")
    if to_load and not args.skip_load:
        if not run_step("load", ["load_to_supabase.py", *[str(p) for p in to_load]]):
            sys.exit(1)
    elif not to_load:
        print("nothing new to load")
    print("\ndaily pipeline complete")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["monthly", "daily"], default="monthly",
                    help="monthly = PDF/XLS report flow; daily = per-session XLSX flow")
    ap.add_argument("--start-date", default="2009-01", help="YYYY-MM inclusive (monthly mode)")
    ap.add_argument("--end-date", default=time.strftime("%Y-%m"), help="YYYY-MM inclusive (monthly mode)")
    ap.add_argument("--days", type=int, default=30, help="daily mode: how far back to scrape")
    ap.add_argument("--skip-scrape", action="store_true")
    ap.add_argument("--skip-download", action="store_true")
    ap.add_argument("--skip-load", action="store_true", help="parse only, don't touch Supabase")
    args = ap.parse_args()

    DATA.mkdir(parents=True, exist_ok=True)
    PARSED_DIR.mkdir(parents=True, exist_ok=True)
    processed: dict[str, dict] = (
        json.loads(PROCESSED_FILE.read_text()) if PROCESSED_FILE.exists() else {}
    )

    if args.mode == "daily":
        run_daily(args, processed)
        return

    if not args.skip_scrape:
        if not run_step("scrape", ["scrape_isx_reports.py"]):
            sys.exit(1)
    if not args.skip_download:
        if not run_step("download", ["download_pdfs.py"]):
            sys.exit(1)

    # parse + load month by month
    from parse_monthly import parse_report  # same folder

    mains: dict[str, Path] = {}
    for p in sorted(PDF_DIR.iterdir()):
        if not MAIN_PDF_RE.match(p.name):
            continue
        # if a month has both formats, prefer the (richer) PDF
        if p.stem not in mains or p.suffix == ".pdf":
            mains[p.stem] = p
    in_range = [mains[k] for k in sorted(mains) if args.start_date <= k <= args.end_date]
    print(f"\n=== parse+load: {len(in_range)} main monthly PDFs in "
          f"{args.start_date}..{args.end_date} ===")

    ok = skipped = failed = 0
    to_load: list[Path] = []
    for pdf in in_range:
        if processed.get(pdf.name, {}).get("status") == "ok":
            skipped += 1
            continue
        out = PARSED_DIR / f"{pdf.stem}.json"
        try:
            result = parse_report(pdf)
            out.write_text(json.dumps(result, ensure_ascii=False))
            if result["missing"]:
                log_error(pdf.name, f"missing sections: {result['missing']}")
            processed[pdf.name] = {
                "status": "ok",
                "missing": result["missing"],
                "companies": len(result["companies"]),
                "parsed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
            to_load.append(out)
            ok += 1
            print(f"  parsed {pdf.name}: companies={len(result['companies'])} "
                  f"missing={result['missing'] or 'none'}")
        except Exception as e:
            failed += 1
            processed[pdf.name] = {"status": "error", "error": str(e)}
            log_error(pdf.name, e)
            print(f"  ERROR parsing {pdf.name}: {e}", file=sys.stderr)
        finally:
            PROCESSED_FILE.write_text(json.dumps(processed, ensure_ascii=False, indent=1))

    print(f"\nparse summary: ok={ok} skipped={skipped} failed={failed}")

    if to_load and not args.skip_load:
        if not run_step("load", ["load_to_supabase.py", *[str(p) for p in to_load]]):
            sys.exit(1)
    elif not to_load:
        print("nothing new to load")

    print("\npipeline complete")


if __name__ == "__main__":
    main()
