/**
 * Reading a bank's published facts into words.
 *
 * Pure functions over `lib/banks` rows and the `banks` dictionary, so the
 * profile page can print a fact, a condition or the bank's one-sentence
 * introduction without carrying the interpretation itself. Each fact STATE
 * gets its own words — the bank publishes it, the bank does not, we could
 * not read the source, nobody has looked — because rendering all four as
 * «—» would say the same thing about four different situations.
 */
import type { Bank, FactRow, ConditionRow } from '@/lib/banks'
import type { banks as Dict } from '@/lib/i18n/messages/ar/banks'

type C = typeof Dict
type Locale = 'ar' | 'en'

/** «1.2M» · «$20K» — a money amount, compact, with the currency only when
 *  it is not the dinar (a USD minimum is not a dinar minimum). */
export function money(v: number, unit: string | null = 'iqd'): string {
  const a = Math.abs(v)
  const n = a >= 1e12 ? `${(v / 1e12).toFixed(2)}T`
    : a >= 1e9 ? `${(v / 1e9).toFixed(2)}B`
      : a >= 1e6 ? `${(v / 1e6).toFixed(1)}M`
        : a >= 1e3 ? `${(v / 1e3).toFixed(0)}K`
          : String(Math.round(v))
  return unit === 'usd' ? `$${n}` : n
}

const span = (n: number, c: C) =>
  n % 12 === 0 && n >= 12 ? c.years(String(n / 12)) : c.months(String(n))

/** «لمدة 12 شهراً» · «الراتب ≥ 500,000» — one condition, in the reader's language. */
export function describeCondition(x: ConditionRow, c: C): string {
  const cf = c.condField as Record<string, string>
  const cv = c.condValue as Record<string, string>
  const cn = c.condFieldNo as Record<string, string>
  const field = cf[x.field_key] ?? x.field_key
  const op = (c.condOp as Record<string, string>)[x.op] ?? x.op
  const num = (n: number) =>
    x.field_key === 'term_months' || x.field_key === 'employment_months' ? span(n, c)
      : x.field_key === 'age' ? String(n) : money(n)
  const raw = x.value_set
    ? x.value_set.map((v) => cv[v] ?? v).join(' / ')
    : x.value_bool != null ? cv[String(x.value_bool)]
      : x.value_text != null ? (cv[x.value_text] ?? x.value_text)
        : x.value_num != null ? num(x.value_num) : ''
  if (x.value_bool === true && x.op === 'eq') return field
  if (x.value_bool === false && x.op === 'eq') return cn[x.field_key] ?? `${c.condOp.ne} ${field}`
  /* An equality on a tenor reads as a scenario, not as an algebraic claim. */
  if (x.field_key === 'term_months' && x.op === 'eq') return `${field}: ${raw}`
  return `${field} ${op} ${raw}`
}

/** A rate basis code in the reader's language. The seeds use one
 *  vocabulary (`annual`, `reducing`) and the editorial package another
 *  (`expected_profit_not_guaranteed`); both are dictionaries here. */
export function basisLabel(code: string, c: C): string | null {
  return (c.rateBasis as Record<string, string>)[code] ?? (c.ed.basis as Record<string, string>)[code] ?? null
}

/** The fact's value as text, or the state's own words when there is none. */
export function factText(f: FactRow, c: C, locale: Locale): { text: string; known: boolean } {
  if (f.state === 'UNKNOWN') return { text: c.notPublished, known: false }
  if (f.state === 'SOURCE_UNAVAILABLE') return { text: c.sourceUnavailable, known: false }
  if (f.state === 'NOT_APPLICABLE') return { text: c.notApplicable, known: false }
  if (f.state === 'UNVERIFIED') return { text: c.notChecked, known: false }
  if (f.value_bool != null) return { text: f.value_bool ? '✓' : '✗', known: true }
  if (f.value_text != null) {
    const basis = basisLabel(f.value_text, c)
    if (basis) return { text: basis, known: true }
    /* Free prose: the bank's own Arabic is the evidence, our English is the
       rendering. */
    return { text: locale === 'ar' ? f.value_text : (f.value_text_en ?? f.value_text), known: true }
  }
  if (f.value_num == null) return { text: '—', known: false }
  if (f.unit === 'percent') return { text: `${f.value_num}%`, known: true }
  if (f.unit === 'months') return { text: span(f.value_num, c), known: true }
  if (f.unit === 'iqd' || f.unit === 'usd') return { text: money(f.value_num, f.unit), known: true }
  return { text: String(f.value_num), known: true }
}

/** A note is copy: Arabic in `note`, our English rendering in `note_en`. */
export const factNote = (f: FactRow | undefined, locale: Locale): string | null =>
  f ? ((locale === 'ar' ? f.note : (f.note_en ?? f.note)) ?? null) : null

/**
 * The factual sentence under the name — assembled from typed fields and
 * dictionary fragments, never written per bank. Everything in it appears
 * elsewhere on the page.
 */
export function introSentence(bank: Bank, c: C, city: string | null): string {
  const parts = [c.introKind(c.typeAdj[bank.bank_type], c.ownershipAdj[bank.ownership])]
  if (city) parts.push(c.introCity(city))
  if (bank.founded) parts.push(c.introFounded(String(bank.founded)))
  if (bank.ticker) parts.push(c.introListed(bank.ticker))
  if (bank.cbi_licensed) parts.push(c.introLicensed)
  return `${parts.join(c.introJoin)}.`
}
