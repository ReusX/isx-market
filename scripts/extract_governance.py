#!/usr/bin/env python3
"""Auditor's report + board report -> company_governance, from the ISC annual PDF.

Free Gemini tier, several keys rotated on quota (GEMINI_API_KEYS=k1,k2,… in
.env.local; keys are never printed). Each key uses the first model it can call.
Every answer is kept in `raw`; typed columns are what the site reads. Rows are
written with reviewed=false; the pages only show reviewed rows.

  python scripts/extract_governance.py --limit 20            # first batch
  python scripts/extract_governance.py --ticker BBOB --year 2024
  python scripts/extract_governance.py --all                  # everything pending
"""
from __future__ import annotations
import argparse, json, os, sys, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
for line in (ROOT / ".env.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, _, v = line.partition("="); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
SB = os.environ["NEXT_PUBLIC_SUPABASE_URL"]; SBK = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SBH = {"apikey": SBK, "Authorization": f"Bearer {SBK}", "Content-Type": "application/json"}
KEYS = [k for k in os.environ.get("GEMINI_API_KEYS", "").split(",") if k.strip()]
if not KEYS: sys.exit("GEMINI_API_KEYS missing from .env.local")
MODELS = ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-flash-latest"]
G = "https://generativelanguage.googleapis.com"
LOG = ROOT / "scripts" / "data" / "governance_run.log"

PROMPT = """You are reading the audited ANNUAL report of an Iraqi listed company ({ticker}, fiscal year {year}) filed with the Iraq Securities Commission, in Arabic. Answer in STRICT JSON only, with exactly these keys:

{{
  "auditor_firm": "<name of the external audit firm as printed, Arabic>",
  "audit_opinion": "unqualified" | "qualified" | "adverse" | "disclaimer" | "unknown",
  "key_audit_matters": "<short Arabic summary of the routine 'أمور التدقيق الرئيسية' section, or null>",
  "emphasis_of_matter": "<ONLY a genuine 'فقرة لفت انتباه' / reservation / qualification / reference to a going-concern doubt, in Arabic, or null — NOT the routine key audit matters>",
  "going_concern": true | false | null,   // true if the auditor's report expresses doubt about الاستمرارية anywhere
  "dividend_per_share": <number IQD per share proposed or approved for this fiscal year, or null>,
  "dividend_total": <number, total IQD proposed, or null>,
  "dividend_note": "<the sentence from the board report about profit distribution, Arabic, or null>",
  "capital_change": "<any capital increase/decrease decided or proposed, Arabic, or null>",
  "branches": <integer number of branches, or null>,
  "employees": <integer number of employees, or null>,
  "chairman": "<name or null>",
  "managing_director": "<name or null>",
  "top_shareholders": [{{"name": "<Arabic>", "pct": <number>}}, ...] or [],
  "confidence": <0.0-1.0 overall>,
  "pages": {{"auditor": <pdf page of the audit opinion>, "board": <pdf page of the board report>}}
}}

Where to look: the auditor's report is a signed letter near the front (تقرير مراقب الحسابات / مدقق الحسابات المستقل); the opinion paragraph says الرأي / في رأينا. "qualified" = رأي متحفظ / باستثناء; "adverse" = رأي معاكس / سلبي; "disclaimer" = الامتناع عن إبداء الرأي; otherwise "unqualified" (رأي غير متحفظ / نظيف). Dividends and branches are in تقرير مجلس الإدارة, often as توزيع أرباح بنسبة X% من رأس المال — convert a percentage of capital to IQD per share (par value is 1 IQD, so 5% = 0.05 IQD per share). If the report proposes no distribution, set dividend_per_share to 0 and quote the sentence. Never invent a value; use null when it is not printed."""

def sb(method, path, body=None, prefer=None):
    h = dict(SBH)
    if prefer: h["Prefer"] = prefer
    r = requests.request(method, f"{SB}/rest/v1/{path}", headers=h, data=json.dumps(body) if body is not None else None, timeout=120)
    if r.status_code >= 300: raise RuntimeError(f"{method} {path}: {r.status_code} {r.text[:200]}")
    return r.json() if r.text else None

def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"; print(line, flush=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a") as f: f.write(line + "\n")

