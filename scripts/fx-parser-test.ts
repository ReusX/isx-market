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
import { parseAlsumaria, pickDollarArticle, parseKifahChannel, pickKifahQuote } from '../lib/rates'

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

/* ── The Kifah Telegram channel (primary source since 28 September 2026) ──
   Both post layouts the channel has used, as the public preview serves them. */
const tgPost = (id: number, at: string, html: string) =>
  `<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message" data-post="borsat_alkfah/${id}">` +
  `<div class="tgme_widget_message_text js-message_text" dir="auto">${html}</div>` +
  `<a class="tgme_widget_message_date"><time datetime="${at}" class="time">3:30</time></a></div></div>`
const now = Date.parse('2026-09-28T09:00:00+00:00')
{
  const page =
    // 27 Sep: label and prices on one line
    tgPost(101, '2026-09-27T12:30:24+00:00', '🔒 كفاح 🟢 مطلوب: 1558.50 🔴 معروض: 1559.00') +
    tgPost(102, '2026-09-27T12:30:30+00:00', 'أربيل 🟢 مطلوب: 1561.00 🔴 معروض: 1561.50') +
    // 28 Sep: label on its own line
    tgPost(103, '2026-09-28T07:40:00+00:00', '<b>🔹 كفاح</b><br/><b>• مطلوب: 1560.00</b><br/><b>• معروض: 1560.50</b>') +
    tgPost(104, '2026-09-28T07:41:00+00:00', '<b>🔹 دهوك</b><br/><b>• مطلوب: 1559.00</b><br/><b>• معروض: 1559.50</b>') +
    tgPost(105, '2026-09-28T07:42:00+00:00', 'واكو جوائز للمشتركين داخل التطبيق')
  const q = parseKifahChannel(page)
  const kinds = q.map((x) => x.market).join(',')
  if (kinds !== 'kifah,erbil,kifah,duhok') bad.push(`kifah: parsed markets ${kinds}, expected kifah,erbil,kifah,duhok`)
  const pick = pickKifahQuote(q, now)
  if (pick?.ask !== 1560.5 || pick?.bid !== 1560) bad.push(`kifah: picked ${pick?.bid}/${pick?.ask}, expected the 28 Sep 1560/1560.5`)
  // a slipped digit on the newest post is skipped, not published
  const typo = parseKifahChannel(page + tgPost(106, '2026-09-28T08:00:00+00:00', '🔒 كفاح 🟢 مطلوب: 1650.00 🔴 معروض: 1650.50'))
  if (pickKifahQuote(typo, now)?.ask !== 1560.5) bad.push('kifah: a 6% jump on the newest post was not skipped')
  // a channel silent for more than four days yields nothing → Alsumaria takes over
  if (pickKifahQuote(q, Date.parse('2026-10-05T09:00:00+00:00')) !== null) bad.push('kifah: a week-old quote was still used')
  // bid above ask is not a quote
  if (parseKifahChannel(tgPost(107, '2026-09-28T08:00:00+00:00', 'كفاح مطلوب: 1561 معروض: 1560')).length) bad.push('kifah: accepted bid > ask')
  // 30 Sep layout: «عروض» without the م
  const noMeem = parseKifahChannel(tgPost(108, '2026-09-30T12:08:00+00:00', '🔴 كفاح 🔹 مطلوب: 1569.00 عروض: 1569.50'))
  if (noMeem.length !== 1 || noMeem[0].market !== 'kifah' || noMeem[0].ask !== 1569.5) bad.push('kifah: missed the «عروض» spelling')
  /* 1 October: «🔹 كفاح / 🟢 سعر الطلب: 157,100 / 🔴 سعر العرض: 157,100» per 100
     dollars, «🕌 الموصل / 🔻 طلب: 157,150 / 🔺 عرض: 157,350», and per-one
     «🌴 البصرة / 🔻 طلب: 1570.00 / 🔺 عرض: 1570.00» — the rate froze on
     Alsumaria until these matched. */
  const oct = parseKifahChannel(
    tgPost(201, '2026-10-01T10:29:37+00:00', '🔹 كفاح<br>🟢 سعر الطلب: 157,100<br>🔴 سعر العرض: 157,100')
    + tgPost(202, '2026-10-01T09:09:00+00:00', '🕌 الموصل<br>🔻 طلب: 157,150<br>🔺 عرض: 157,350')
    + tgPost(203, '2026-10-01T09:09:00+00:00', '🌴 البصرة<br>🔻 طلب: 1570.00<br>🔺 عرض: 1570.00')
    + tgPost(204, '2026-10-01T10:29:00+00:00', '🔹 سموأل<br>🟢 سعر الطلب: 157,200.<br>🔴 سعر العرض: 157,200')
    + tgPost(205, '2026-10-01T10:29:59+00:00', '📍 صلاح الدين<br>🟢 سعر الطلب: 156,950<br>🔴 سعر العرض: 157,200'))
  const got = Object.fromEntries(oct.map((x) => [x.market, `${x.bid}/${x.ask}`]))
  const want = { kifah: '1571/1571', mosul: '1571.5/1573.5', basra: '1570/1570', samawal: '1572/1572', salahuddin: '1569.5/1572' }
  if (JSON.stringify(got, Object.keys(want)) !== JSON.stringify(want)) bad.push(`kifah: October formats parsed as ${JSON.stringify(got)}`)
}

if (bad.length) {
  console.error(`✗ fx parser: ${bad.length} failure(s)`)
  bad.forEach(b => console.error('  ·', b))
  process.exit(1)
}
console.log(`✓ fx parser: ${HEADLINES.length} headline shapes + ${BODIES.length} body shapes + the spread guard + 5 Kifah channel checks`)
