/**
 * Resolving a depository company name to a ticker.
 *
 * ── The problem ───────────────────────────────────────────────────────────
 * `ownership_monthly` and `major_shareholders` carry NO ticker column. They
 * key on the Arabic company name exactly as the monthly PDF printed it, and
 * that PDF is a scan run through OCR. Two of the OCR's failures are
 * systematic, reproducible, and therefore repairable:
 *
 *   1. LAM-ALEF, emitted in visual order.  The ligature «لا» comes out as its
 *      two glyphs reversed, so «للاستثمار» becomes «لالستثمار» and «الأوسط»
 *      becomes «االوسط». This is a total function on the canonical name, so
 *      rather than trying to invert it — «ال» is also the definite article and
 *      un-reversing it globally would corrupt every other word — we apply it
 *      FORWARD to the roster and compare damaged against damaged. Verified
 *      collision-free across the whole roster.
 *
 *   2. YA read as a HARAKA.  «العراقي» comes out «العراقً», «السياحية» comes
 *      out «السٌاحٌة» — a final or medial ي rendered as fathatan/kasratan.
 *      Folding those marks back to ي recovers the word; deleting them, which
 *      is what a generic Arabic normaliser does, destroys it.
 *
 * ── The rule ──────────────────────────────────────────────────────────────
 * False negatives are preferable to false company ownership assignments. A
 * row that cannot be proven to belong to a company is left unresolved and is
 * not shown against any company — never attached to a best guess.
 */
import { matchCompanyRecord } from '@/lib/market'

export type MatchMethod =
  | 'exact'                  // the source name is the canonical name
  | 'normalized_exact'       // equal after Unicode/orthographic normalisation
  | 'ligature_repair_exact'  // equal once the lam-alef defect is modelled
  | 'existing_alias'         // the established similarity match, token-vetoed
  | 'unresolved'

export interface RosterEntry {
  sym: string
  /** Canonical display name. NEVER a damaged one — display and matching are separate. */
  ar: string | null
  en: string | null
  /** Every string this ticker may legitimately appear as in a depository report. */
  keys: string[]
}

export interface Resolution {
  /** The source string, untouched. */
  source: string
  normalized: string
  sym: string | null
  canonical: string | null
  method: MatchMethod
  ambiguous: boolean
  /** Present only when `method` is `unresolved`. */
  excludedReason?: 'too-short' | 'ambiguous-candidates' | 'token-mismatch' | 'no-candidate' | 'claimed-by-another-name'
}

/** Structural words that never distinguish one Iraqi listed company from another. */
const GENERIC = new Set(['شركه', 'شركة', 'مصرف', 'بنك', 'العراقيه', 'العراقي', 'العراق', 'الشركه', 'العامه', 'للاستثمار', 'لالستثمار'])

/**
 * Orthographic normalisation, defect-aware.
 *
 * Order matters: the ya-as-haraka fold has to run BEFORE harakat are dropped,
 * or the mark that IS the ya gets deleted with the ones that are noise.
 */
export function normalizeName(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[ًٌٍ]/g, 'ي')   // defect 2 — a ya the OCR read as tanwin
    .replace(/[َُِّْـ]/g, '')  // genuine harakat and tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '')
}

/** Defect 1, applied forward: what the OCR would print for a correct name. */
export function ligatureDamage(s: string): string {
  return s.replace(/لا/g, 'ال')
}

function fold(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[ًٌٍ]/g, 'ي')
    .replace(/[َُِّْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
}

/**
 * A word reduced to what distinguishes it: the attached particle and every
 * definite article stripped, and the lam-alef defect applied so a damaged
 * source word and a clean roster word reduce to the same thing.
 *
 * «لمدن» → «مدن», «الألعاب» → «عاب», «للإنتاج» → «نتاج». This is deliberately
 * crude — it is not morphology, it only has to stop a prefix from making two
 * spellings of one word look like two different words.
 */
function stem(word: string): string {
  let w = ligatureDamage(fold(word))
  w = w.replace(/^[لوبفك](?=.{3})/, '')
  while (w.length > 4 && w.startsWith('ال')) w = w.slice(2)
  return w
}

function tokens(s: string): string[] {
  return fold(s).split(/\s+/).map(ligatureDamage).filter(t => t.length >= 3 && !GENERIC.has(t)).map(stem)
}

/** Two stems are the same word if they differ only in a short suffix (ة/ات, ي/ية). */
function sameWord(a: string, b: string): boolean {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i >= 3 && i >= Math.min(a.length, b.length) - 2
}

/**
 * The veto that makes the similarity tier safe.
 *
 * The established matcher scores by how much of the shorter name the longer
 * one covers, which cannot see WHICH characters are missing. On the Islamic
 * banks — «مصرف الأنصاري الإسلامي», «مصرف القرطاس الإسلامي», «مصرف نور العراق
 * الإسلامي» — everything but one word is shared, so it scored 0.933 against
 * the WRONG bank while a correct match elsewhere scored 0.909. No score
 * threshold separates those two populations: the correct matches run down to a
 * 0.038 margin and the wrong ones up to 0.067. The distinguishing WORD is what
 * separates them.
 *
 * So a similarity match is accepted only when every distinguishing word of the
 * shorter name has a counterpart in the longer. «الأهلية للإنتاج الزراعي»
 * against «الشركة الأهلية للإنتاج الزراعي» survives; «الأنصاري» against
 * «إيلاف» does not. This only ever REMOVES matches the established matcher
 * already made — it never adds one, and it is not a score.
 */
function tokensAgree(a: string, b: string): boolean {
  const ta = tokens(a), tb = tokens(b)
  if (!ta.length || !tb.length) return false
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta]
  return short.every(t => long.some(u => sameWord(t, u)))
}

