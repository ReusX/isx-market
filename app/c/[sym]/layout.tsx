import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import companiesData from '@/public/data/companies.json'

const BASE = 'https://iraqsm.com'

interface Props {
  params:   { sym: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: { params: { sym: string } }): Promise<Metadata> {
  const sym     = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string; sec?: string }[])
    .find(c => c.sym === sym)

  const enName  = company?.en ?? sym
  const arName  = company?.ar ?? sym
  const title   = { absolute: `${sym} — ${enName.slice(0, 28)} | Iraq Stock Exchange` }
  const desc    = `${arName} (${sym}) — سعر السهم في سوق الاسهم العراقي مباشرة. ${enName} (${sym}) live share price, charts, and market data on the Iraq Stock Exchange (ISX).`.slice(0, 158)
  const url     = `${BASE}/c/${sym}`

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    keywords: [
      `${sym}`, `${enName}`, `${arName}`,
      'iraq stock exchange', 'iraq stock market', 'isx',
      'اسعار الاسهم العراقية', 'سوق الاسهم العراقي',
    ],
    openGraph: {
      title:       `${sym} — ${enName} | Iraq Stock Exchange`,
      description: desc,
      url,
      siteName: 'Iraq Stock Market — iraqsm.com',
      images:   [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${sym} – Iraq Stock Exchange` }],
      locale:   'ar_IQ',
      type:     'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${sym} — ${enName} | Iraq Stock Exchange`,
      description: desc,
      images:      ['/opengraph-image'],
    },
  }
}

const SECTORS: Record<string, { en: string; ar: string }> = {
  AGR:  { en: 'Agriculture',        ar: 'الزراعة' },
  BANK: { en: 'Banking',            ar: 'المصارف' },
  HTL:  { en: 'Hotels & Tourism',   ar: 'الفنادق والسياحة' },
  IND:  { en: 'Industry',           ar: 'الصناعة' },
  INS:  { en: 'Insurance',          ar: 'التأمين' },
  INV:  { en: 'Investment',         ar: 'الاستثمار' },
  SVC:  { en: 'Services',           ar: 'الخدمات' },
  TEL:  { en: 'Telecommunications', ar: 'الاتصالات' },
}

// Market cap is stored in millions of IQD.
function fmtMcap(v?: number): string {
  if (!v) return '—'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'T'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'B'
  return v.toLocaleString('en', { maximumFractionDigits: 0 }) + 'M'
}

export default function CompanyLayout({ children, params }: Props) {
  const sym     = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string; sec?: string; mcap?: number }[])
    .find(c => c.sym === sym)

  // Return a real HTTP 404 for unknown tickers (delisted, mistyped, etc.)
  // This prevents soft-404s (200 with empty content) which confuse Google.
  if (!company) notFound()

  const sector = SECTORS[company.sec ?? ''] ?? { en: 'the Iraqi market', ar: 'السوق العراقي' }
  const mcap   = fmtMcap(company.mcap)
  const hasMcap = !!company.mcap

  return (
    <>
      {/* Server-rendered H1 — visible to crawlers, visually hidden */}
      <h1 style={{
        position: 'absolute', width: 1, height: 1,
        overflow: 'hidden', clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
      }}>
        {company.en} ({sym}) — Iraq Stock Exchange Share Price | {company.ar} سعر السهم في سوق الاسهم العراقي
      </h1>
      {children}

      {/* Unique, server-rendered company profile — gives each /c/ page
          distinct crawlable content so Google indexes it instead of
          treating company pages as near-duplicate templates. */}
      <section
        aria-label="Company profile"
        style={{
          maxWidth: 760, margin: '0 auto', padding: '40px 20px 8px',
          borderTop: '1px solid var(--line, #1f2937)', lineHeight: 1.75,
          fontSize: 15, color: 'var(--ink3, #9ca3af)',
        }}
      >
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 14 }}>
          نبذة عن {company.ar} ({sym}) — About {company.en}
        </h2>

        <p dir="rtl" style={{ marginBottom: 14 }}>
          {company.ar} ({sym}) شركة مدرجة في سوق العراق للأوراق المالية (بورصة العراق – ISX)
          ضمن قطاع {sector.ar}{hasMcap ? `، برأس مال سوقي يبلغ نحو ${mcap} دينار عراقي` : ''}.
          تابع سعر سهم {company.ar} المباشر، المخططات التاريخية، حجم التداول، والقيمة السوقية
          على iraqsm.com. يتداول سهم {sym} بالدينار العراقي (IQD) في بورصة العراق.
        </p>

        <p style={{ marginBottom: 20 }}>
          {company.en} ({sym}) is a company listed on the Iraq Stock Exchange (ISX) in the {sector.en} sector
          {hasMcap ? `, with a market capitalization of approximately ${mcap} IQD` : ''}.
          Track {company.en}&apos;s live share price, historical price charts, trading volume, and market
          data on iraqsm.com. The {sym} stock trades in Iraqi Dinar (IQD) on the ISX.
        </p>

        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', marginBottom: 24 }}>
          <dt style={{ fontWeight: 700, color: 'var(--ink, #e5e7eb)' }}>Ticker / الرمز</dt>
          <dd style={{ margin: 0 }}>{sym}</dd>
          <dt style={{ fontWeight: 700, color: 'var(--ink, #e5e7eb)' }}>Sector / القطاع</dt>
          <dd style={{ margin: 0 }}>{sector.en} — {sector.ar}</dd>
          {hasMcap && <>
            <dt style={{ fontWeight: 700, color: 'var(--ink, #e5e7eb)' }}>Market cap / القيمة السوقية</dt>
            <dd style={{ margin: 0 }}>{mcap} IQD</dd>
          </>}
          <dt style={{ fontWeight: 700, color: 'var(--ink, #e5e7eb)' }}>Exchange / السوق</dt>
          <dd style={{ margin: 0 }}>Iraq Stock Exchange (ISX) — بورصة العراق</dd>
          <dt style={{ fontWeight: 700, color: 'var(--ink, #e5e7eb)' }}>Currency / العملة</dt>
          <dd style={{ margin: 0 }}>Iraqi Dinar (IQD) — الدينار العراقي</dd>
        </dl>

        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 12 }}>
          أسئلة شائعة — Frequently asked questions
        </h2>

        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink, #e5e7eb)', margin: '0 0 4px' }}>
          ما هو رمز سهم {company.ar}؟ What is {company.en}&apos;s ticker symbol?
        </h3>
        <p style={{ marginBottom: 14 }}>
          يتداول سهم {company.ar} تحت الرمز {sym} في بورصة العراق.
          {' '}{company.en} trades under the ticker {sym} on the Iraq Stock Exchange (ISX).
        </p>

        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink, #e5e7eb)', margin: '0 0 4px' }}>
          في أي قطاع تعمل {company.ar}؟ What sector is {company.en} in?
        </h3>
        <p style={{ marginBottom: 14 }}>
          تعمل {company.ar} ضمن قطاع {sector.ar} في السوق العراقي.
          {' '}{company.en} operates in the {sector.en} sector of the Iraqi market.
        </p>

        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink, #e5e7eb)', margin: '0 0 4px' }}>
          أين أتابع سعر سهم {sym}؟ Where can I track {sym}&apos;s share price?
        </h3>
        <p style={{ marginBottom: 4 }}>
          يمكنك متابعة سعر سهم {sym} المباشر، المخططات، وحجم التداول على iraqsm.com.
          {' '}You can track {sym}&apos;s live price, charts, and trading volume on iraqsm.com.
        </p>
      </section>
    </>
  )
}
