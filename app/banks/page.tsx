import Link from 'next/link'
import type { Metadata } from 'next'
import companiesData from '@/public/data/companies.json'

type Company = { sym: string; ar: string; en: string; sec?: string; color?: string; logo?: string }

// Major non-listed Iraqi banks worth mentioning for SEO
const NON_LISTED = [
  {
    ar: 'مصرف الرافدين',
    en: 'Rafidain Bank',
    type: 'حكومي',
    desc: 'أكبر مصرف حكومي في العراق، تأسس عام 1941. يقدم خدمات مصرفية شاملة للأفراد والشركات والجهات الحكومية عبر مئات الفروع في جميع المحافظات. يقدم قروضاً حتى 25 مليون دينار.',
  },
  {
    ar: 'مصرف الرشيد',
    en: 'Rasheed Bank',
    type: 'حكومي',
    desc: 'مصرف حكومي عراقي تأسس عام 1988، يمتلك شبكة واسعة من الفروع. يقدم خدمات الادخار والقروض وتمويل المشاريع الصغيرة والمتوسطة.',
  },
  {
    ar: 'البنك المركزي العراقي',
    en: 'Central Bank of Iraq',
    type: 'مركزي',
    desc: 'يتولى الإشراف على السياسة النقدية، وتنظيم القطاع المصرفي، وتحديد سعر صرف الدولار مقابل الدينار العراقي. تأسس عام 1947.',
  },
]

export default function BanksPage() {
  const listed = (companiesData as Company[]).filter(c => c.sec === 'BANK')

  // Split Islamic vs conventional
  const islamic = listed.filter(c => c.ar.includes('الاسلامي') || c.ar.includes('الإسلامي') || c.en?.toLowerCase().includes('islamic'))
  const conventional = listed.filter(c => !islamic.includes(c))

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 80px' }}>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
        المصارف العراقية
      </h1>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 32 }}>
        {listed.length} مصرفاً مدرجاً في بورصة العراق للأوراق المالية (ISX) · اضغط على أي مصرف لعرض سعر سهمه ومخططاته.
      </p>

      {/* Non-listed major banks */}
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
        المصارف الحكومية الكبرى
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 32 }}>
        {NON_LISTED.map(b => (
          <div key={b.ar} style={{
            background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{b.ar}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: 'rgba(59,130,246,0.15)', color: '#60A5FA',
              }}>{b.type}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>{b.en}</div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
          </div>
        ))}
      </div>

      {/* Listed conventional banks */}
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
        المصارف التجارية المدرجة في البورصة ({conventional.length})
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
        {conventional.map(b => (
          <BankChip key={b.sym} bank={b} />
        ))}
      </div>

      {/* Listed Islamic banks */}
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
        المصارف الإسلامية المدرجة في البورصة ({islamic.length})
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
        {islamic.map(b => (
          <BankChip key={b.sym} bank={b} />
        ))}
      </div>

      {/* SEO info block */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '20px', fontSize: 14, lineHeight: 1.8, color: 'var(--ink2)',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
          القطاع المصرفي في بورصة العراق
        </h2>
        <p style={{ marginBottom: 10 }}>
          يُمثّل القطاع المصرفي الشريحة الأكبر من الشركات المدرجة في <strong>بورصة العراق للأوراق المالية (ISX)</strong>،
          بواقع {listed.length} مصرفاً تجارياً وإسلامياً. يشمل هذا القطاع مصارف استثمارية خاصة، ومصارف إسلامية تعمل وفق أحكام الشريعة الإسلامية.
        </p>
        <p style={{ marginBottom: 10 }}>
          يخضع القطاع المصرفي العراقي لرقابة <strong>البنك المركزي العراقي</strong>، الذي يُصدر تعليمات رأس المال والسيولة،
          ويُحدد سعر صرف الدينار العراقي مقابل الدولار الأمريكي في المزاد اليومي.
        </p>
        <p>
          تشمل قائمة أبرز المصارف المدرجة: <strong>مصرف بغداد (BBOB)</strong>، <strong>المصرف الأهلي العراقي (BNOI)</strong>،
          <strong> مصرف المنصور للاستثمار (BMNS)</strong>، و<strong>مصرف التنمية الدولي (BIDB)</strong>.
          اضغط على أي رمز لعرض سعر السهم والمخطط التاريخي.
        </p>
      </div>
    </div>
  )
}

function BankChip({ bank }: { bank: Company }) {
  return (
    <Link
      href={`/c/${bank.sym}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', borderRadius: 8,
        background: 'var(--surf)', border: '1px solid var(--line)',
        fontSize: 13, color: 'var(--ink2)', fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: bank.color ?? '#3B82F6', flexShrink: 0,
      }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink4)' }}>{bank.sym}</span>
      <span>{bank.ar || bank.en}</span>
    </Link>
  )
}
