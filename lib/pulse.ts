/**
 * نبض السوق — the model behind /pulse.
 *
 * Ported from `/Users/amed/iqwealth-design/app/pulse/pulseData.ts`. Every
 * formula, threshold and printed rule string below is the approved reference's
 * own. What changed is where the numbers come from, and one correction the
 * reference could not make because its mock data had no such case.
 *
 * ── The correction: breadth is four-state here, not three ─────────────────
 * `breadth_daily` stores `advancers` / `decliners` / `unchanged` and nothing
 * else. It is not wrong, but it answers a different question than this page
 * asks: it compares each company against ITS OWN previous traded close, not
 * against the previous session. Rebuilding it from `company_metrics.prev_close`
 * reproduces a stored row to the unit — for 2026-08-20, 8 / 15 / 17 with
 * `up_volume` 224,607,641 and `down_volume` 154,226,373, all four exact.
 *
 * The consequence is that it has no place to put a company that traded today
 * and did not trade in the previous session, so those companies land in
 * `unchanged`. On 2026-08-20 that is seven of them, and «ثابت 17» is then a
 * statement about thirteen flat companies and seven unmeasurable ones. This
 * product's rule is that a missing comparison is not a zero, so:
 *
 *   · the CURRENT session is counted live from `daily_prices` against the
 *     previous session's closes, giving up / down / flat / noPrior;
 *   · the HISTORY series keeps `breadth_daily`, which is the only source that
 *     goes back to 2010, and is labelled with its own definition.
 *
 * `noPrior` is therefore `number` for the live session and `null` for a
 * historical row — null meaning "this source cannot say", never zero.
 */

/* ── Session ──────────────────────────────────────────────────────────────── */

export type Session = {
  date: string
  advancers: number
  decliners: number
  /** TRUE unchanged: traded, had a comparable prior close, moved 0.00. */
  unchanged: number
  /** Traded with no comparable prior close. `null` = the source cannot say. */
  noPrior: number | null
  upVolume: number
  downVolume: number
  newHighs: number | null
  newLows: number | null
  traded: number
  listed: number | null
  totalValue: number | null
  totalVolume: number | null
  totalTrades: number | null
}

export const TIMEFRAMES = [
  { id: '1M', label: 'شهر', n: 22 },
  { id: '3M', label: '3 أشهر', n: 66 },
  { id: '6M', label: '6 أشهر', n: 132 },
  { id: '1Y', label: 'سنة', n: 260 },
] as const
export type TimeframeId = (typeof TIMEFRAMES)[number]['id']

/* ── Ratios, each with its denominator stated ─────────────────────────────── */

/** Companies whose direction could be measured: they traded AND had a
 *  comparable prior close. The denominator for every count-based share on the
 *  page — a company with no prior close is not "flat", it is unmeasured. */
export const comparable = (s: Session) => s.advancers + s.decliners + s.unchanged

/** Advancers ÷ decliners. Null when nothing declined — a ratio to zero is not
 *  "infinite breadth", it is undefined, and printing ∞ is worse than printing
 *  the counts. */
export const adRatio = (s: Session) => (s.decliners ? s.advancers / s.decliners : null)

/** advancers − decliners. The compact directional measure. */
export const netBreadth = (s: Session) => s.advancers - s.decliners

/** Share of MEASURABLE companies that rose, 0–1. */
export const upShare = (s: Session) => {
  const d = comparable(s)
  return d ? s.advancers / d : 0
}

/** Share of directional volume that went with the risers, 0–1. Denominator is
 *  up + down volume, not session volume: volume on flat and unmeasured names
 *  has no direction to be on either side of. */
export const upVolumeShare = (s: Session) =>
  s.upVolume + s.downVolume ? s.upVolume / (s.upVolume + s.downVolume) : 0

/** Companies that traded ÷ companies listed. Null when the roster is unknown. */
export const participation = (s: Session) =>
  s.listed ? s.traded / s.listed : null

/* ── The verdict ──────────────────────────────────────────────────────────── */

export type Verdict = {
  tone: 'up' | 'down' | 'mixed'
  headline: string
  qualifier: string
  rule: string
}

export const BROAD = 0.6
export const WEAK = 0.4
export const SKEW = 0.08

const R_BROAD = 'تُوصف الجلسة بالاتساع الإيجابي عندما ترتفع أكثر من 60% من الشركات القابلة للقياس'
const R_WEAK = 'يُوصف الاتساع بالسلبي عندما تكون نسبة الشركات المرتفعة 40% أو أقل من القابلة للقياس'
const R_SKEW = 'ويُعدّ ميل السيولة واضحاً عندما يتجاوز الفرق بين حصة الأسهم الصاعدة من الحجم وحصتها من العدد 8 نقاط مئوية'

/**
 * A classification from two printed thresholds, deliberately NOT a score. A
 * page that prints "market health: 87" is asking to be trusted about a number
 * nobody can check. The rule text is written from the same constants the
 * branches test, so it cannot drift away from the calculation.
 */