/**
 * Resolve one depository name against the roster.
 *
 * Tiers are tried in order and each one demands a UNIQUE hit: two roster
 * entries answering the same tier means we cannot tell them apart, so the name
 * is unresolved rather than assigned to whichever came first.
 */
export function resolveName(source: string, roster: RosterEntry[]): Resolution {
  const normalized = normalizeName(source)
  const base: Resolution = { source, normalized, sym: null, canonical: null, method: 'unresolved', ambiguous: false }
  if (normalized.length < 4) return { ...base, excludedReason: 'too-short' }

  const tiers: [MatchMethod, (key: string) => string, string][] = [
    ['exact', k => k.trim(), source.trim()],
    ['normalized_exact', normalizeName, normalized],
    ['ligature_repair_exact', k => normalizeName(ligatureDamage(k)), normalized],
  ]
  for (const [method, keyOf, probe] of tiers) {
    const hits = roster.filter(r => r.keys.some(k => keyOf(k) === probe))
    if (hits.length === 1) return { ...base, sym: hits[0].sym, canonical: hits[0].ar, method }
    if (hits.length > 1) return { ...base, ambiguous: true, excludedReason: 'ambiguous-candidates' }
  }

  // The established similarity matcher, unchanged, over the same key set —
  // then vetoed. Nothing here loosens it; the veto only removes matches.
  const flat = roster.flatMap(r => r.keys.map(k => ({ ar: k, entry: r })))
  const hit = matchCompanyRecord(source, flat, 0.9)
  if (!hit) return { ...base, excludedReason: 'no-candidate' }
  if (!tokensAgree(source, hit.ar!)) return { ...base, excludedReason: 'token-mismatch' }
  return { ...base, sym: hit.entry.sym, canonical: hit.entry.ar, method: 'existing_alias' }
}

/**
 * Resolve a whole snapshot, then apply the cross-row veto.
 *
 * Two different source names resolving to the SAME ticker is proof that at
 * least one of them is wrong, and nothing in the data says which. Both are
 * dropped. This is the check that catches a bad assignment when the veto above
 * cannot — it needs only one of the two names to be a company we know.
 */
export function resolveSnapshot(sources: string[], roster: RosterEntry[]): Map<string, Resolution> {
  const out = new Map<string, Resolution>()
  for (const s of Array.from(new Set(sources))) out.set(s, resolveName(s, roster))

  const claims = new Map<string, string[]>()
  for (const [name, r] of Array.from(out.entries())) if (r.sym) claims.set(r.sym, [...(claims.get(r.sym) ?? []), name])
  for (const names of Array.from(claims.values())) {
    if (names.length < 2) continue
    for (const n of names) {
      const r = out.get(n)!
      out.set(n, { ...r, sym: null, canonical: null, method: 'unresolved', ambiguous: true, excludedReason: 'claimed-by-another-name' })
    }
  }
  return out
}

/** Build the roster: `companies.json` is canonical for display, `company_metrics` adds match keys and tickers. */
export function buildRoster(
  curated: { sym: string; ar?: string | null; en?: string | null }[],
  metrics: { ticker: string; name_ar?: string | null; name_en?: string | null }[],
): RosterEntry[] {
  const by = new Map<string, RosterEntry>()
  for (const m of curated) by.set(m.sym, { sym: m.sym, ar: m.ar ?? null, en: m.en ?? null, keys: m.ar ? [m.ar] : [] })
  for (const m of metrics) {
    const r = by.get(m.ticker) ?? { sym: m.ticker, ar: null, en: m.name_en ?? null, keys: [] }
    /* `company_metrics.name_ar` is the KNOWN-DAMAGED field — one row holds the
       single character «8». It earns its place here as a match key only,
       because it is damaged by the same OCR as the depository report and so
       matches it well. It is never displayed; `ar` above is. */
    if (m.name_ar && m.name_ar.length > 3) r.keys.push(m.name_ar)
    if (!r.en) r.en = m.name_en ?? null
    by.set(m.ticker, r)
  }
  return Array.from(by.values()).filter(r => r.keys.length > 0)
}
