/**
 * Fixture test for the Alsumaria dollar-rate reader.
 *
 *   npx tsx scripts/fx-parser-test.ts
 *
 * On 28 August 2026 /fx was serving a rate two days old while the source had
 * published a newer one, and nothing anywhere said so. Three things had to be
 * wrong at once, and each failed silently:
 *
 *   1. the headline filter wanted the NOUN «ارتفاع» and a hamza'd «أسعار»;
 *      that day's headline used the verb «يرتفع» and wrote «الاسعار» plain, so
 *      the newest article was skipped and an older one picked instead;
 *   2. the price tail matched «مقابل 100 دولار» but not «مقابل كل 100 دولار»;
 *   3. the sell price carried no «البيع» label at all — the sentence read
 *      «وبلغت اسعار صرف الدولار … 155000 دينار».
 *
 * Alsumaria is a newsroom, not an API: its wording will drift again. These
 * fixtures are the real published sentences, so the next drift breaks a test
 * here instead of quietly freezing the page.
 */
import { parseAlsumaria, pickDollarArticle } from '../lib/rates'

const HEADLINES = [
  // slug, should be picked
  ['/news/economy/574263/الدولار-يرتفع-من-جديد-الاسعار-تعود-الى-سابق-عهدها', true, 'verb form + plain alef (the one that was skipped)'],
  ['/news/economy/574185/مع-إغلاق-التداولات-سعر-جديد-للدولار-في-العراق', true, 'noun form with hamza'],
  ['/news/economy/574000/ارتفاع-اسعار-الذهب-في-الاسواق-العراقية', false, 'gold, not the dollar'],
  ['/news/economy/574001/اسعار-النفط-ترتفع-عالميا-والدولار-يتراجع', false, 'oil story, excluded'],
  ['/news/economy/574002/مباحثات-اقتصادية-بين-العراق-والاردن', false, 'not about the dollar'],
  /* 1 September 2026: the picker chose this, because the slug carries both
     «دولارا» and «أسعار». Brent crude at $97 a BARREL is not an exchange
     rate. No wrong figure reached the page — the body had no buy/sell pair —
     but the job spent the day on the wrong story and recorded nothing. */
  ['/news/economy/574801/أسعار-خام-برنت-تكسر-حاجز-الـ97-دولارا-للمرة-الأولى-منذ-تموز', false, 'Brent crude priced in dollars, not a rate'],
  ['/news/economy/574700/524-مليون-دولار-فاتورة-البطاطا-العراقية-الاستيراد-يكشف-فجوة-الإنتاج', false, 'a sum of money, not a rate'],
  ['/news/economy/574812/ارتفاع-يطرأ-على-الدولار-الأسعار-تلامس-الـ155-الفا', true, 'real rate story from the sitemap'],
  ['/news/economy/574644/لا-تغير-في-الدولار-اليكم-الأسعار', true, 'no-change wording still a rate story'],
] as const

const BODIES = [
  [
    'unlabelled sell + «مقابل كل» (27 August)',
    'وبلغت اسعار صرف الدولار في محال الصيرفة بالأسواق المحلية 155000 دينار مقابل كل 100 دولار. بينما سجل سعر الشراء 154000 دينار.',
    { sell: 1550, buy: 1540 },
  ],
  [
    'both labelled, per 100 (26 August shape)',
    'سجل سعر البيع 154500 دينار مقابل 100 دولار، فيما بلغ سعر الشراء 153500 دينار مقابل 100 دولار.',
    { sell: 1545, buy: 1535 },
  ],
  [
    'bare per-one figures',
    'بلغ سعر البيع 1545 ديناراً، وسعر الشراء 1535 ديناراً.',
    { sell: 1545, buy: 1535 },
  ],
] as const

const bad: string[] = []

for (const [slug, want, why] of HEADLINES) {
  const got = pickDollarArticle(`https://www.alsumaria.tv${encodeURI(slug)}`) !== null
  if (got !== want) bad.push(`headline filter — ${why}: expected ${want ? 'PICK' : 'skip'}, got ${got ? 'PICK' : 'skip'}`)
}

for (const [why, body, want] of BODIES) {
  const fx = parseAlsumaria(body, 'https://example.test/a')
  if (!fx) { bad.push(`body — ${why}: parsed nothing`); continue }
  if (fx.sell !== want.sell) bad.push(`body — ${why}: sell ${fx.sell}, expected ${want.sell}`)
  if (fx.buy !== want.buy) bad.push(`body — ${why}: buy ${fx.buy}, expected ${want.buy}`)
}

/* The spread guard: an unlabelled figure BELOW the buy price is not a sell
   price, and must not be promoted into one. */
{
  const fx = parseAlsumaria('وبلغت اسعار صرف الدولار 150000 دينار مقابل كل 100 دولار. بينما سجل سعر الشراء 154000 دينار.', 'https://example.test/b')
  if (fx?.sell != null) bad.push(`spread guard: promoted ${fx.sell} to sell although it is below the buy price`)
}

if (bad.length) {
  console.error(`✗ fx parser: ${bad.length} failure(s)`)
  bad.forEach(b => console.error('  ·', b))
  process.exit(1)
}
console.log(`✓ fx parser: ${HEADLINES.length} headline shapes + ${BODIES.length} body shapes + the spread guard`)
