/**
 * /heatmap — خريطة السوق.
 *
 * ── The legend is the page ────────────────────────────────────────────────
 * A treemap is unreadable without being told what size and colour mean, so
 * those two sentences are the first thing under the title and they name the
 * exact metrics: tile size is MARKET CAP, colour is the PRICE CHANGE over the
 * selected period, grouping is by SECTOR. Not «size = importance».
 *
 * ── Coverage is not decoration ────────────────────────────────────────────
 * The map spans more than one session, so it must never read as one. The
 * coverage line says how many of the mapped companies actually traded in the
 * latest session, and how many are excluded and why. «لا قراءة» is its own
 * state — a company with no comparable close is NOT drawn as flat.
 */
export const heatmap = {
  title:      'خريطة السوق',
  legendLine: (period: string) => ({ size: 'القيمة السوقية', colour: `تغيّر ${period}`, group: 'القطاع' }),
  sizeIs:     'الحجم =',
  colourIs:   'اللون =',
  groupIs:    'التجميع =',
  changeOf:   (period: string) => `تغيّر ${period}`,
  sector:     'القطاع',
  marketCap:  'القيمة السوقية',

  lastSession: 'آخر جلسة',
  companies:   'الشركات',
  tradedIn:    'تداولت في الجلسة',

  periodLabel: 'فترة التغيّر',
  crumbLabel:  'مسار الخريطة',
  allSectors:  'كل القطاعات',
  searchPlaceholder: 'ابحث عن شركة في الخريطة…',
  searchLabel: 'بحث في الخريطة',
  clearSearch: 'مسح البحث',

  /**
   * The coverage sentence, in one piece.
   *
   * ⚠ It has to say all four things or it says nothing useful: how many of the
   * mapped companies actually traded in the latest session, that the rest are
   * drawn from their last published close, how much of the AREA that older
   * group occupies, and what was excluded and why. A treemap spanning more
   * than one session must never be read as a picture of one.
   */
  coverage: (traded: string, included: string, date: string, olderArea: string,
             noCap: string, stale: string, unknownAge: string) =>
    `${traded} من ${included} شركة تداولت في جلسة ${date}؛ البقية بآخر إغلاق منشور لها — ${olderArea} من المساحة. `
    + `مستبعدة: ${noCap} بلا عدد أسهم، ${stale} بسعر أقدم من 60 يوماً`
    + (unknownAge ? `، ${unknownAge} بتاريخ تداول مجهول` : '') + '.',

  sectorsLabel: 'قطاعات السوق',
  sectorOf:     (name: string) => `شركات قطاع ${name}`,

  loadFailedTitle: 'تعذّر تحميل بيانات الخريطة',
  loadFailedNote:  'لم تصل مؤشرات الشركات. حاول تحديث الصفحة، أو تصفّح',
  loadFailedLink:  'السوق',
  emptyTitle: 'لا توجد شركات مؤهّلة للخريطة',
  emptyNote:  'لا شركة تجمع بين قيمة سوقية قابلة للاحتساب وسعر أحدث من 60 يوماً.',

  legendChange: 'التغيّر',
  bandsLabel:   'إبراز الشركات حسب شدة التغيّر',
  scaleNote:    (cap: string, period: string) => `مقياس اللون يتدرّج حتى ±${cap}% لفترة ${period}`,
  close:        'إغلاق',
  highlightBand: (band: string) => `إبراز الشركات ضمن ${band}`,
  noReading:  'لا قراءة',
  noReadingPeriod: 'لا قراءة لهذه الفترة',

  companyUnit: 'شركة',
  nodeLabel: (name: string, n: string, reading: string) => `${name}، ${n} شركة، ${reading}`,
  nodeTitle: (name: string, pct: string, cap: string, n: string, missing: string) =>
    `${name} · ${pct} · ${cap} IQD · ${n} شركة${missing ? ` · ${missing} بلا قراءة` : ''}`,
  tileLabel: (name: string, ticker: string, reading: string, cap: string) =>
    `${name} ${ticker}، ${reading}، القيمة السوقية ${cap} دينار`,
  tileTitle: (name: string, ticker: string, reading: string, price: string) =>
    `${name} · ${ticker} · ${reading} · ${price} د.ع`,

  panelOf:  (name: string) => `تفاصيل ${name}`,
  marketCapCol: 'القيمة السوقية',
  lastPrice:'آخر سعر',
  currency: 'د.ع',
  tradedValue: 'قيمة التداول',
  volume:   'الحجم',
  trades:   'الصفقات',
  changeIn: (period: string) => `تغيّر ${period}`,
  tradedFrom: (date: string) => `أرقام التداول من جلسة ${date}.`,
  notTraded:  (date: string) => `لم تتداول في آخر جلسة · آخر تداول فعلي ${date}.`,
  noTradeData:'لا تتوفر أرقام تداول لهذه الشركة.',
  openCompany:'عرض صفحة الشركة',
}
