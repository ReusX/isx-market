/**
 * The company profile — the unique prose, facts and questions each
 * /c/[sym] page carries under its numbers.
 *
 * Forty-one companies have hand-written copy in `lib/companyProfiles`; the
 * rest get a generated profile from their typed fields, so every company
 * page has a paragraph that is about THAT company. The last close is
 * folded into the facts and into the price question, so the answer to
 * «كم سعر سهم … اليوم» is a number and a session, not a promise.
 *
 * Pure: the old `components/company/CompanyProfile` did this inside a
 * component; the page now calls this and renders the result.
 */
import { COMPANY_PROFILES, type Profile } from '@/lib/companyProfiles'
import { arDate } from '@/lib/date'

export interface ProfileInput {
  sym: string
  ar: string
  en: string
  /** Sector name in each language, already resolved. */
  sectorAr: string
  sectorEn: string
  /** Market cap in IQD, if known. */
  mcapIqd: number | null
  quote: { close: number; pct: number | null; date: string; suspended: boolean } | null
}

function fmtMcap(v: number | null): string {
  if (!v) return '·'
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  return `${(v / 1e6).toLocaleString('en', { maximumFractionDigits: 0 })}M`
}

function generated(isAr: boolean, p: ProfileInput): Profile {
  const sector = isAr ? p.sectorAr || 'السوق العراقي' : p.sectorEn || 'the Iraqi market'
  const mcap = fmtMcap(p.mcapIqd)
  const hasMcap = !!p.mcapIqd
  const ar = p.ar?.trim() || p.en || p.sym
  const en = p.en?.trim() || p.ar || p.sym
  if (isAr) {
    return {
      about:
        `${ar} (${p.sym}) شركة مدرجة في سوق العراق للأوراق المالية (بورصة العراق – ISX) ضمن قطاع ${sector}` +
        `${hasMcap ? `، برأس مال سوقي يبلغ نحو ${mcap} دينار عراقي` : ''}. ` +
        `تابع سعر سهم ${ar} بعد كل جلسة، والمخططات التاريخية، وحجم التداول، والقيمة السوقية على iraqsm.com. ` +
        `يتداول سهم ${p.sym} بالدينار العراقي (IQD) في بورصة العراق.`,
      facts: [
        { label: 'الرمز', value: p.sym },
        { label: 'القطاع', value: sector },
        ...(hasMcap ? [{ label: 'القيمة السوقية', value: `${mcap} IQD` }] : []),
        { label: 'السوق', value: 'بورصة العراق (ISX)' },
        { label: 'العملة', value: 'الدينار العراقي (IQD)' },
      ],
      faq: [
        { q: `كم سعر سهم ${ar} اليوم؟`, a: `يعرض iraqsm.com سعر إغلاق سهم ${ar} (${p.sym}) في آخر جلسة تداول في بورصة العراق، مع الرسم البياني والأعلى والأدنى وحجم التداول.` },
        { q: `ما هو رمز سهم ${ar}؟`, a: `يتداول سهم ${ar} تحت الرمز ${p.sym} في بورصة العراق.` },
        { q: `في أي قطاع تعمل ${ar}؟`, a: `تعمل ${ar} ضمن قطاع ${sector} في السوق العراقي.` },
        { q: `أين أتابع سعر سهم ${p.sym}؟`, a: `يمكنك متابعة سعر سهم ${p.sym}، والمخططات، وحجم التداول على iraqsm.com، محدّثة بعد كل جلسة.` },
      ],
    }
  }
  return {
    about:
      `${en} (${p.sym}) is a company listed on the Iraq Stock Exchange (ISX) in the ${sector} sector` +
      `${hasMcap ? `, with a market capitalization of approximately ${mcap} IQD` : ''}. ` +
      `Track ${en}'s share price after each session, along with historical charts, trading volume and market data, on iraqsm.com. ` +
      `The ${p.sym} stock trades in Iraqi Dinar (IQD) on the ISX.`,
    facts: [
      { label: 'Ticker', value: p.sym },
      { label: 'Sector', value: sector },
      ...(hasMcap ? [{ label: 'Market cap', value: `${mcap} IQD` }] : []),
      { label: 'Exchange', value: 'Iraq Stock Exchange (ISX)' },
      { label: 'Currency', value: 'Iraqi Dinar (IQD)' },
    ],
    faq: [
      { q: `What is ${en}'s share price today?`, a: `iraqsm.com shows ${en}'s (${p.sym}) closing price from the latest Iraq Stock Exchange session, with charts, highs and lows, and trading volume.` },
      { q: `What is ${en}'s ticker symbol?`, a: `${en} trades under the ticker ${p.sym} on the Iraq Stock Exchange (ISX).` },
      { q: `What sector is ${en} in?`, a: `${en} operates in the ${sector} sector of the Iraqi market.` },
      { q: `Where can I track ${p.sym}'s share price?`, a: `You can follow ${p.sym}'s price, charts and trading volume on iraqsm.com, updated after each session.` },
    ],
  }
}

/** «16.06 دينار عراقي، بارتفاع 1.89%» · direction as a word, never a sign. */
function priceText(q: NonNullable<ProfileInput['quote']>, isAr: boolean): string {
  const n = q.close.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const price = isAr ? `${n} دينار عراقي` : `${n} IQD`
  if (q.pct == null || Math.abs(q.pct) < 0.005) return price
  const dir = isAr ? (q.pct > 0 ? 'بارتفاع' : 'بانخفاض') : (q.pct > 0 ? 'up' : 'down')
  return `${price}${isAr ? '، ' : ', '}${dir} ${Math.abs(q.pct).toFixed(2)}%`
}

export function buildCompanyProfile(p: ProfileInput, locale: 'ar' | 'en'): Profile & { heading: string } {
  const isAr = locale === 'ar'
  const curated = COMPANY_PROFILES[p.sym]?.[isAr ? 'ar' : 'en']
  const base = curated ?? generated(isAr, p)
  const name = (isAr ? p.ar?.trim() || p.en : p.en?.trim() || p.ar) || p.sym
  /* Suspended listings are skipped: their last close is years old, and this
     copy is framed as "today". */
  const q = p.quote && !p.quote.suspended ? p.quote : null
  const out: Profile = q
    ? {
        ...base,
        facts: [{ label: isAr ? 'آخر سعر' : 'Last price', value: priceText(q, isAr) }, ...base.facts],
        faq: [
          {
            q: isAr ? `كم سعر سهم ${name} اليوم؟` : `What is ${name}'s share price today?`,
            a: isAr
              ? `سعر سهم ${name} (${p.sym}) في آخر جلسة تداول هو ${priceText(q, isAr)}، بحسب نشرة بورصة العراق ليوم ${arDate(q.date)}.`
              : `${name} (${p.sym}) last traded at ${priceText(q, isAr)} on the Iraq Stock Exchange, per the official ISX bulletin of ${q.date}.`,
          },
          ...base.faq.filter((qa) => (isAr ? !(qa.q.includes('سعر') && qa.q.includes('اليوم')) : !/share price today/i.test(qa.q))),
        ],
      }
    : base
  return { ...out, heading: isAr ? `نبذة عن ${name} (${p.sym})` : `About ${name} (${p.sym})` }
}
