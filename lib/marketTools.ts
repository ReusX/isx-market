/**
 * أدوات الأسواق — the shared spine behind سعر الصرف · الذهب · النفط.
 *
 * Ported from `/Users/amed/iqwealth-design/app/tools/toolsShared.ts`. It owns
 * provenance, cadence, staleness and number formatting, and owns no layout at
 * all: each page builds its own hierarchy from its own data.
 *
 * ── The finding that shapes all three pages ───────────────────────────────
 *          THERE IS NO HISTORY. FOR ANY OF THE THREE.
 *
 * `fetchFx`, `fetchGold` and `fetchOil` each scrape ONE observation and return
 * it. Nothing writes a series: `rates_cache` is a single row keyed 'fx',
 * upserted in place — a fallback for when the source is unreadable, not an
 * archive, and each write destroys the previous observation. Gold and oil are
 * not cached at all beyond Next's data cache.
 *
 * So these are quote pages and they are built as quote pages: one headline
 * number each, provenance first, chart-free. Drawing a trend would mean
 * inventing the series.
 *
 * ── Freshness ─────────────────────────────────────────────────────────────
 * Each source has its own cadence and must not borrow the ISX session
 * language. `stale` is not a synonym for old — it means the source could not
 * be READ and this is the last value held. No «مباشر», no «LIVE», no green
 * blinking dot: it is true for none of the three.
 */

/* ── Cadence · what the source actually promises ─────────────────────────── */
export type Cadence = "daily" | "delayed" | "policy";

export type Source = {
  id: string;
  host: string;
  url: string;
  /** How often this source publishes — NOT how often we poll it. */
  cadence: Cadence;
  /** Said in the page's own words, in the footer. */
  note: string;
};

export const SOURCES: Record<"fx" | "gold" | "oil" | "cbi", Source> = {
  fx: {
    id: "fx", host: "alsumaria.tv", url: "https://www.alsumaria.tv/economy-news",
    cadence: "daily",
    note: "سعر إغلاق سوق بغداد كما تنشره السومرية يومياً · سعر مرجعي لا سعر تنفيذ",
  },
  cbi: {
    id: "cbi", host: "البنك المركزي العراقي", url: "https://cbi.iq/",
    cadence: "policy",
    note: "سعر سياسي يحدده البنك المركزي ولا يتغيّر إلا بقراره",
  },
  gold: {
    id: "gold", host: "iraqgoldprice.com", url: "https://iraqgoldprice.com/",
    cadence: "daily",
    note: "قائمة أسعار محلية تُنشر يومياً · ليست تسعيرة صائغ بعينه",
  },
  oil: {
    id: "oil", host: "oilprice.com", url: "https://oilprice.com/ar/oil-price-charts",
    cadence: "delayed",
    note: "تقييمات أسعار عالمية بتأخير · لكل خام ختم وقت خاص به",
  },
};

/**
 * The freshness of ONE observation. `stale` is not a synonym for old — it
 * means the source could not be read and this is the last value we hold.
 * The live FX page draws that distinction; gold and oil never did.
 */
export type Freshness = {
  /** Observation date as published by the source (YYYY-MM-DD), not fetch time. */
  observed: string | null;
  /** Optional clock, only where the source stamps one (oil does, per blend). */
  clock?: string | null;
  /** Source could not be refreshed — this is the last known value. */
  stale: boolean;
  source: Source;
};

/** Real today, in Baghdad. The reference pins a constant here so its three
 *  mock pages agree; production has to age a real observation against the
 *  actual clock. Baghdad is UTC+3 all year — Iraq has observed no DST since
 *  2015 — and the date is what matters, so a fixed offset is exact. */
export const today = (): string =>
  new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10)

const AR_MONTH = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/**
 * The sources do not agree on a separator: Alsumaria's date arrives as
 * `YYYY-MM-DD` and iraqgoldprice.com's as `(YYYY/MM/DD)`. Normalising here
 * rather than at each call site is why the gold page printed
 * «رصد undefined undefined NaN» the first time it was wired up.
 */
const isoish = (v: string): string => v.trim().replace(/\//g, "-");

/** «12 أغسطس 2026» — Latin digits, matching every other surface. */
export function arDate(raw: string): string {
  const [y, m, d] = isoish(raw).split("-").map(Number);
  if (!y || !m || !d || !AR_MONTH[m - 1]) return raw;
  return `${d} ${AR_MONTH[m - 1]} ${y}`;
}

/** Whole days between two dates, either separator. */
export function daysBetween(a: string, b: string): number {
  const ta = Date.parse(isoish(a)), tb = Date.parse(isoish(b));
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
  return Math.round((tb - ta) / 86_400_000);
}

/**
 * The freshness sentence. Precise, never «مباشر».
 *
 * The age wording is deliberately different per cadence: a daily source that
 * is one day old is normal; a delayed source that is one day old is worth
 * saying; a policy rate has no age at all, only a confirmation date.
 */
export function freshnessLine(f: Freshness): string {
  if (f.stale) return "تعذّر تحديث المصدر · هذه آخر قراءة معروفة";
  if (!f.observed) return "لا يوجد تاريخ رصد من المصدر";
  const age = daysBetween(f.observed, today());
  if (f.source.cadence === "policy") return `آخر تأكيد ${arDate(f.observed)}`;
  if (age <= 0) return `رصد ${arDate(f.observed)}`;
  if (age === 1) return `رصد ${arDate(f.observed)} · قراءة الأمس`;
  return `رصد ${arDate(f.observed)} · ${agePhrase(age)}`;
}

/**
 * Arabic counts days in four forms, not two — singular, DUAL, the 3–10 plural,
 * and the 11+ accusative singular. Interpolating a number into «أيام» produces
 * «2 أيام», which is the plural applied to a dual and reads as a bug to any
 * Arabic reader. Same class as the portfolio's «2 عمليات».
 */
export function agePhrase(n: number): string {
  if (n === 1) return "قبل يوم";
  if (n === 2) return "قبل يومين";
  if (n <= 10) return `قبل ${n} أيام`;
  return `قبل ${n} يوماً`;
}

/** The chip's tone. Three states, and none of them is "live". */
export function freshnessTone(f: Freshness): "current" | "carried" | "stale" {
  if (f.stale) return "stale";
  if (!f.observed) return "stale";
  const age = daysBetween(f.observed, today());
  if (f.source.cadence === "policy") return "current";
  return age <= 1 ? "current" : "carried";
}

export function freshnessLabel(f: Freshness): string {
  const tone = freshnessTone(f);
  if (tone === "stale") return "آخر قراءة معروفة";
  if (tone === "carried") return "قراءة مُرحّلة";
  return f.source.cadence === "policy" ? "سعر ثابت" : "أحدث رصد";
}

/* ── Numbers ─────────────────────────────────────────────────────────────── */
export const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
export const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Signed, with a true minus sign — never a hyphen beside Arabic. */
export function signed(v: number, digits = 2): string {
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${s}${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  })}`;
}
export const signedPct = (v: number, d = 2) => `${signed(v, d)}%`;

/** The em dash used everywhere a value is genuinely unknown. Never 0. §37 */
export const NA = "—";
