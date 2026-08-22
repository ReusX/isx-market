import { cache } from 'react'
import { fetchFx, type FxData } from '@/lib/rates'

/**
 * Request-scoped memo around `fetchFx`.
 *
 * The dollar rate is now needed in three places on this route — generateMetadata,
 * the layout (for the FAQ figures) and the page body. `fetchFx` is not one
 * request: it discovers the day's Alsumaria article, fetches it, and falls back
 * through r.jina.ai if the direct read fails, each hop with its own timeout. Run
 * three times per render that turned a ~90s production build into one that had
 * not finished after ten minutes.
 *
 * React's `cache` collapses them to a single execution per render pass. Always
 * call `getFx` on this route, never `fetchFx` directly.
 */
export const getFx = cache(fetchFx)

/**
 * The dollar page's copy — built from the live rate, in one place.
 *
 * Two problems this fixes.
 *
 * First, the numbers were typed by hand into the prose ("نحو 1320 ديناراً",
 * "132,000 دينار"). They happen to be right, but nothing recomputes them and
 * nothing warns when they stop being right — on a page whose entire purpose is
 * to state the current rate, that is a correctness risk sitting in published
 * copy.
 *
 * Second, the FAQ existed twice: once as visible text, once inside the FAQPage
 * JSON-LD. The two had already drifted apart in wording. Structured data that
 * disagrees with the page it describes is worse than no structured data, so
 * both now render from `buildFxFaq`.
 */

/* Defined in lib/fxOfficial.ts — a leaf module, so a client component can read
   the constant without dragging this file's server-only imports with it. */
export { CBI_OFFICIAL_RATE, CBI_RATE_CONFIRMED } from '@/lib/fxOfficial'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'

const ar = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

/** Market (parallel) rate to quote · the sell side is the price people pay. */
export function marketRate(fx: FxData | null): number | null {
  return fx?.sell ?? fx?.buy ?? null
}

/**
 * "1,525 ديناراً في السوق الموازية و1,320 ديناراً رسمياً" · the one-line answer
 * to "كم سعر الدولار اليوم", used in the meta description and the hero copy.
 */
export function describeFxRate(fx: FxData | null): string | null {
  const market = marketRate(fx)
  if (!market) return null
  return `${ar(market)} ديناراً في السوق الموازية و${ar(CBI_OFFICIAL_RATE)} ديناراً رسمياً`
}

export interface FxQa { q: string; a: string }

/**
 * Every FAQ entry, with live figures. Order matters — the first answers the
 * headline query, and the parallel-market question follows it because that is
 * the rate Iraqis actually transact at and search for by name.
 */
export function buildFxFaq(fx: FxData | null): FxQa[] {
  const market = marketRate(fx)
  const official = CBI_OFFICIAL_RATE
  const hundredOfficial = ar(official * 100)
  const hundredMarket = market ? ar(market * 100) : null

  const rateLine = market
    ? `يبلغ سعر الدولار في السوق الموازية اليوم نحو ${ar(market)} ديناراً عراقياً، مقابل ${ar(official)} ديناراً هو السعر الرسمي للبنك المركزي العراقي.`
    : `يُحدَّد سعر الدولار بسعرين: السعر الرسمي للبنك المركزي العراقي (${ar(official)} ديناراً لكل دولار)، وسعر السوق الموازية الذي يكون عادة أعلى.`

  return [
    {
      q: 'كم سعر الدولار اليوم في العراق؟',
      a: `${rateLine} تابع السعر المحدّث ومحوّل العملات أعلى الصفحة.`,
    },
    {
      q: 'كم سعر الدولار في السوق الموازي اليوم؟',
      a: market
        ? `سعر الدولار في السوق الموازي (السوق الحرة) اليوم نحو ${ar(market)} ديناراً عراقياً لكل دولار. ` +
          `وهو السعر المتداول فعلياً في محال الصرافة وأسواق العملة في بغداد وبقية المحافظات، ` +
          `ويختلف عن السعر الرسمي البالغ ${ar(official)} ديناراً لأن الطلب على الدولار خارج القنوات الرسمية ` +
          `يفوق ما يوفّره مزاد العملة، فيتحدد السعر بالعرض والطلب.`
        : `سعر السوق الموازي (السوق الحرة) هو السعر المتداول فعلياً في محال الصرافة وأسواق العملة، ` +
          `ويكون عادة أعلى من السعر الرسمي البالغ ${ar(official)} ديناراً لأن الطلب خارج القنوات الرسمية ` +
          `يفوق ما يوفّره مزاد العملة.`,
    },
    {
      q: 'ما الفرق بين سعر الدولار الرسمي والموازي؟',
      a: `السعر الرسمي (${ar(official)} ديناراً) يحدده البنك المركزي العراقي ويُستخدم في مزاد العملة ` +
         `والمعاملات الحكومية والمصرفية والاستيراد الرسمي. أما سعر السوق الموازية فهو سعر التداول الفعلي ` +
         `بين الصيارفة والأفراد، والفارق بينهما هو ما يُعرف بفجوة سعر الصرف.`,
    },
    {
      q: 'كم سعر 100 دولار بالدينار العراقي اليوم؟',
      a: hundredMarket
        ? `100 دولار تساوي نحو ${hundredMarket} ديناراً عراقياً بسعر السوق الموازية، ` +
          `و${hundredOfficial} ديناراً بالسعر الرسمي. استخدم المحوّل أعلاه لحساب أي مبلغ آخر.`
        : `100 دولار تساوي ${hundredOfficial} ديناراً عراقياً بالسعر الرسمي. استخدم المحوّل أعلاه لحساب أي مبلغ.`,
    },
    {
      q: 'لماذا يختلف سعر الدولار بين محال الصرافة؟',
      a: `يتغيّر سعر السوق الموازية خلال اليوم وبين محافظة وأخرى تبعاً للعرض والطلب المحلي، ` +
         `وللفارق بين سعر الشراء وسعر البيع لدى كل صيرفة. السعر المعروض هنا هو سعر الإغلاق ` +
         `المنشور لسوق بغداد، ويصلح كمرجع لا كسعر تنفيذ.`,
    },
    {
      q: 'How much is the US Dollar to Iraqi Dinar today?',
      a: market
        ? `The US Dollar trades at about ${ar(market)} IQD on the parallel (market) rate, against the ` +
          `official Central Bank of Iraq rate of ${ar(official)} IQD. Use the live converter at iraqsm.com/fx.`
        : `The US Dollar has two rates in Iraq: the official Central Bank rate of ${ar(official)} IQD, and the ` +
          `parallel market rate, which is usually higher. Use the live converter at iraqsm.com/fx.`,
    },
  ]
}