class Keys:
    """Rotate keys on quota; remember which model each key can use."""
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
    start = requests.post(f"{G}/upload/v1beta/files", headers={"x-goog-api-key": k, "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": str(len(pdf)), "X-Goog-Upload-Header-Content-Type": "application/pdf", "Content-Type": "application/json"}, data=json.dumps({"file": {"display_name": name}}), timeout=60)
    if start.status_code in (429, 503): return None
    up_url = start.headers.get("X-Goog-Upload-URL")
    if not up_url: raise RuntimeError(f"upload init {start.status_code}")
    up = requests.post(up_url, headers={"Content-Length": str(len(pdf)), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize"}, data=pdf, timeout=300)
    f = up.json()["file"]; state = f.get("state")
    while state == "PROCESSING":
        time.sleep(2); state = requests.get(f"{G}/v1beta/{f['name']}", headers={"x-goog-api-key": k}, timeout=60).json().get("state")
    if state != "ACTIVE": raise RuntimeError(f"file state {state}")
    return f["uri"]

def generate(k, uri, prompt):
    body = {"contents": [{"parts": [{"file_data": {"mime_type": "application/pdf", "file_uri": uri}}, {"text": prompt}]}], "generationConfig": {"temperature": 0, "response_mime_type": "application/json"}}
    models = [keys.model[k]] if k in keys.model else MODELS
    for m in models:
        r = requests.post(f"{G}/v1beta/models/{m}:generateContent", headers={"x-goog-api-key": k, "Content-Type": "application/json"}, data=json.dumps(body), timeout=300)
        if r.status_code == 404: continue
        if r.status_code in (429, 503): return "quota", m
        if r.status_code >= 300: raise RuntimeError(f"generate {m}: {r.status_code} {r.text[:200]}")
        keys.model[k] = m
        return json.loads(r.json()["candidates"][0]["content"]["parts"][0]["text"]), m
    raise RuntimeError("no callable model for this key")

def extract(rep):
    pdf = requests.get(rep["pdf_url"], headers={"User-Agent": "Mozilla/5.0"}, timeout=120, allow_redirects=True).content
    if not pdf.startswith(b"%PDF"): raise RuntimeError("not a PDF")
    prompt = PROMPT.format(ticker=rep["ticker"], year=rep["fiscal_year"])
    strikes = {}
    while True:
        k = keys.current()
        if not k: raise SystemExit("all keys exhausted for today")
        uri = upload(k, pdf, f"{rep['ticker']}_{rep['id']}.pdf")
        out, m = (None, None) if uri is None else generate(k, uri, prompt)
        if uri is None or out == "quota":
            # A 429 on the free tier is usually the per-minute TOKEN window (one
            # 100-page PDF fills it), not the day. Wait it out twice on the same
            # key before treating the key as spent.
            strikes[k] = strikes.get(k, 0) + 1
            if strikes[k] <= 2:
                log(f"    key …{k[-4:]} rate-limited ({m or 'upload'}) → waiting 70s"); time.sleep(70); continue
            log(f"    key …{k[-4:]} still limited → next key"); keys.rotate(k); continue
        return out, m

OPINIONS = {"unqualified", "qualified", "adverse", "disclaimer", "unknown"}
def num(v):
    try: return None if v is None else float(v)
    except (TypeError, ValueError): return None
def integer(v):
    try: return None if v is None else int(float(v))
    except (TypeError, ValueError): return None

def save(rep, out, model):
    row = {
        "ticker": rep["ticker"], "fiscal_year": rep["fiscal_year"], "report_id": rep["id"],
        "auditor_firm": out.get("auditor_firm"), "audit_opinion": out.get("audit_opinion") if out.get("audit_opinion") in OPINIONS else "unknown",
        "emphasis_of_matter": out.get("emphasis_of_matter"), "key_audit_matters": out.get("key_audit_matters"), "going_concern": out.get("going_concern") if isinstance(out.get("going_concern"), bool) else None,
        "dividend_per_share": num(out.get("dividend_per_share")), "dividend_total": num(out.get("dividend_total")), "dividend_note": out.get("dividend_note"),
        "capital_change": out.get("capital_change"), "branches": integer(out.get("branches")), "employees": integer(out.get("employees")),
        "chairman": out.get("chairman"), "managing_director": out.get("managing_director"),
        "top_shareholders": out.get("top_shareholders") if isinstance(out.get("top_shareholders"), list) else [],
        "confidence": num(out.get("confidence")), "model": model, "raw": out, "reviewed": False,
    }
    sb("POST", "company_governance?on_conflict=ticker,fiscal_year", [row], prefer="resolution=merge-duplicates,return=minimal")

def pending(limit, ticker=None, year=None):
    q = "financial_reports?select=id,ticker,fiscal_year,period,pdf_url&period=eq.ANNUAL&fiscal_year=gte.2022&pdf_url=not.is.null&order=fiscal_year.desc,ticker.asc&limit=2000"
    if ticker: q += f"&ticker=eq.{ticker}"
    if year: q += f"&fiscal_year=eq.{year}"
    reps = sb("GET", q)
    done = {(r["ticker"], r["fiscal_year"]) for r in sb("GET", "company_governance?select=ticker,fiscal_year&limit=5000")}
    # newest year per ticker first, then older ones
    seen = {}
    for r in reps:
        if (r["ticker"], r["fiscal_year"]) in done: continue
        seen.setdefault(r["ticker"], []).append(r)
    order = []
    for depth in range(4):
        for t, rs in seen.items():
            if len(rs) > depth: order.append(rs[depth])
    return order[:limit] if limit else order

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0); ap.add_argument("--ticker"); ap.add_argument("--year", type=int); ap.add_argument("--all", action="store_true")
    a = ap.parse_args()
    reps = pending(a.limit or (0 if a.all else 20), a.ticker, a.year)
    log(f"{len(reps)} filings to extract with {len(KEYS)} keys")
    ok = 0
    for rep in reps:
        try:
            try: out, m = extract(rep)
            except (requests.exceptions.RequestException, ValueError) as e:
                log(f"    retry {rep['ticker']} {rep['fiscal_year']} after: {str(e)[:80]}"); time.sleep(30); out, m = extract(rep)
            save(rep, out, m); ok += 1
            log(f"  ✓ {rep['ticker']} {rep['fiscal_year']}: {out.get('audit_opinion')} · {out.get('auditor_firm')} · div {out.get('dividend_per_share')} · br {out.get('branches')} ({m})")
        except SystemExit as e: log(f"  ■ stop: {e}"); break
        except Exception as e: log(f"  ✗ {rep['ticker']} {rep['fiscal_year']}: {e}")
        time.sleep(4)   # stay well under free-tier RPM
    log(f"done: {ok}/{len(reps)}")

if __name__ == "__main__": main()
