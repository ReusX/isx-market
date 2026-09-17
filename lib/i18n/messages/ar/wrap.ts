/**
 * The daily session wrap — every sentence the page can say, as functions of
 * the day's figures. Several variants per fact so consecutive days do not
 * read as one template; `pick` chooses by the date so a page is stable
 * across renders. Numbers arrive pre-formatted (Latin digits, units
 * already chosen) — this file decides only the words.
 */
type Dir = 'up' | 'down' | 'flat'
type V = {
  day: string          // «الأربعاء 16 سبتمبر 2026»
  dateShort: string    // «16 سبتمبر 2026»
  close: string; prevClose: string; pts: string; pct: string
  dir: Dir
  isx15: string | null
  weekPct: string | null; weekDir: Dir | null
  ytdPct: string | null; ytdDir: Dir | null
  nearHigh: boolean; nearLow: boolean; high52: string | null; low52: string | null
  up: string; down: string; flat: string; traded: string; listed: string
  value: string; trades: string; volume: string
  valueVsAvg: string | null; valueAbove: boolean | null
  gainers: { name: string; pct: string; close: string }[]
  losers: { name: string; pct: string; close: string }[]
  active: { name: string; value: string }[]
  foreign: { net: string; netDir: Dir; buy: string; sell: string; bought: string[]; sold: string[] } | null
}
const pick = <T,>(arr: T[], seed: string) => arr[Array.from(seed).reduce((t, c) => t + c.charCodeAt(0), 0) % arr.length]
const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join('، ')} و${xs[xs.length - 1]}`

export const wrap = {
  eyebrow: 'ملخص الجلسة',
  h1: (day: string) => `ملخص جلسة بورصة العراق · ${day}`,
  seoTitle: (dateShort: string, close: string, pct: string, dir: Dir) =>
    `بورصة العراق اليوم · ملخص جلسة ${dateShort}: المؤشر ${close} (${dir === 'up' ? '+' : dir === 'down' ? '−' : ''}${pct}%)`,
  seoDescription: (v: V) =>
    `أغلق مؤشر ISX60 جلسة ${v.dateShort} على ${v.close} نقطة ${v.dir === 'up' ? 'مرتفعاً' : v.dir === 'down' ? 'متراجعاً' : 'مستقراً'}${v.dir === 'flat' ? '' : ` ${v.pct}%`}. ${v.up} شركة صاعدة و${v.down} هابطة، قيمة التداول ${v.value} دينار عبر ${v.trades} صفقة، و${v.foreign ? (v.foreign.netDir === 'up' ? `الأجانب مشترون صافون بـ${v.foreign.net}` : v.foreign.netDir === 'down' ? `الأجانب بائعون صافون بـ${v.foreign.net}` : 'تعادل شراء الأجانب مع بيعهم') : 'لا بيانات للأجانب'}.`,
  standfirst: 'يُكتب هذا الملخص تلقائياً من بيانات الجلسة الرسمية بعد إغلاق السوق: مؤشر ISX60، أسعار جميع الشركات، وتداولات المستثمر الأجنبي. الأرقام هي الأرقام؛ لا رأي فيه ولا توصية.',

  /* ── Paragraphs ─────────────────────────────────────────────────────── */
  index: (v: V) => {
    const seed = v.dateShort
    if (v.dir === 'flat') return pick([
      `أغلق مؤشر ISX60 جلسة ${v.day} دون تغيّر يُذكر عند ${v.close} نقطة، بعد إغلاق سابق عند ${v.prevClose}.`,
      `استقر مؤشر ISX60 في جلسة ${v.day} عند ${v.close} نقطة، مقابل ${v.prevClose} في الجلسة السابقة.`,
    ], seed)
    if (v.dir === 'up') return pick([
      `أغلق مؤشر ISX60 جلسة ${v.day} على ${v.close} نقطة، مرتفعاً ${v.pts} نقطة أي ${v.pct}% عن إغلاق الجلسة السابقة عند ${v.prevClose}.`,
      `ارتفع مؤشر ISX60 في جلسة ${v.day} بنسبة ${v.pct}% ليغلق على ${v.close} نقطة، مضيفاً ${v.pts} نقطة إلى إغلاقه السابق عند ${v.prevClose}.`,
      `صعد مؤشر ISX60 ${v.pct}% في جلسة ${v.day}، من ${v.prevClose} إلى ${v.close} نقطة.`,
    ], seed)
    return pick([
      `أغلق مؤشر ISX60 جلسة ${v.day} على ${v.close} نقطة، متراجعاً ${v.pts} نقطة أي ${v.pct}% عن إغلاق الجلسة السابقة عند ${v.prevClose}.`,
      `تراجع مؤشر ISX60 في جلسة ${v.day} بنسبة ${v.pct}% ليغلق على ${v.close} نقطة، خاسراً ${v.pts} نقطة من إغلاقه السابق عند ${v.prevClose}.`,
      `هبط مؤشر ISX60 ${v.pct}% في جلسة ${v.day}، من ${v.prevClose} إلى ${v.close} نقطة.`,
    ], seed)
  },
  context: (v: V) => {
    const parts: string[] = []
    if (v.weekPct && v.weekDir && v.weekDir !== 'flat') parts.push(`المؤشر ${v.weekDir === 'up' ? 'أعلى' : 'أدنى'} بنسبة ${v.weekPct}% مما كان عليه قبل خمس جلسات`)
    if (v.ytdPct && v.ytdDir && v.ytdDir !== 'flat') parts.push(`و${v.ytdDir === 'up' ? 'مرتفع' : 'متراجع'} ${v.ytdPct}% منذ بداية العام`)
    if (v.nearHigh && v.high52) parts.push(`وهو قريب من أعلى إغلاق له في 52 أسبوعاً (${v.high52})`)
    else if (v.nearLow && v.low52) parts.push(`وهو قريب من أدنى إغلاق له في 52 أسبوعاً (${v.low52})`)
    if (v.isx15) parts.push(`أما مؤشر ISX15 فأغلق على ${v.isx15}`)
    return parts.length ? parts.join('، ') + '.' : ''
  },
  breadth: (v: V) => pick([
    `على مستوى الشركات، ارتفعت أسعار ${v.up} شركة وانخفضت ${v.down}، فيما أغلقت ${v.flat} دون تغيّر، من أصل ${v.traded} شركة جرى تداولها في الجلسة من ${v.listed} شركة مدرجة.`,
    `تداولت السوق أسهم ${v.traded} شركة من ${v.listed} مدرجة: ${v.up} منها صاعدة، ${v.down} هابطة، و${v.flat} أغلقت على سعرها السابق.`,
  ], v.day),
  liquidity: (v: V) => {
    const base = pick([
      `بلغت قيمة التداول ${v.value} دينار عبر ${v.trades} صفقة، بحجم ${v.volume} سهم`,
      `سجّلت الجلسة ${v.trades} صفقة بقيمة إجمالية ${v.value} دينار وحجم ${v.volume} سهم`,
    ], v.dateShort)
    const cmp = v.valueVsAvg && v.valueAbove != null ? `، وهي ${v.valueAbove ? 'أعلى' : 'أقل'} بنسبة ${v.valueVsAvg}% من متوسط آخر 20 جلسة` : ''
    return `${base}${cmp}.`
  },
  gainers: (v: V) => v.gainers.length
    ? `تصدّر الرابحين ${list(v.gainers.map((g) => `${g.name} (+${g.pct}% إلى ${g.close})`))}.`
    : 'لم يرتفع سعر أي شركة في هذه الجلسة.',
  losers: (v: V) => v.losers.length
    ? `وفي المقابل تراجع ${list(v.losers.map((g) => `${g.name} (−${g.pct}% إلى ${g.close})`))}.`
    : 'ولم ينخفض سعر أي شركة.',
  active: (v: V) => v.active.length
    ? `استحوذت ${list(v.active.slice(0, 3).map((a) => `${a.name} (${a.value} دينار)`))} على النصيب الأكبر من قيمة التداول.`
    : '',
  foreign: (v: V) => {
    if (!v.foreign) return 'لم تنشر البورصة بيانات تداول المستثمر غير العراقي لهذه الجلسة.'
    const f = v.foreign
    const head = f.netDir === 'flat'
      ? `تعادل شراء المستثمر غير العراقي مع بيعه في هذه الجلسة`
      : f.netDir === 'up'
        ? `كان المستثمر غير العراقي مشترياً صافياً بقيمة ${f.net} دينار`
        : `كان المستثمر غير العراقي بائعاً صافياً بقيمة ${f.net} دينار`
    const detail = ` (شراء ${f.buy} · بيع ${f.sell})`
    const bought = f.bought.length ? `، وتركّز شراؤه في ${list(f.bought)}` : ''
    const sold = f.sold.length ? `${bought ? '،' : '،'} وبيعه في ${list(f.sold)}` : ''
    return `${head}${detail}${bought}${sold}.`
  },

  /* ── Chrome ─────────────────────────────────────────────────────────── */
  sections: { index: 'المؤشر', breadth: 'اتساع السوق والسيولة', movers: 'الرابحون والخاسرون', active: 'الأكثر تداولاً', foreign: 'المستثمر الأجنبي' },
  cols: { company: 'الشركة', close: 'الإغلاق', change: 'التغيّر', value: 'قيمة التداول' },
  prevSession: 'الجلسة السابقة',
  nextSession: 'الجلسة التالية',
  board: 'جدول أسعار هذه الجلسة',
  archive: 'كل الملخصات',
  archiveTitle: 'ملخصات جلسات بورصة العراق',
  archiveSeoTitle: 'ملخص جلسات بورصة العراق اليومية · الأرشيف',
  archiveSeoDescription: 'ملخص يومي لكل جلسة في بورصة العراق: إغلاق مؤشر ISX60، الشركات الصاعدة والهابطة، قيمة التداول، وصافي تداول المستثمر الأجنبي.',
  archiveIntro: 'ملخص مكتوب من بيانات كل جلسة بعد الإغلاق. اختر جلسة لقراءة ما جرى فيها.',
  aboutTitle: 'كيف يُكتب هذا الملخص',
  aboutBody: 'يُولَّد نص الملخص من جداول الجلسة الرسمية التي ينشرها سوق العراق للأوراق المالية بعد الإغلاق، وتُحدَّث الصفحة تلقائياً عند اكتمال البيانات. نسب التغيّر تُحسب مقارنة بآخر إغلاق سابق لكل شركة، ومتوسط 20 جلسة يستثني الجلسة الحالية. بيانات المستثمر غير العراقي تُنشر من مصدرها الرسمي وقد تتأخر عن بقية الأرقام.',
  unitBn: 'مليار', unitMn: 'مليون', unitK: 'ألف',
  weekdays: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  kindLabel: 'ملخص الجلسة',
  feedHeadline: (dateShort: string, close: string, pct: string, dir: Dir) =>
    `ملخص جلسة ${dateShort}: المؤشر ${close} (${dir === 'up' ? '+' : dir === 'down' ? '−' : ''}${pct}%)`,
  source: 'IQWealth · من بيانات الجلسة',
}
export type WrapVars = V
