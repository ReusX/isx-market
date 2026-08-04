'use client'

import { useApp } from '@/context/AppContext'
import { COMPANY_PROFILES, type Profile } from '@/lib/companyProfiles'
import { arDate } from '@/lib/date'

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
  if (!v) return '·'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'T'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'B'
  return v.toLocaleString('en', { maximumFractionDigits: 0 }) + 'M'
}

interface Props {
  sym:   string
  en:    string
  ar:    string
  sec?:  string
  mcap?: number
  /**
   * Server-fetched last trade. Plain data, not the Quote type, so it stays
   * serializable across the server/client boundary.
   *
   * The whole point is to get a real number into the server-rendered HTML: the
   * price header above this section is client-fetched, so a crawler (and any
   * reader before JS runs) previously saw a page that asked "كم سعر سهم … اليوم؟"
   * and answered with a promise that the price exists somewhere.
   */
  quote?: { close: number; pct: number | null; date: string; suspended: boolean } | null
}

// Generated fallback for companies without curated copy yet.
function generated(isAr: boolean, props: Props): Profile {
  const sector  = SECTORS[props.sec ?? ''] ?? { en: 'the Iraqi market', ar: 'السوق العراقي' }
  const mcap    = fmtMcap(props.mcap)
  const hasMcap = !!props.mcap

  // 20 companies have no Arabic name on file · without this the generated copy
  // reads "سعر سهم  (BQUR)" with a hole where the name belongs.
  const p = {
    ...props,
    ar: props.ar?.trim() || props.en || props.sym,
    en: props.en?.trim() || props.ar || props.sym,
  }

  if (isAr) {
    return {
      about:
        `${p.ar} (${p.sym}) شركة مدرجة في سوق العراق للأوراق المالية (بورصة العراق – ISX) ضمن قطاع ${sector.ar}` +
        `${hasMcap ? `، برأس مال سوقي يبلغ نحو ${mcap} دينار عراقي` : ''}. ` +
        `تابع سعر سهم ${p.ar} المباشر، المخططات التاريخية، حجم التداول، والقيمة السوقية على iraqsm.com. ` +
        `يتداول سهم ${p.sym} بالدينار العراقي (IQD) في بورصة العراق.`,
      facts: [
        { label: 'الرمز',   value: p.sym },
        { label: 'القطاع',  value: sector.ar },
        ...(hasMcap ? [{ label: 'القيمة السوقية', value: `${mcap} IQD` }] : []),
        { label: 'السوق',   value: 'بورصة العراق (ISX)' },
        { label: 'العملة',  value: 'الدينار العراقي (IQD)' },
      ],
      faq: [
        { q: `كم سعر سهم ${p.ar} اليوم؟`, a: `تابع سعر سهم ${p.ar} (${p.sym}) المباشر اليوم في بورصة العراق على iraqsm.com، مع الرسم البياني والأعلى والأدنى وحجم التداول.` },
        { q: `ما هو رمز سهم ${p.ar}؟`, a: `يتداول سهم ${p.ar} تحت الرمز ${p.sym} في بورصة العراق.` },
        { q: `في أي قطاع تعمل ${p.ar}؟`, a: `تعمل ${p.ar} ضمن قطاع ${sector.ar} في السوق العراقي.` },
        { q: `أين أتابع سعر سهم ${p.sym}؟`, a: `يمكنك متابعة سعر سهم ${p.sym} المباشر، المخططات، وحجم التداول على iraqsm.com.` },
      ],
    }
  }

  return {
    about:
      `${p.en} (${p.sym}) is a company listed on the Iraq Stock Exchange (ISX) in the ${sector.en} sector` +
      `${hasMcap ? `, with a market capitalization of approximately ${mcap} IQD` : ''}. ` +
      `Track ${p.en}'s live share price, historical price charts, trading volume, and market data on iraqsm.com. ` +
      `The ${p.sym} stock trades in Iraqi Dinar (IQD) on the ISX.`,
    facts: [
      { label: 'Ticker',   value: p.sym },
      { label: 'Sector',   value: sector.en },
      ...(hasMcap ? [{ label: 'Market cap', value: `${mcap} IQD` }] : []),
      { label: 'Exchange', value: 'Iraq Stock Exchange (ISX)' },
      { label: 'Currency', value: 'Iraqi Dinar (IQD)' },
    ],
    faq: [
      { q: `What is ${p.en}'s share price today?`, a: `Track ${p.en} (${p.sym}) live share price today on the Iraq Stock Exchange (ISX) at iraqsm.com, with charts, highs/lows, and trading volume.` },
      { q: `What is ${p.en}'s ticker symbol?`, a: `${p.en} trades under the ticker ${p.sym} on the Iraq Stock Exchange (ISX).` },
      { q: `What sector is ${p.en} in?`, a: `${p.en} operates in the ${sector.en} sector of the Iraqi market.` },
      { q: `Where can I track ${p.sym}'s share price?`, a: `You can track ${p.sym}'s live price, charts, and trading volume on iraqsm.com.` },
    ],
  }
}

