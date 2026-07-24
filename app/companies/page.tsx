import companiesData from '@/public/data/companies.json'
import CompaniesClient from './CompaniesClient'

export default function CompaniesPage() {
  const total = (companiesData as unknown[]).length

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
    </main>
  )
}
