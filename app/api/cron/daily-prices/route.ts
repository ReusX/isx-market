import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

// Vercel cron: fetch the last week of ISX daily-report workbooks and upsert
// per-company rows into daily_prices. TypeScript port of the local Python
// daily pipeline (scripts/run_pipeline.py --mode daily) — serverless functions
// can't run Python, and the daily_prices table itself serves as the
// "already processed" state, so no local processed.json is needed.

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const LIST_URL = 'http://www.isx-iq.net/isxportal/portal/uploadedFilesList.html'
const UA = { 'User-Agent': 'Mozilla/5.0 (iraqsm.com daily cron)' }
const DAYS_BACK = 7
const CODE_RE = /^[A-Z]{3,5}$/

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function ddmmyyyy(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

function decodeEntities(s: string): string {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

interface ListedFile { url: string; isoDate: string }

/** Page 1 of the daily filter covers ~10 files — more than a week of sessions. */
async function fetchDailyList(): Promise<ListedFile[]> {
  const to = new Date()
  const from = new Date(Date.now() - DAYS_BACK * 86400_000)
  const body = new URLSearchParams({ reporttype: '40', date: ddmmyyyy(from), toDate: ddmmyyyy(to) })
  const res = await fetch(LIST_URL, { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!res.ok) throw new Error(`ISX list HTTP ${res.status}`)
  const html = decodeEntities(await res.text())

  const files: ListedFile[] = []
  for (const tr of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    const tds = tr.match(/<td[^>]*>[\s\S]*?<\/td>/g) ?? []
    if (tds.length < 5) continue
    const href = tds[0]!.match(/href="([^"]+\.(?:xlsx|xls))"/i)?.[1]
    if (!href) continue
    const title = tds[2]!.replace(/<[^>]+>/g, ' ')
    if (!title.includes('التقرير اليومي')) continue
    const m = tds[4]!.replace(/<[^>]+>/g, ' ').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (!m) continue
    files.push({
      url: 'http://www.isx-iq.net' + href,
      isoDate: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
    })
  }
  return files
}

interface DailyRow {
  ticker: string; date: string
  open: number | null; high: number | null; low: number | null; close: number | null
  volume: number | null; value: number | null; trades: number | null
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/** Same detection as scripts/parse_daily_xlsx.py: the bulletin sheet is the
 *  one whose header row contains "رمز الشركة"; columns match by keyword. */
function parseWorkbook(buf: ArrayBuffer, isoDate: string): DailyRow[] {
  const wb = XLSX.read(buf, { type: 'array' })
  for (const name of wb.SheetNames) {
    const grid: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null })
    const hdrI = grid.findIndex(r => r.some(c => typeof c === 'string' && c.includes('رمز الشركة')))
    if (hdrI < 0) continue
    const hdr = grid[hdrI].map(c => String(c ?? ''))
    const col = (...needles: string[]) => {
      const i = hdr.findIndex(h => needles.some(n => h.includes(n)))
      return i < 0 ? null : i
    }
    const c = {
      code: col('رمز'), open: col('افتتاح'), high: col('اعلى'), low: col('ادنى'),
      close: col('سعر الاغلاق', 'الاغلاق'), trades: col('الصفقات'),
      volume: col('الاسهم المتداولة'), value: col('القيمة المتداولة'),
    }
    if (c.code === null || c.close === null) continue
    const rows: DailyRow[] = []
    for (const r of grid.slice(hdrI + 1)) {
      const code = String(r[c.code] ?? '').trim()
      if (!CODE_RE.test(code)) continue
      rows.push({
        ticker: code, date: isoDate,
        open: c.open !== null ? num(r[c.open]) : null,
        high: c.high !== null ? num(r[c.high]) : null,
        low: c.low !== null ? num(r[c.low]) : null,
        close: num(r[c.close]),
        volume: c.volume !== null ? num(r[c.volume]) : null,
        value: c.value !== null ? num(r[c.value]) : null,
        trades: c.trades !== null ? num(r[c.trades]) : null,
      })
    }
    if (rows.length) return rows
  }
  return []
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const force = req.nextUrl.searchParams.get('force') === '1'

  try {
    const listed = await fetchDailyList()

    // skip sessions already in daily_prices (the DB is the processed-state)
    const cutoff = new Date(Date.now() - DAYS_BACK * 86400_000).toISOString().slice(0, 10)
    const { data: existing } = await supabase
      .from('daily_prices').select('date').gte('date', cutoff)
    const have = new Set((existing ?? []).map(r => r.date))

    const todo = listed.filter(f => force || !have.has(f.isoDate))
    const loaded: { date: string; rows: number }[] = []
    const failed: { date: string; error: string }[] = []

    for (const file of todo.slice(0, 6)) {
      try {
        const res = await fetch(encodeURI(file.url), { headers: UA })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const rows = parseWorkbook(await res.arrayBuffer(), file.isoDate)
        if (!rows.length) throw new Error('no bulletin rows parsed')
        const { error } = await supabase
          .from('daily_prices').upsert(rows, { onConflict: 'ticker,date' })
        if (error) throw new Error(error.message)
        loaded.push({ date: file.isoDate, rows: rows.length })
      } catch (e) {
        failed.push({ date: file.isoDate, error: String(e) })
      }
    }

    return NextResponse.json({
      ok: failed.length === 0,
      listed: listed.length,
      skipped: listed.length - todo.length,
      loaded, failed,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