export function verdict(s: Session): Verdict {
  const share = upShare(s)
  const vshare = upVolumeShare(s)
  const broad = share >= BROAD
  const weak = share <= WEAK
  const gap = vshare - share

  if (broad && gap > SKEW) return {
    tone: 'up',
    headline: 'صعود واسع',
    qualifier: 'مدعوم بحصة سيولة تفوق حصة العدد',
    rule: `${R_BROAD}، ${R_SKEW}. تحقّق الشرطان معاً في هذه الجلسة، والميل لصالح الأسهم الصاعدة.`,
  }
  if (broad && gap < -SKEW) return {
    tone: 'mixed',
    headline: 'اتساع إيجابي',
    qualifier: 'لكن السيولة تميل إلى الأسهم الهابطة',
    rule: `${R_BROAD}، ${R_SKEW}. تحقّق الشرطان، إلا أن الميل جاء لصالح الأسهم الهابطة، ولذلك لا تُوصف الجلسة بصعود مدعوم.`,
  }
  if (broad) return {
    tone: 'up',
    headline: 'اتساع إيجابي',
    qualifier: 'دون ميل واضح في السيولة',
    rule: `${R_BROAD}. لم يتجاوز الفرق بين حصة الصاعدة من الحجم وحصتها من العدد 8 نقاط مئوية، فلا يُوصف الصعود بأنه مدعوم أو غير مدعوم.`,
  }
  if (weak && gap < -SKEW) return {
    tone: 'down',
    headline: 'ضعف واسع',
    qualifier: 'ومعظم حجم التداول على الأسهم الهابطة',
    rule: `${R_WEAK}، ${R_SKEW}. تحقّق الشرطان معاً، والميل لصالح الأسهم الهابطة.`,
  }
  if (weak) return {
    tone: 'down',
    headline: 'اتساع سلبي',
    qualifier: 'دون ميل واضح في السيولة',
    rule: `${R_WEAK}. لم يتجاوز الفرق بين حصة الصاعدة من الحجم وحصتها من العدد 8 نقاط مئوية.`,
  }
  return {
    tone: 'mixed',
    headline: 'جلسة متوازنة',
    qualifier: 'دون ميل واضح في الاتساع',
    rule: 'تُصنّف الجلسة متوازنة عندما تبقى حصة الشركات الصاعدة بين 40% و60% من القابلة للقياس، فلا تتحقّق شروط الاتساع الإيجابي ولا السلبي.',
  }
}

/* ── Sector breadth ───────────────────────────────────────────────────────
   Counts within the sector, not the sector's return. The homepage already
   shows sector performance; the question here is whether a sector's move was
   shared by its companies or carried by one of them. */

export type SectorBreadth = {
  id: string
  label: string
  up: number
  down: number
  flat: number
  noPrior: number
  /** Companies with a measurable direction. The track's denominator. */
  measured: number
  traded: number
}

/** Gainers ÷ decliners inside one sector. Null when nothing declined there —
 *  same rule as the market-wide ratio, for the same reason. */
export const sectorRatio = (s: SectorBreadth) => (s.down ? s.up / s.down : null)

/* ── Concentration ────────────────────────────────────────────────────────
   Explicitly about traded VALUE, never about the index. The product holds no
   ISX60 constituent weights, so a company's contribution to the index cannot
   be computed and is not claimed. */

export type ValueRow = { symbol: string; name: string; value: number; pct: number | null }

export const concentration = (rows: ValueRow[], n: number, totalValue: number | null) =>
  totalValue ? rows.slice(0, n).reduce((a, s) => a + s.value, 0) / totalValue : null

/** One company's share of the session's traded value, 0–1. Not index weight. */
export const valueShare = (v: number, totalValue: number | null) =>
  totalValue ? v / totalValue : null

/* ── Building the live session ────────────────────────────────────────────── */

export type PriceRow = { ticker: string; close: number | null; volume: number | null; value: number | null }

/**
 * Counts the current session four ways against the previous session's closes.
 * A ticker absent from `prevCloses`, or carrying a non-positive prior close,
 * is `noPrior` — never folded into flat.
 */
export function countLive(rows: PriceRow[], prevCloses: Map<string, number>) {
  let advancers = 0, decliners = 0, unchanged = 0, noPrior = 0
  let upVolume = 0, downVolume = 0
  const dir = new Map<string, 'up' | 'down' | 'flat' | 'na'>()

  for (const r of rows) {
    const prev = prevCloses.get(r.ticker)
    if (r.close == null || prev == null || !(prev > 0)) {
      noPrior++
      dir.set(r.ticker, 'na')
      continue
    }
    const ch = r.close - prev
    if (ch > 0) { advancers++; upVolume += r.volume ?? 0; dir.set(r.ticker, 'up') }
    else if (ch < 0) { decliners++; downVolume += r.volume ?? 0; dir.set(r.ticker, 'down') }
    else { unchanged++; dir.set(r.ticker, 'flat') }
  }
  return { advancers, decliners, unchanged, noPrior, upVolume, downVolume, dir }
}

/** Percent change against the previous session's close, or null. */
export function pctVsPrev(close: number | null, prev: number | undefined) {
  if (close == null || prev == null || !(prev > 0)) return null
  return ((close - prev) / prev) * 100
}

/* ── Formatting ───────────────────────────────────────────────────────────── */

export const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** Compact magnitude. The reference's own thresholds. */
export const iqd = (v: number) => {
  const a = Math.abs(v)
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (a >= 1e3) return (v / 1e3).toFixed(0) + 'K'
  return String(Math.round(v))
}
