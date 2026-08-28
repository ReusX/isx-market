'use client'

/**
 * /companies and /en/companies — the listed-company directory.
 *
 * ── Why this route matters more than its traffic suggests ─────────────────
 * It is the ONLY crawlable path to /c/[sym]. Every price table in the product
 * — here, the homepage, /market, /screener, /heatmap — fetches its rows in the
 * browser, so the HTML a crawler receives from those pages contains zero
 * company links. Before this page had an English twin, all 104 /en/c/[sym]
 * pages were orphans: present in the sitemap, linked from nothing.
 *
 * The server-rendered index at the bottom is that path. It is a real directory
 * a reader can use, not a hidden block of links.
 */
import Link from 'next/link'
import companiesData from '@/public/data/companies.json'
import { useLocale } from '@/context/LocaleContext'
import { SECTORS } from '@/lib/market'
import CompaniesDirectory from './CompaniesDirectory'

type CompanyRow = { sym: string; ar: string; en: string; sec: string }

export function CompaniesPage() {
  const { t: T, locale, href: L } = useLocale()
  const d = T.company.directory
  const companies = companiesData as CompanyRow[]
  const total = String(companies.length)

  /* Sector names come from the one bilingual SECTORS table, not a second map:
     a directory that disagreed with the filter chips above it about what a
     sector is called would be its own bug. */
  const sectorName = new Map(SECTORS.filter(s => s.id !== 'all').map(s => [s.id, locale === 'ar' ? s.arFull : s.enFull]))

  /* Sort by the name the READER sees, so the index is alphabetical in the
     language it is written in. A company with no English name keeps its
     official Arabic one — never a machine translation. */
  const nameOf = (c: CompanyRow) => (locale === 'ar' ? c.ar || c.en : c.en || c.ar) || c.sym
  const bySector = new Map<string, CompanyRow[]>()
  for (const c of [...companies].sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale))) {
    const key = sectorName.get(c.sec) ?? c.sec
    ;(bySector.get(key) ?? bySector.set(key, []).get(key)!).push(c)
  }
  const sectors = Array.from(bySector.entries()).sort((a, b) => b[1].length - a[1].length)

  return (
    <main className="terminal-shell">
      <header className="page-heading">
        <div>
          <span className="app-eyebrow">{d.eyebrow}</span>
          <h1>{d.h1(total)}</h1>
          <p>{d.standfirst(total)}</p>
        </div>
      </header>

      <CompaniesDirectory />

      <section className="company-index" aria-labelledby="company-index-title">
        <h2 id="company-index-title">{d.indexTitle}</h2>
        {sectors.map(([sector, rows]) => (
          <div className="company-index-group" key={sector}>
            <h3>{sector} <bdi>({rows.length})</bdi></h3>
            <ul>
              {rows.map(c => (
                <li key={c.sym}>
                  <Link href={L(`/c/${c.sym}`)}>
                    <span dir="auto">{nameOf(c)}</span>
                    <bdi>{c.sym}</bdi>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  )
}
