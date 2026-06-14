#!/bin/bash
# Parse all ISX monthly PDFs with the full parser
# Usage: bash run_parse_full.sh

set -euo pipefail

PDF_DIR="$(dirname "$0")/data/pdfs"
OUT_DIR="$(dirname "$0")/data/parsed_full"
mkdir -p "$OUT_DIR"

TOTAL=$(ls "$PDF_DIR"/*.pdf 2>/dev/null | wc -l | tr -d ' ')
DONE=0
SKIP=0
FAIL=0

echo "Parsing $TOTAL PDFs → $OUT_DIR"
echo "$(date)"
echo "---"

for pdf in "$PDF_DIR"/*.pdf; do
    base=$(basename "$pdf" .pdf)
    out="$OUT_DIR/$base.json"

    if [ -f "$out" ]; then
        SKIP=$((SKIP+1))
        continue
    fi

    DONE=$((DONE+1))
    result=$(python3 "$(dirname "$0")/parse_monthly_full.py" "$pdf" --out "$out" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "[$DONE/$TOTAL] $result"
    else
        echo "[$DONE/$TOTAL] FAILED: $base"
        FAIL=$((FAIL+1))
        rm -f "$out"
    fi
done

echo "---"
echo "Done: $DONE parsed, $SKIP skipped, $FAIL failed"
echo "$(date)"
