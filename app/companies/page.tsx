import Link from 'next/link'
import companiesData from '@/public/data/companies.json'

const SECTOR_LABELS: Record<string, { ar: string; en: string }> = {
  BNK: { ar: 'المصارف',        en: 'Banking' },
  IND: { ar: 'الصناعة',        en: 'Industry' },
  HOT: { ar: 'الفنادق',        en: 'Hotels & Tourism' },
  INS: { ar: 'التأمين',        en: 'Insurance' },
  INV: { ar: 'الاستثمار',      en: 'Investment' },
  AGR: { ar: 'الزراعة',        en: 'Agriculture' },
  SER: { ar: 'الخدمات',        en: 'Services' },
  TEL: { ar: 'الاتصالات',      en: 'Telecom' },
  CON: { ar: 'البناء',          en: 'Construction' },
  MED: { ar: 'الإعلام',        en: 'Media' },
  FIN: { ar: 'المالية',        en: 'Financial' },
}

type Company = { sym: string; ar: string; en: string; sec?: string; color?: string }

export default function CompaniesPage() {
  const companies = companiesData as Company[]

  // Group by sector
  const bySector: Record<string, Company[]> = {}
  for (const co of companies) {
    const sec = co.sec ?? 'OTHER'
    if (!bySector[sec]) bySector[sec] = []
    bySector[sec].push(co)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 60px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
        الشركات المدرجة في بورصة العراق — Iraq Stock Exchange Listed Companies
      </h1>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 32 }}>
        {companies.length} شركة مدرجة في بورصة العراق للأوراق المالية (ISX) —&nbsp;
        {companies.length} companies listed on the Iraq Stock Exchange (ISX).
        تصفح اسهم العراق حسب القطاع — browse Iraq stock market companies by sector.
      </p>

      {Object.entries(bySector).sort().map(([sec, cos]) => (
        <div key={sec} style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 13, fontWeight: 700, color: 'var(--ink4)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 12, paddingBottom: 6,
            borderBottom: '1px solid var(--line)',
          }}>
            {SECTOR_LABELS[sec]?.ar ?? sec} — {SECTOR_LABELS[sec]?.en ?? sec}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cos.map(co => (
              <Link
                key={co.sym}
                href={`/c/${co.sym}`}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: 'var(--surf)', border: '1px solid var(--line)',
                  fontSize: 13, color: 'var(--ink2)', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: co.color ?? 'var(--brand)', flexShrink: 0,
                }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink4)' }}>{co.sym}</span>
                <span>{co.ar}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