/** "16.06 IQD, up 1.89%" · direction as a word, never a sign — see lib/quote. */
function priceText(q: NonNullable<Props['quote']>, isAr: boolean): string {
  const n = q.close.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const price = isAr ? `${n} دينار عراقي` : `${n} IQD`
  if (q.pct == null || Math.abs(q.pct) < 0.005) return price
  const dir = isAr ? (q.pct > 0 ? 'بارتفاع' : 'بانخفاض') : (q.pct > 0 ? 'up' : 'down')
  return `${price}${isAr ? '، ' : ', '}${dir} ${Math.abs(q.pct).toFixed(2)}%`
}

export default function CompanyProfile(props: Props) {
  const { lang } = useApp()
  const isAr = lang === 'ar'

  const curated = COMPANY_PROFILES[props.sym]?.[isAr ? 'ar' : 'en']
  const base    = curated ?? generated(isAr, props)
  // 20 companies have no Arabic name on file · fall back rather than render a
  // gap where the company name should be. See lib/companySeo.ts.
  const name    = (isAr ? props.ar?.trim() || props.en : props.en?.trim() || props.ar) || props.sym

  /*
   * Fold the live price into the facts and into the price FAQ answer.
   *
   * Applied here rather than inside `generated()` so curated profiles get the
   * number too, and the vague existing answer is dropped rather than left to
   * sit next to the real one saying something weaker.
   *
   * Suspended listings are skipped: their last close is years old, and this
   * copy is framed as "today".
   */
  const q = props.quote && !props.quote.suspended ? props.quote : null
  const p = q
    ? {
        ...base,
        facts: [
          { label: isAr ? 'آخر سعر' : 'Last price', value: priceText(q, isAr) },
          ...base.facts,
        ],
        faq: [
          {
            q: isAr ? `كم سعر سهم ${name} اليوم؟` : `What is ${name}'s share price today?`,
            a: isAr
              ? `سعر سهم ${name} (${props.sym}) في آخر جلسة تداول هو ${priceText(q, isAr)}، ` +
                `بحسب نشرة بورصة العراق ليوم ${arDate(q.date)}.`
              : `${name} (${props.sym}) last traded at ${priceText(q, isAr)} on the Iraq Stock ` +
                `Exchange, per the official ISX bulletin of ${q.date}.`,
          },
          // Drop whatever vague price question the profile already had.
          ...base.faq.filter(qa =>
            isAr ? !(qa.q.includes('سعر') && qa.q.includes('اليوم'))
                 : !/share price today/i.test(qa.q)),
        ],
      }
    : base
  const heading = isAr ? `نبذة عن ${name} (${props.sym})` : `About ${name} (${props.sym})`
  const factsHd = isAr ? 'معلومات أساسية' : 'Key facts'
  const faqHd   = isAr ? 'أسئلة شائعة' : 'Frequently asked questions'

  return (
    <section
      aria-label={isAr ? 'نبذة عن الشركة' : 'Company profile'}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        maxWidth: 760, margin: '0 auto', padding: '40px 20px 8px',
        borderTop: '1px solid var(--line, #1f2937)', lineHeight: 1.75,
        fontSize: 15, color: 'var(--ink3, #9ca3af)',
        textAlign: isAr ? 'right' : 'left',
      }}
    >
      <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 14 }}>
        {heading}
      </h2>

      <p style={{ marginBottom: 22 }}>{p.about}</p>

      <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink, #e5e7eb)', margin: '0 0 8px' }}>{factsHd}</h3>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', marginBottom: 26 }}>
        {p.facts.map(f => (
          <div key={f.label} style={{ display: 'contents' }}>
            <dt style={{ fontWeight: 700, color: 'var(--ink, #e5e7eb)' }}>{f.label}</dt>
            <dd style={{ margin: 0 }}>{f.value}</dd>
          </div>
        ))}
      </dl>

      <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 12 }}>{faqHd}</h2>
      {p.faq.map(qa => (
        <div key={qa.q} style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink, #e5e7eb)', margin: '0 0 4px' }}>{qa.q}</h3>
          <p style={{ margin: 0 }}>{qa.a}</p>
        </div>
      ))}
    </section>
  )
}
