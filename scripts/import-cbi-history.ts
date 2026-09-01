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
const DRY = process.argv.includes('--dry')

interface Point { date: string; rate: number }

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

/**
 * Parsing is delegated to scripts/cbi_history.py.
 *
 * A hand-rolled XML reader lived here and was wrong in a way that took three
 * independent verifications to see: every value it emitted matched the
 * workbook exactly, but 2,083 days were missing and 1,996 dates it produced
 * are not in the workbook at all. Right numbers, wrong dates. openpyxl is
 * already a dependency of this repo's ingestion layer and its output has been
 * checked cell by cell, so it does the reading and this file does the writing.
 */
async function parsePoints(): Promise<Point[]> {
  const { spawnSync } = await import('node:child_process')
  const py = spawnSync('python3', ['scripts/cbi_history.py', LISTING], {
    encoding: 'utf-8',
    maxBuffer: 32 * 1024 * 1024,
  })
  if (py.stderr) process.stderr.write(py.stderr)
  if (py.status !== 0) throw new Error(`cbi_history.py exited ${py.status}`)
  const map = JSON.parse(py.stdout) as Record<string, number>
  return Object.entries(map)
    .map(([date, rate]) => ({ date, rate }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function main() {
  const points = await parsePoints()
  if (!points.length) { console.error('✗ no observations extracted'); process.exit(1) }
  console.log(`${points.length} distinct days, ${points[0].date} → ${points[points.length - 1].date}`)

  if (DRY) {
    /* --dry --emit writes the parsed set to a file so it can be diffed against
       an independent reader. The first extractor agreed with itself and was
       still wrong; only a second implementation catches that. */
    if (process.argv.includes('--emit')) {
      const fs = await import('node:fs')
      fs.writeFileSync('/tmp/ts-points.json', JSON.stringify(Object.fromEntries(points.map((p) => [p.date, p.rate]))))
      console.log('wrote /tmp/ts-points.json')
    }
    console.log('(dry run — nothing written)')
    return
  }

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
