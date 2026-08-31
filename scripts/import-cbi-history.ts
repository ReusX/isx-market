/**
 * Import the Central Bank's official USD/IQD history.
 *
 *   npx tsx scripts/import-cbi-history.ts [--dry]
 *
 * The parallel market has no archive we can trust, so its history begins the
 * day we started recording. The official rate is different: the CBI publishes
 * it in downloadable workbooks going back to 2003, which is a real backfill
 * from the issuer rather than a reconstruction. Those rows land with
 * `origin = 'imported'` so the chart can say which part of the line we
 * watched and which part we were given.
 *
 * ── The URL cannot be hardcoded ───────────────────────────────────────────
 * The workbooks live at /static/uploads/up/file-<opaque-id>.xlsx, and the id
 * changes whenever the bank re-uploads. So the listing page is scraped for the
 * current link on every run. A hardcoded URL here would 404 silently one day
 * and leave the import looking like it had simply found nothing new.
 *
 * ── The sheet geometry ────────────────────────────────────────────────────
 * Not a table of dates. Each sheet is a year block: day numbers down column A,
 * month names across the header, the rate in the cell where they meet, and an
 * average row at the bottom that must not be read as a day. Blank cells are
 * non-trading days and are skipped rather than carried forward — an
 * interpolated official rate would be a value the bank never published.
 */

import { recordMany } from '../lib/fxRecord'
import { cbiXlsxEvent } from '../lib/fxSeries'

const LISTING = 'https://cbi.iq/page/144'
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; IraqSM/1.0; +https://iraqsm.com)' }
const DRY = process.argv.includes('--dry')

/** Ask the database what it holds. The write path cannot report this reliably
 *  — see the note in recordMany — and a backfill that miscounts is a backfill
 *  nobody can trust. */
