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

# Only the MAIN monthly report files are parsed (named strictly YYYY-MM.pdf by
# download_pdfs.py; market-segment bulletins get a suffixed name).
MAIN_PDF_RE = re.compile(r"^(\d{4})-(\d{2})\.pdf$")


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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start-date", default="2009-01", help="YYYY-MM inclusive")
    ap.add_argument("--end-date", default=time.strftime("%Y-%m"), help="YYYY-MM inclusive")
    ap.add_argument("--skip-scrape", action="store_true")
    ap.add_argument("--skip-download", action="store_true")
    ap.add_argument("--skip-load", action="store_true", help="parse only, don't touch Supabase")
    args = ap.parse_args()

    DATA.mkdir(parents=True, exist_ok=True)
    PARSED_DIR.mkdir(parents=True, exist_ok=True)
    processed: dict[str, dict] = (
        json.loads(PROCESSED_FILE.read_text()) if PROCESSED_FILE.exists() else {}
    )

    if not args.skip_scrape:
        if not run_step("scrape", ["scrape_isx_reports.py"]):
            sys.exit(1)
    if not args.skip_download:
        if not run_step("download", ["download_pdfs.py"]):
            sys.exit(1)

    # parse + load month by month
    from parse_monthly import parse_pdf  # same folder

    pdfs = sorted(p for p in PDF_DIR.glob("*.pdf") if MAIN_PDF_RE.match(p.name))
    in_range = [p for p in pdfs if args.start_date <= p.stem <= args.end_date]
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
            result = parse_pdf(pdf)
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
