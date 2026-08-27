import companiesData from '@/public/data/companies.json'

/**
 * The global company search index.
 *
 * The production source of truth is `public/data/companies.json` — the same
 * register the rest of the product uses. This does NOT become news or Learn
 * search: the product has no global text index behind those, and a search box
 * that silently covers a third of the site is worse than one with an honest
 * scope.
 *
 * ── Arabic normalisation, and why the search is broken without it ─────────
 * People type أ, إ, آ and ا interchangeably; they type ه for ة and ي for ى;
 * mobile keyboards insert tatweel. None of that is a spelling mistake — it is
 * how the language is typed. A raw `includes` therefore fails «الرافدين»
 * against «مصرف الرافدين» whenever the query carries a different alef, which
 * is most of the time. Both the index and the query are folded to one form
 * before comparing, and diacritics are stripped for the same reason.
 */

const AR_FOLD: [RegExp, string][] = [
  [/[أإآٱ]/g, 'ا'],
  [/ة/g, 'ه'],
  [/ى/g, 'ي'],
  [/ـ/g, ''],
  [/[ً-ٰٟ]/g, ''],
]

export function fold(s: string): string {
  let out = s.toLowerCase().trim()
  for (const [re, to] of AR_FOLD) out = out.replace(re, to)
  return out
}

export type CompanyHit = {
  sym: string
  ar: string
  en: string
  sec: string
}

type RawCompany = { sym: string; ar?: string; en?: string; sec?: string }

/** Folded once at module load, not per keystroke. */
const INDEX: (CompanyHit & { _sym: string; _ar: string; _en: string })[] =
  (companiesData as RawCompany[]).map((c) => ({
    sym: c.sym,
    ar: c.ar ?? c.sym,
    en: c.en ?? '',
    sec: c.sec ?? '',
    _sym: fold(c.sym),
    _ar: fold(c.ar ?? ''),
    _en: fold(c.en ?? ''),
  }))

/**
 * Ranked results.
 *
 * A ticker prefix outranks a name match: someone typing "BBOB" wants that
 * company, not every company whose description happens to contain those
 * letters. Beyond that, a prefix beats a mid-string hit.
 */
export function searchCompanies(query: string, limit = 8): CompanyHit[] {
  const q = fold(query)
  if (!q) return []

  const scored: { hit: CompanyHit; score: number }[] = []
  for (const c of INDEX) {
    let score = 0
    if (c._sym === q) score = 100
    else if (c._sym.startsWith(q)) score = 90
    else if (c._ar.startsWith(q)) score = 70
    else if (c._en.startsWith(q)) score = 60
    else if (c._ar.includes(q)) score = 40
    else if (c._en.includes(q)) score = 30
    else if (c._sym.includes(q)) score = 20
    if (score) scored.push({ hit: { sym: c.sym, ar: c.ar, en: c.en, sec: c.sec }, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.hit.sym.localeCompare(b.hit.sym))
    .slice(0, limit)
    .map((s) => s.hit)
}

/** Split a label around the match so it can be marked, without regex escaping. */
export function splitMatch(label: string, query: string): [string, string, string] | null {
  const q = query.trim()
  if (!q) return null
  const i = fold(label).indexOf(fold(q))
  if (i < 0) return null
  return [label.slice(0, i), label.slice(i, i + q.length), label.slice(i + q.length)]
}
