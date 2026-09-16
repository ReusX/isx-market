"""
Two tables of the ISX monthly report about depository accounts:

  «تصنيف عدد الحسابات في مركز الإيداع» (Table 29 in 2025-11 onward):
      accounts OPENED in the month — طبيعي/معنوي × عراقي/غير عراقي.
  «عدد ونوع الحسابات في مركز الإيداع لغاية …» (Table 45 in older reports):
      accounts HELD at month end — شركة مساهمة · جهة حكومية · شخص طبيعي ·
      صندوق استثمار, each with Iraqi and non-Iraqi counts.

pdfplumber emits the Arabic reversed (RTL text read LTR), so the labels are
matched in that reversed form. Writes public/data/depository-accounts.json:
[{ym, new: {...}|null, total: {...}|null}], where `new` holds
natural_iraqi/natural_foreign/legal_iraqi/legal_foreign and `total` holds
natural_/company_/government_/fund_ × _iraqi/_foreign. Months whose tables
cannot be read carry null — never zero.

  python3 scripts/parse_depository_accounts.py
"""
import glob, json, re, sys, warnings
import pdfplumber
warnings.filterwarnings("ignore")

PDFS = "scripts/data/pdfs"
OUT = "public/data/depository-accounts.json"

# reversed spellings as pdfplumber emits them
NAT, NON, LEG = "يعيبط", "يقارع ريغ", "يونعم"
TITLE = "تاباسحلا ددع فينصت"
TITLE_TOTAL = "تاباسحلا عونو ددع"
TOTAL_ROWS = {"يعيبط صخش": "natural", "ةمهاسم ةكرش": "company", "ةيموكح ةهج": "government", "رامثتسا قودنص": "fund"}

def num(s):
    s = s.replace(",", "").strip()
    if s in ("-", "—", "–", ""): return 0
    return int(s) if re.fullmatch(r"\d+", s) else None

def parse_new(t):
    rows = {}
    for line in t.split("\n"):
        # e.g. "760 )يقارع( يعيبط 1"  ·  "6 )يقارع ريغ( يعيبط 2"
        m = re.match(r"^\s*([\d,]+|-)\s+\)([^)]+)\(\s+(\S+)\s+\d\s*$", line)
        if not m: continue
        val, nat, kind = m.groups()
        foreign = NON in nat
        key = ("natural" if kind == NAT else "legal" if kind == LEG else None)
        if not key: continue
        rows[f"{key}_{'foreign' if foreign else 'iraqi'}"] = num(val)
    return rows if len(rows) == 4 and all(v is not None for v in rows.values()) else None

def parse_total(t):
    rows = {}
    for line in t.split("\n"):
        # e.g. "1,545 55,092 يعيبط صخش 3" → foreign, iraqi, label, rank
        m = re.match(r"^\s*([\d,]+|-)\s+([\d,]+|-)\s+(.+?)\s+\d\s*$", line)
        if not m: continue
        foreign, iraqi, label = m.groups()
        key = next((v for k, v in TOTAL_ROWS.items() if k in label), None)
        if not key: continue
        rows[f"{key}_iraqi"], rows[f"{key}_foreign"] = num(iraqi), num(foreign)
    return rows if "natural_iraqi" in rows and all(v is not None for v in rows.values()) else None

def parse(path):
    new = total = None
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            if new is None and TITLE in t: new = parse_new(t)
            if total is None and TITLE_TOTAL in t: total = parse_total(t)
            if new and total: break
    return new, total

def main():
    out, bad = [], []
    seen = set()
    for path in sorted(glob.glob(f"{PDFS}/*.pdf")):
        name = path.rsplit("/", 1)[1]
        ym = name[:7]
        # the main report is `YYYY-MM.pdf`; market-specific reports duplicate it
        if not re.fullmatch(r"\d{4}-\d{2}\.pdf", name) or ym in seen: continue
        seen.add(ym)
        new, total = parse(path)
        if not new and not total: bad.append(ym); continue
        out.append({"ym": ym, "new": new, "total": total})
    out.sort(key=lambda x: x["ym"])
    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=0)
    print(f"{len(out)} months written to {OUT}; unreadable: {len(bad)}", ", ".join(bad[-12:]))

if __name__ == "__main__":
    main()
