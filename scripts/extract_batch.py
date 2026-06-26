#!/usr/bin/env python3
"""Batch-extract + load + publish financial statements for ISX companies.

For every target ticker, extracts each PENDING report among
{2025 Q1, Q2, Q3, ANNUAL} + {2026 Q1} that has a PDF on ISC, via
extract_claude.py (model from CLAUDE_MODEL), then loads + publishes.

Resumable: completed tickers are recorded in _batch_done.txt and skipped.
Errors on one ticker never stop the run. Reports that fail the accounting
identity checks stay status='failed' and are NOT published.

Usage:
  python scripts/extract_batch.py                 # all targets
  python scripts/extract_batch.py BASH HMAN IMAP  # only these tickers
"""
from __future__ import annotations
import json, os, re, subprocess, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT  = ROOT / "scripts" / "data" / "fundamentals"
DONE = OUT / "_batch_done.txt"
LOG  = OUT / "_batch.log"
PY   = sys.executable

for line in (ROOT / ".env.local").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
URL = os.environ.get("SUPABASE_URL") or os.environ["NEXT_PUBLIC_SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def log(msg: str):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with LOG.open("a") as f: f.write(line + "\n")


def q(path: str):
    req = urllib.request.Request(URL + "/rest/v1/" + path,
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "User-Agent": "M"})
    return json.load(urllib.request.urlopen(req, timeout=60))


def targets():
    """ticker -> [pending report ids] for 2025 any period + 2026 Q1, pdf present."""
    rows = q("financial_reports?select=ticker,id,fiscal_year,period,status,pdf_url"
             "&or=(fiscal_year.eq.2025,and(fiscal_year.eq.2026,period.eq.Q1))"
             "&status=eq.pending&order=ticker.asc")
    by: dict[str, list[int]] = {}
    for r in rows:
        if not r["pdf_url"]:
            continue
        by.setdefault(r["ticker"], []).append(r["id"])
    return by


def run(cmd: list[str]) -> tuple[int, str]:
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def main():
    done = set(DONE.read_text().split()) if DONE.exists() else set()
    by = targets()
    only = [t.upper() for t in sys.argv[1:]]
    tickers = [t for t in by if (not only or t in only) and t not in done]
    log(f"=== batch start · model={os.environ.get('CLAUDE_MODEL')} · "
        f"{len(tickers)} tickers, {sum(len(by[t]) for t in tickers)} reports ===")

    for i, t in enumerate(tickers, 1):
        ids = by[t]
        log(f"[{i}/{len(tickers)}] {t}: extracting {len(ids)} report(s) {ids}")
        cmd = [PY, "scripts/extract_claude.py", t]
        for rid in ids:
            cmd += ["--report", str(rid)]
        rc, out = run(cmd)
        m = re.search(r"wrote (\S+\.claude\.json)", out)
        if rc != 0 or not m:
            log(f"  ! {t} extract failed (rc={rc}). tail: {out.strip().splitlines()[-1] if out.strip() else ''}")
            continue
        path = m.group(1)
        rc, out = run([PY, "scripts/fundamentals_load.py", path])
        for ln in out.splitlines():
            if any(s in ln for s in ("✓", "✗", "checks", "ratio", "FAIL", "Error", "Traceback")):
                log(f"    {ln.strip()}")
        if rc != 0:
            log(f"  ! {t} load failed (rc={rc})"); continue
        rc, out = run([PY, "scripts/fundamentals_load.py", "--publish", t])
        log(f"  ✓ {t} published" if rc == 0 else f"  ! {t} publish rc={rc}")
        with DONE.open("a") as f: f.write(t + "\n")

    log(f"=== batch done ({len(tickers)} tickers processed) ===")


if __name__ == "__main__":
    main()
