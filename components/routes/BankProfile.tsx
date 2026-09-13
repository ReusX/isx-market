'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { CoverageChip, iqd, headlineTerms, initials } from './BanksHub'
import { CompanyLogo } from '@/components/CompanyLogo'
import companiesData from '@/public/data/companies.json'
import type {
  Bank, ProductRow, ServiceRow, FactRow, ConditionRow, BankFinancials, Coverage,
} from '@/lib/banks'
import '@/styles/banks.css'

/**
 * /banks/[slug].
 *
 * ── The unknown states are the hard part ──────────────────────────────────
 * Four different situations would all render as «—» if we let them:
 *
 *   the bank publishes it                → the value
 *   the bank does not publish it         → «لم ينشر المصرف هذه المعلومة»
 *   we could not read the source         → «تعذّر التحقق من المصدر»
 *   nobody has looked                    → the row is simply absent
 *
 * They are kept apart because a reader who sees a dash concludes the product
 * has no such term, which for most Iraqi banks is not what we found.
 *
 * ── Financials are read, never copied ────────────────────────────────────
 * A listed bank's figures come from the same `financial_facts` rows
 * /c/[sym]/financials renders. This page shows a snapshot and links out; it is
 * not a second copy of the statements, and it is not a replacement for the
 * company page.
 */

interface Props {
  bank: Bank
  products: ProductRow[]
  facts: FactRow[]
  conditions: ConditionRow[]
  services: ServiceRow[]
  financials: BankFinancials | null
  coverage: Coverage
}

const FIN_ORDER = [
  'total_assets', 'customer_deposits', 'total_equity',
  'net_income', 'paid_capital', 'capital_adequacy_ratio', 'lcr',
] as const

