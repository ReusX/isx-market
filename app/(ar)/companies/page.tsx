import Link from 'next/link'
import companiesData from '@/public/data/companies.json'
import CompaniesClient from './CompaniesClient'

type CompanyRow = { sym: string; ar: string; en: string; sec: string }

const SECTOR_AR: Record<string, string> = {
  BANK: 'المصارف', IND: 'الصناعة', SVC: 'الخدمات', HTL: 'الفنادق والسياحة',
  TEL: 'الاتصالات', AGR: 'الزراعة', INS: 'التأمين', INV: 'الاستثمار المالي',
}

export default function CompaniesPage() {
  const companies = companiesData as CompanyRow[]
  const total = companies.length

  // Group by sector for the server-rendered index below.
  const bySector = new Map<string, CompanyRow[]>()
  for (const c of [...companies].sort((a, b) => a.ar.localeCompare(b.ar, 'ar'))) {
    const key = SECTOR_AR[c.sec] ?? c.sec
    ;(bySector.get(key) ?? bySector.set(key, []).get(key)!).push(c)
  }
  const sectors = Array.from(bySector.entries()).sort((a, b) => b[1].length - a[1].length)

  return (
    <main className="terminal-shell">
      {/* Existing SEO copy · preserved verbatim */}
      <header className="page-heading">
        <div>
          <span className="app-eyebrow">دليل الشركات</span>
          <h1>الشركات المدرجة في بورصة العراق · Iraq Stock Exchange Listed Companies</h1>
          <p>
            {total} شركة مدرجة في بورصة العراق للأوراق المالية (ISX) ·&nbsp;
            {total} companies listed on the Iraq Stock Exchange (ISX).
            تصفح اسهم العراق حسب القطاع · browse Iraq stock market companies by sector.
          </p>
        </div>
      </header>

      <CompaniesClient />

      {/*
        Server-rendered index of every listed company, grouped by sector.

        This is the only crawlable path to /c/[sym]. Every price table on the
        site — here, the homepage, /market, /screener, /heatmap — fetches its
        rows in the browser, so the HTML a crawler receives contains zero
        company links and all 104 pages read as orphans even though they sit
        in the sitemap. Rendering the list on the server fixes that, and it is
        a real directory readers can use, not a hidden link block.
      */}
      <section className="company-index" aria-labelledby="company-index-title">
        <h2 id="company-index-title">كل الشركات المدرجة حسب القطاع</h2>
        {sectors.map(([sector, rows]) => (
          <div className="company-index-group" key={sector}>
            <h3>{sector} <bdi>({rows.length})</bdi></h3>
            <ul>
              {rows.map(c => (
                <li key={c.sym}>
                  <Link href={`/c/${c.sym}`}>
                    <span>{c.ar || c.en}</span>
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