async function countOfficialImported(): Promise<number> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/fx_observations` +
    `?select=id&series=eq.official_cbi&origin=eq.imported`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    },
  )
  return Number(res.headers.get('content-range')?.split('/')[1] ?? 0)
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** Find the workbook that carries the daily USD series. */
async function findWorkbooks(): Promise<string[]> {
  const res = await fetch(LISTING, { headers: UA, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`listing ${res.status}`)
  const html = await res.text()
  const links = Array.from(html.matchAll(/href="(https:\/\/cbi\.iq\/static\/uploads\/up\/[^"]+\.xlsx)"/g)).map((m) => m[1])
  if (!links.length) throw new Error('no .xlsx links on the listing page — the page structure changed')
  return Array.from(new Set(links))
}

type Cell = string | number | null

/** Minimal xlsx reader: shared strings + one sheet, as a dense grid. */
async function readSheet(buf: ArrayBuffer, wanted: RegExp): Promise<{ name: string; grid: Cell[][] }[]> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(buf)

  const ssXml = (await zip.file('xl/sharedStrings.xml')?.async('text')) ?? ''
  const shared = Array.from(ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)).map((m) =>
    Array.from(m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((t) => t[1]).join(''))

  const wbXml = (await zip.file('xl/workbook.xml')?.async('text')) ?? ''
  const relXml = (await zip.file('xl/_rels/workbook.xml.rels')?.async('text')) ?? ''
  const rels = new Map(Array.from(relXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)).map((m) => [m[1], m[2]] as const))
  const sheets = Array.from(wbXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g))
    .map((m) => ({ name: m[1], target: rels.get(m[2]) ?? '' }))
    .filter((s) => wanted.test(s.name))

  const out: { name: string; grid: Cell[][] }[] = []
  for (const s of sheets) {
    const path = 'xl/' + s.target.replace(/^\/?xl\//, '')
    const xml = await zip.file(path)?.async('text')
    if (!xml) continue
    const grid: Cell[][] = []
    for (const rm of Array.from(xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g))) {
      const r = +rm[1] - 1
      grid[r] ??= []
      for (const cm of Array.from(rm[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g))) {
        const col = cm[1].split('').reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0) - 1
        const isStr = /t="s"/.test(cm[2])
        const v = cm[3].match(/<v>([^<]*)<\/v>/)?.[1]
        if (v == null) continue
        grid[r][col] = isStr ? (shared[+v] ?? '') : parseFloat(v)
      }
    }
    out.push({ name: s.name, grid })
  }
  return out
}

interface Point { date: string; rate: number }

/** Pull (day × month) → rate out of one year-block sheet. */
function extract(grid: Cell[][]): Point[] {
  const points: Point[] = []
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] ?? []
    const header = String(row[0] ?? '')
    /* The header cell reads like "2003/Date" — the year lives there, and it is
       the only place the sheet states it. */
    const year = header.match(/(19|20)\d{2}/)?.[0]
    if (!year) continue

    const monthOf = new Map<number, number>()
    for (let c = 1; c < row.length; c++) {
      const key = String(row[c] ?? '').trim().toLowerCase().slice(0, 3)
      if (MONTHS[key]) monthOf.set(c, MONTHS[key])
    }
    if (!monthOf.size) continue

    for (let rr = r + 1; rr < grid.length; rr++) {
      const dRow = grid[rr] ?? []
      const first = dRow[0]
      /* Stop at the average row — "Avg." is not the 32nd of the month. */
      if (typeof first !== 'number') break
      const day = first
      if (day < 1 || day > 31) continue
      for (const [c, month] of Array.from(monthOf.entries())) {
        const v = dRow[c]
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 100 || v > 5000) continue
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        /* Guard against 31 February and friends: the sheet has a cell for
           every day of every month regardless of length. */
        const d = new Date(date + 'T00:00:00Z')
        if (d.getUTCDate() !== day || d.getUTCMonth() + 1 !== month) continue
        points.push({ date, rate: v })
      }
      r = rr
    }
  }
  return points
}

async function main() {
  const books = await findWorkbooks()
  console.log(`listing: ${books.length} workbook(s)`)

  const all = new Map<string, number>()
  for (const url of books) {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60_000) })
    if (!res.ok) { console.log(`  · ${url.slice(-28)} → ${res.status}, skipped`); continue }
    const buf = await res.arrayBuffer()
    let sheets: { name: string; grid: Cell[][] }[] = []
    try { sheets = await readSheet(buf, /daily price basis/i) } catch (e) {
      console.log(`  · ${url.slice(-28)} → unreadable (${e instanceof Error ? e.message : 'error'})`); continue
    }
    if (!sheets.length) { console.log(`  · ${url.slice(-28)} → no daily sheet`); continue }
    for (const s of sheets) {
      const pts = extract(s.grid)
      for (const p of pts) all.set(p.date, p.rate)
      console.log(`  ✓ ${url.slice(-28)} · sheet "${s.name}" → ${pts.length} days`)
    }
  }

  const points = Array.from(all.entries()).map(([date, rate]) => ({ date, rate })).sort((a, b) => a.date.localeCompare(b.date))
  if (!points.length) { console.error('✗ no observations extracted'); process.exit(1) }
  console.log(`\n${points.length} distinct days, ${points[0].date} → ${points[points.length - 1].date}`)
  if (DRY) { console.log('(dry run — nothing written)'); return }

  const rows = points.map((p) => ({
    series: 'official_cbi' as const, location: 'baghdad' as const,
    buy: null, sell: p.rate, mid: null,
    /* Midday Baghdad: the workbook states a day, not a time, and anchoring
       inside the day keeps the timestamp on the right calendar date under any
       downstream timezone handling. */
    observedAt: `${p.date}T09:00:00Z`,
    observedDate: p.date,
    origin: 'imported' as const,
    sourceKey: 'cbi-xlsx',
    sourceUrl: LISTING,
    sourceEvent: cbiXlsxEvent(p.date),
    rawExcerpt: `CBI daily price basis · ${p.date} · ${p.rate}`,
  }))

  const before = await countOfficialImported()
  const r = await recordMany(rows)
  const after = await countOfficialImported()
  const gained = after - before
  console.log(`imported ${gained} new · ${r.attempted - gained} already held · ${r.failed} failed · ${after} rows total`)
  /* A run that wrote nothing because it could not authenticate must not look
     like a run that found nothing new — the first version of this reported
     «0 new, 5497 already held» for a total failure. */
  if (r.failed) {
    console.error(`✗ ${r.failed} write(s) failed`)
    r.reasons.forEach((x) => console.error('  ·', x))
    process.exit(1)
  }
  console.log('✓ done')
}

void main()