export function BankProfile({ bank, products, facts, conditions, services, financials, coverage }: Props) {
  const { t: T, locale, href: L } = useLocale()
  const c = T.banks
  const name = locale === 'ar' ? bank.name_ar : bank.name_en
  const city = bank.hq_city ? (c.city[bank.hq_city] ?? bank.hq_city) : null
  const deposits = products.filter((p) => p.kind.startsWith('deposit') || p.kind === 'account_current')
  const loans = products.filter((p) => !p.kind.startsWith('deposit') && p.kind !== 'account_current')
  const byProduct = (id: number) => facts.filter((f) => f.product_id === id)

  const art = bank.ticker
    ? (companiesData as { sym: string; logo?: string; color?: string }[]).find((x) => x.sym === bank.ticker)
    : undefined
  const glance = headlineTerms(products, locale).slice(0, 4)

  return (
    <main className="iq-page bk-page">
      <Link className="bk-back" href={L('/banks')}>
        <span className="dir-go" aria-hidden="true">›</span> {c.backToBanks}
      </Link>

      <header className="bk-hero-card">
        <CompanyLogo
          className="bk-mark" sym={bank.ticker ?? initials(bank.name_en)}
          logo={art?.logo} color={art?.color ?? 'var(--mv-hero)'} letters={bank.ticker ? 2 : 3}
        />
        <div className="bk-hero-main">
          <h1>{name}</h1>
          <p className="bk-meta">
            <span>{c.type[bank.bank_type]} · {c.ownership[bank.ownership]}{city ? ` · ${city}` : ''}</span>
            <CoverageChip coverage={coverage} />
          </p>
          {/* The two things a reader clicks next, as buttons rather than as
              rows in a definition list six sections down the page. */}
          <div className="bk-hero-links">
            {bank.website ? (
              <a className="bk-pill" href={bank.website} target="_blank" rel="noopener noreferrer">
                {bank.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            ) : null}
            {bank.ticker ? (
              <Link className="bk-pill" href={L(`/c/${bank.ticker}`)}>
                <bdi>{bank.ticker}</bdi> · {c.viewCompany}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* The answer first: every published headline rate, before any
          explanation of where it came from. */}
      {glance.length ? (
        <dl className="bk-glance">
          {glance.map((g) => (
            <div key={g.key}><dt>{g.label}</dt><dd><bdi>{g.value}</bdi></dd></div>
          ))}
        </dl>
      ) : null}

      {/* A bank we could not reach says so once, at the top, rather than
          letting every empty section imply the bank offers nothing. */}
      {bank.research_state === 'source_unreachable' ? (
        <p className="bk-unreachable">{c.unreachableNote}</p>
      ) : null}

      <section className="bk-section">
        <h2>{c.identity}</h2>
        <dl className="bk-dl">
          {bank.founded ? <div><dt>{c.founded}</dt><dd><bdi>{bank.founded}</bdi></dd></div> : null}
          {city ? <div><dt>{c.hq}</dt><dd className="txt">{city}</dd></div> : null}
          {bank.swift ? <div><dt>{c.swift}</dt><dd><bdi>{bank.swift}</bdi></dd></div> : null}
          {bank.cbi_licensed ? <div><dt>{c.licence}</dt><dd>✓</dd></div> : null}
        </dl>
      </section>

      {financials ? (
        <section className="bk-section">
          <div className="bk-section-head">
            <h2>{c.financials}</h2>
            <span className="bk-section-note">{c.financialsNote(String(financials.fiscalYear), financials.period)}</span>
            <Link className="bk-link bk-section-link" href={L(`/c/${bank.ticker}/financials`)}>
              {c.viewCompany} <i className="dir-go" aria-hidden="true">←</i>
            </Link>
          </div>
          <dl className="bk-dl">
            {FIN_ORDER.filter((k) => financials.values[k] != null).map((k) => (
              <div key={k}>
                <dt>{c.fin[k]}</dt>
                <dd><bdi>{k.endsWith('ratio') || k === 'lcr'
                  ? `${financials.values[k].toFixed(1)}%`
                  : iqd(financials.values[k])}</bdi></dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Never a bare heading: an empty list here used to be the only visible
          symptom of a failed query, and it read as "this bank has no
          services" rather than "we asked wrong". */}
      {services.length ? (
      <section className="bk-section">
        <h2>{c.services}</h2>
        <ul className="bk-services">
          {services.map((s) => (
            <li key={s.service_key} className={`is-${s.availability}`}
              title={s.availability === 'available' ? c.available
                : s.availability === 'unavailable' ? c.unavailable : c.unchecked}>
              {/* The glyph carries the state and the title carries the word,
                  so a screen reader is not left with a tick. */}
              <span className="bk-svc-icon" aria-hidden="true">
                {s.availability === 'available' ? '✓' : s.availability === 'unavailable' ? '✗' : '?'}
              </span>
              <span>{c.service[s.service_key as keyof typeof c.service] ?? s.service_key}</span>
              <span className="sr-only">
                {s.availability === 'available' ? c.available
                  : s.availability === 'unavailable' ? c.unavailable
                    : c.unchecked}
              </span>
            </li>
          ))}
        </ul>
      </section>
      ) : null}

      {deposits.length ? (
        <section className="bk-section">
          <h2>{c.deposits}</h2>
          <div className="bk-products">
            {deposits.map((p) => <Product key={p.id} p={p} facts={byProduct(p.id)} conditions={conditions} />)}
          </div>
        </section>
      ) : null}

      {loans.length ? (
        <section className="bk-section">
          <h2>{c.loans}</h2>
          <div className="bk-products">
            {loans.map((p) => <Product key={p.id} p={p} facts={byProduct(p.id)} conditions={conditions} />)}
          </div>
        </section>
      ) : null}

      {!products.length && bank.research_state !== 'source_unreachable' ? (
        <section className="bk-section"><p className="bk-empty">{c.noProducts}</p></section>
      ) : null}

      <section className="bk-section bk-sources">
        <h2>{c.sources}</h2>
        <p>{c.methodology}</p>
        <ul>
          {Array.from(new Set(facts.map((f) => f.source_url).filter(Boolean))).slice(0, 6).map((u) => (
            <li key={u as string}>
              <a className="bk-link" href={u as string} target="_blank" rel="noopener noreferrer">
                {(u as string).replace(/^https?:\/\/(www\.)?/, '').slice(0, 62)}
              </a>
            </li>
          ))}
        </ul>
        {bank.research_checked_at ? (
          <p className="bk-verified">{c.verifiedOn(localeDate(bank.research_checked_at, locale))}</p>
        ) : null}
      </section>
    </main>
  )
}

/* ── One product ──────────────────────────────────────────────────────────── */

function Product({ p, facts, conditions }: { p: ProductRow; facts: FactRow[]; conditions: ConditionRow[] }) {
  const { t: T, locale } = useLocale()
  const c = T.banks
  const name = locale === 'ar' ? p.name_ar : p.name_en
  const unconditional = facts.filter((f) => !f.is_conditional)
  const conditional = facts.filter((f) => f.is_conditional)
  const checkedFields = unconditional.filter((f) => f.state === 'UNKNOWN')
  const allUnpublished = facts.length > 0 && facts.every((f) => f.state !== 'KNOWN') && checkedFields.length > 1

  return (
    <article className="bk-product">
      <div className="bk-product-head">
        <h3>{name}</h3>
        {p.financing_type === 'islamic' ? <span className="bk-tag">{c.type.islamic}</span> : null}
        {p.has_conditions ? <span className="bk-tag bk-tag-cond">{c.conditionsApply}</span> : null}
      </div>

      {/* The headline. A rate that exists only under conditions is shown as a
          RANGE and labelled — never flattened into a single number, because
          «5%» would be wrong for most of the people reading it. */}
      <div className="bk-headline">
        {p.rate != null ? (
          <strong><bdi>{p.rate}%</bdi></strong>
        ) : p.rate_from != null && p.rate_to != null ? (
          <>
            <strong><bdi>{p.rate_from === p.rate_to ? `${p.rate_from}%` : c.rateRange(String(p.rate_from), String(p.rate_to))}</bdi></strong>
            <small>{c.dependsOn}</small>
          </>
        ) : (
          <span className="bk-na">{c.notPublishedShort}</span>
        )}
        {p.rate_basis ? <em>{c.rateBasis[p.rate_basis as 'reducing' | 'flat'] ?? p.rate_basis}</em> : null}
      </div>

      {/* A product where NOTHING is published — Bank of Baghdad names a gold
          loan and gives no terms at all — was rendering five identical rows of
          «the bank does not publish this». Same truth, said once, with the
          fields we checked named so the reader can see it was not laziness. */}
      {allUnpublished ? (
        <p className="bk-allunknown">
          {c.notPublished}
          <span> · {checkedFields.map((f) => (locale === 'ar' ? f.label_ar : f.label_en)).join('، ')}</span>
        </p>
      ) : (
        <dl className="bk-facts">
          {unconditional.filter((f) => f.field_key !== 'rate' && f.field_key !== 'rate_basis').map((f) => (
            <div key={f.id}>
              <dt>{locale === 'ar' ? f.label_ar : f.label_en}</dt>
              <dd><FactValue f={f} /></dd>
            </div>
          ))}
        </dl>
      )}

      {conditional.length ? (
        <div className="bk-conds">
          <h4>{c.conditionsHeading}</h4>
          <ul>
            {conditional.map((f) => (
              <li key={f.id}>
                <span className="bk-cond-value">
                  {locale === 'ar' ? f.label_ar : f.label_en}: <FactValue f={f} />
                </span>
                <span className="bk-cond-when">
                  {conditions.filter((x) => x.fact_id === f.id).map((x, i) => (
                    <span key={i}>{describe(x, c)}</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {p.last_verified ? (
        <p className="bk-verified">{c.verifiedOn(localeDate(p.last_verified, locale))}</p>
      ) : null}
    </article>
  )
}

/** The four states, each in its own words. */
function FactValue({ f }: { f: FactRow }) {
  const { t: T, locale } = useLocale()
  const c = T.banks
  if (f.state === 'UNKNOWN') return <span className="bk-na" title={f.source_url ?? undefined}>{c.notPublished}</span>
  if (f.state === 'SOURCE_UNAVAILABLE') return <span className="bk-na">{c.sourceUnavailable}</span>
  if (f.state === 'NOT_APPLICABLE') return <span className="bk-na">{c.notApplicable}</span>
  if (f.state === 'UNVERIFIED') return <span className="bk-na">{c.notChecked}</span>
  if (f.value_bool != null) return <bdi>{f.value_bool ? '✓' : '✗'}</bdi>
  if (f.value_text != null) {
    const k = f.value_text as 'reducing' | 'flat'
    if (c.rateBasis[k]) return <bdi>{c.rateBasis[k]}</bdi>
    /* Free prose: the bank's own Arabic is the evidence, our English is the
       rendering. Showing the Arabic to an English reader was a real leak. */
    const shown = locale === 'ar' ? f.value_text : (f.value_text_en ?? f.value_text)
    return <span>{shown}</span>
  }
  if (f.value_num == null) return <span className="bk-na">—</span>
  if (f.unit === 'percent') return <bdi>{f.value_num}%</bdi>
  if (f.unit === 'months') return <bdi>{f.value_num % 12 === 0 ? c.years(String(f.value_num / 12)) : c.months(String(f.value_num))}</bdi>
  if (f.unit === 'iqd') return <bdi>{iqd(f.value_num)}</bdi>
  return <bdi>{f.value_num}</bdi>
}

/** «الراتب ≥ 500,000» — the rule, in the reader's language. */
function describe(x: ConditionRow, c: any): string {
  const field = c.condField[x.field_key] ?? x.field_key
  const op = c.condOp[x.op] ?? x.op
  /* A number means nothing without its unit. «المدة = 6» was the months of a
     term deposit rendered as a bare 6, next to «الراتب ≥ 500K» where the
     compact-dinar form is right. The unit belongs to the FIELD. */
  const num = (n: number) =>
    x.field_key === 'term_months' || x.field_key === 'employment_months'
      ? (n % 12 === 0 && n >= 12 ? c.years(String(n / 12)) : c.months(String(n)))
      : x.field_key === 'age' ? String(n)
        : iqd(n)
  const raw = x.value_set
    ? x.value_set.map((v) => c.condValue[v] ?? v).join(' / ')
    : x.value_bool != null
      ? c.condValue[String(x.value_bool)]
      : x.value_text != null
        ? (c.condValue[x.value_text] ?? x.value_text)
        : x.value_num != null ? num(x.value_num) : ''
  /* A boolean condition reads better as a statement than as «= yes». */
  if (x.value_bool === true && x.op === 'eq') return field
  /* A negated boolean gets its own phrasing rather than an operator glyph:
     «≠ الراتب موطَّن لدى المصرف» is not a sentence in either language. */
  if (x.value_bool === false && x.op === 'eq') return c.condFieldNo[x.field_key] ?? `${c.condOp.ne} ${field}`
  return `${field} ${op} ${raw}`
}
