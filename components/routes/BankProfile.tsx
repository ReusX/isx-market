'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { CoverageChip, iqd } from './BanksHub'
import { CompanyLogo } from '@/components/CompanyLogo'
import companiesData from '@/public/data/companies.json'
import type {
  Bank, ProductRow, ServiceRow, FactRow, ConditionRow, BankFinancials, Coverage,
} from '@/lib/banks'
import '@/styles/banks.css'

/**
 * /banks/[slug].
 *
 * ── The hierarchy is fixed, and it is not the order the data arrives in ───
 *   identity and a factual sentence  →  financial snapshot, where the exchange
 *   supports one  →  services we verified  →  deposits  →  financing  →  a
 *   compact source list.
 *
 * ── One rate per product ─────────────────────────────────────────────────
 * A tiered deposit grid has nine rows and publishing all of them is a wall of
 * percentages nobody reads. The seed selects ONE scenario — the ordinary
 * retail one — and carries its conditions with it; the other tiers stay in the
 * research record and are described in a sentence. The number on screen is
 * never a "rate for the bank": it belongs to a product, a currency, a tenor
 * and a set of conditions, all of which are shown next to it.
 *
 * ── Four kinds of absence ────────────────────────────────────────────────
 *   the bank publishes it            → the value
 *   the bank does not publish it     → «لم ينشر المصرف هذه المعلومة»
 *   only a cached copy could be read → «تعذّر التحقق من المصدر»
 *   nobody has looked                → the row is simply absent
 *
 * ── Status is not coverage ───────────────────────────────────────────────
 * Liquidation, guardianship, USD restriction and "we could not read the site"
 * are four independent facts. A bank in liquidation with a published rate card
 * shows both, because the rate card being published does not make the bank
 * open.
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
  const verified = services.filter((s) => s.availability === 'available')
  const sources = Array.from(new Set(facts.map((f) => f.source_url).filter(Boolean))) as string[]

  return (
    <main className="iq-page bk-page">
      <Link className="bk-back" href={L('/banks')}>
        <span className="dir-go" aria-hidden="true">›</span> {c.backToBanks}
      </Link>

      {/* ── identity ─────────────────────────────────────────────────────── */}
      <header className="bk-hero-card">
        {/* Latin initials for an unlisted bank: «مص» — the first two letters
            of «مصرف» — is the same monogram for every Iraqi bank. */}
        <CompanyLogo className="bk-mark" sym={bank.ticker ?? initials(bank.name_en)}
          logo={art?.logo} color={art?.color ?? 'var(--mv-hero)'} letters={bank.ticker ? 2 : 3} />
        <div className="bk-hero-main">
          <h1>{name}</h1>
          <p className="bk-meta">
            <span>{c.type[bank.bank_type]} · {c.ownership[bank.ownership]}{city ? ` · ${city}` : ''}</span>
            {bank.operating_status !== 'operating'
              ? <span className={`bk-flag is-${bank.operating_status}`}>{c.status[bank.operating_status]}</span>
              : null}
            {bank.usd_restricted ? <span className="bk-flag is-usd">{c.usdRestricted}</span> : null}
            <CoverageChip coverage={coverage} />
          </p>
          <p className="bk-intro">{intro(bank, c, city)}</p>
          <div className="bk-hero-links">
            {bank.website ? (
              <a className="bk-pill" href={bank.website} target="_blank" rel="noopener noreferrer">
                {bank.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            ) : null}
            {bank.ticker ? (
              <Link className="bk-pill" href={L(`/c/${bank.ticker}`)}>
                <bdi>{bank.ticker}</bdi> · {c.linkedCompany}
              </Link>
            ) : null}
            {bank.swift ? <span className="bk-pill is-static">SWIFT <bdi>{bank.swift}</bdi></span> : null}
          </div>
        </div>
      </header>

      {/* A status notice earns the top of the page: it changes what every
          number below it means. */}
      {bank.operating_status !== 'operating' ? (
        <p className={`bk-notice is-${bank.operating_status}`}>{c.statusNote[bank.operating_status]}</p>
      ) : null}
      {bank.usd_restricted ? <p className="bk-notice is-usd">{c.usdRestrictedNote}</p> : null}
      {bank.research_state === 'source_unreachable' ? (
        <p className="bk-notice is-unreachable">{c.unreachableNote}</p>
      ) : null}
      {bank.research_state === 'not_researched' ? (
        <p className="bk-notice">{c.notResearchedNote}</p>
      ) : null}

      {/* ── financial snapshot, read from the exchange ───────────────────── */}
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

      {/* ── services · only what a source confirmed ──────────────────────── */}
      {verified.length ? (
        <section className="bk-section">
          <h2>{c.services}</h2>
          <ul className="bk-services">
            {verified.map((s) => (
              <li key={s.service_key} className="is-available">
                <span className="bk-svc-icon" aria-hidden="true">✓</span>
                <span>{c.service[s.service_key as keyof typeof c.service] ?? s.service_key}</span>
              </li>
            ))}
          </ul>
          {/* A published USD account is not permission to move dollars. */}
          {bank.usd_restricted && verified.some((s) => s.service_key === 'usd_account')
            ? <p className="bk-section-foot">{c.usdRestrictedNote}</p> : null}
        </section>
      ) : null}

      {deposits.length ? (
        <section className="bk-section" id="deposits">
          <div className="bk-section-head">
            <h2>{c.deposits}</h2>
            <span className="bk-section-note">{c.ratePickedNote}</span>
          </div>
          <div className="bk-products">
            {deposits.map((p) => <Product key={p.id} p={p} facts={byProduct(p.id)} conditions={conditions} />)}
          </div>
        </section>
      ) : null}

      {loans.length ? (
        <section className="bk-section" id="loans">
          <div className="bk-section-head">
            <h2>{c.loans}</h2>
            {!deposits.length ? <span className="bk-section-note">{c.ratePickedNote}</span> : null}
          </div>
          <div className="bk-products">
            {loans.map((p) => <Product key={p.id} p={p} facts={byProduct(p.id)} conditions={conditions} />)}
          </div>
        </section>
      ) : null}

      {!products.length && bank.research_state === 'researched' ? (
        <section className="bk-section"><p className="bk-empty">{c.noProducts}</p></section>
      ) : null}

      {/* ── sources · compact, and collapsed when there are many ─────────── */}
      {sources.length ? (
        <section className="bk-section bk-sources">
          <details>
            <summary>{c.sources} <bdi>· {c.sourceCount(String(sources.length))}</bdi></summary>
            <p>{c.methodology}</p>
            <ul>
              {sources.slice(0, 10).map((u) => (
                <li key={u}>
                  <a className="bk-link" href={u} target="_blank" rel="noopener noreferrer">
                    {u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 72)}
                  </a>
                </li>
              ))}
            </ul>
            {bank.research_checked_at ? (
              <p className="bk-verified">{c.verifiedOn(localeDate(bank.research_checked_at, locale))}</p>
            ) : null}
          </details>
        </section>
      ) : null}
    </main>
  )
}

/** Initials for a bank with no ticker — Rafidain, Rasheed, TBI. */
function initials(en: string): string {
  return en.replace(/\b(bank|of|for|the|and)\b/gi, ' ').trim().slice(0, 3).toUpperCase() || 'BK'
}

/**
 * The factual sentence under the name.
 *
 * Assembled from typed fields and dictionary fragments, never written per
 * bank: seventy-nine hand-written introductions would be seventy-nine chances
 * to say something the data does not support, and a generated paragraph of
 * adjectives is worse than no paragraph. Everything in it appears elsewhere on
 * the page.
 */
function intro(bank: Bank, c: any, city: string | null): string {
  const parts = [c.introKind(c.typeAdj[bank.bank_type], c.ownershipAdj[bank.ownership])]
  if (city) parts.push(c.introCity(city))
  if (bank.founded) parts.push(c.introFounded(String(bank.founded)))
  if (bank.ticker) parts.push(c.introListed(bank.ticker))
  if (bank.cbi_licensed) parts.push(c.introLicensed)
  return `${parts.join(c.introJoin)}.`
}

/* ── One product ──────────────────────────────────────────────────────────── */

function Product({ p, facts, conditions }: { p: ProductRow; facts: FactRow[]; conditions: ConditionRow[] }) {
  const { t: T, locale } = useLocale()
  const c = T.banks
  const name = locale === 'ar' ? p.name_ar : p.name_en
  /* The selected scenario is the single rate fact the seed declares, whether
     or not it carries conditions. Its conditions ARE the scenario — currency,
     tenor, tier — so they are rendered with it rather than in a separate
     block. */
  const rateFact = facts.find((f) => f.field_key === 'rate')
  const basis = facts.find((f) => f.field_key === 'rate_basis')
  const detail = facts.filter((f) => !['rate', 'rate_basis'].includes(f.field_key))
  const scenario = rateFact ? conditions.filter((x) => x.fact_id === rateFact.id) : []
  const unpublished = detail.filter((f) => f.state === 'UNKNOWN')
  const allUnpublished = facts.length > 0 && facts.every((f) => f.state !== 'KNOWN')

  return (
    <article className="bk-product">
      <div className="bk-product-head">
        <h3>{name}</h3>
        {p.currency && p.currency !== 'IQD' ? <span className="bk-tag"><bdi>{p.currency}</bdi></span> : null}
        {p.financing_type === 'islamic' ? <span className="bk-tag">{c.type.islamic}</span> : null}
      </div>

      <div className="bk-headline">
        {rateFact?.state === 'KNOWN' && rateFact.value_num != null ? (
          <>
            <strong><bdi>{rateFact.value_num}%</bdi></strong>
            {basis?.state === 'KNOWN' && basis.value_text
              ? <em>{c.rateBasis[basis.value_text as keyof typeof c.rateBasis] ?? basis.value_text}</em>
              : basis?.state === 'UNKNOWN' ? <em className="bk-na">{c.rateBasis.unstated}</em> : null}
          </>
        ) : (
          <span className="bk-na">
            {rateFact?.state === 'SOURCE_UNAVAILABLE' ? c.sourceUnavailable : c.noRatePublished}
          </span>
        )}
      </div>

      {/* The conditions that make the number true. Never optional: 4.25% for
          twelve months is a different offer from 4.25% for one. */}
      {scenario.length ? (
        <p className="bk-scenario">
          {scenario.map((x, i) => <span key={i}>{describe(x, c)}</span>)}
        </p>
      ) : null}

      {/* What else the selected rate does not say. */}
      {noteOf(rateFact, locale) ? <p className="bk-rate-note">{noteOf(rateFact, locale)}</p> : null}

      {allUnpublished && unpublished.length > 1 ? (
        <p className="bk-allunknown">
          {c.notPublished}
          <span>· {unpublished.map((f) => (locale === 'ar' ? f.label_ar : f.label_en)).join('، ')}</span>
        </p>
      ) : detail.length ? (
        <dl className="bk-facts">
          {detail.map((f) => (
            <div key={f.id}>
              <dt>{locale === 'ar' ? f.label_ar : f.label_en}</dt>
              <dd><FactValue f={f} /></dd>
              {f.state === 'KNOWN' && noteOf(f, locale) ? <p className="bk-fact-note">{noteOf(f, locale)}</p> : null}
            </div>
          ))}
        </dl>
      ) : null}

      {p.last_verified ? (
        <p className="bk-verified">{c.verifiedShort(localeDate(p.last_verified, locale))}</p>
      ) : null}
    </article>
  )
}

/** A note is copy: Arabic in `note`, our English rendering in `note_en`. */
function noteOf(f: FactRow | undefined, locale: 'ar' | 'en'): string | null {
  if (!f) return null
  return (locale === 'ar' ? f.note : (f.note_en ?? f.note)) ?? null
}

/** The states, each in its own words. */
function FactValue({ f }: { f: FactRow }) {
  const { t: T, locale } = useLocale()
  const c = T.banks
  if (f.state === 'UNKNOWN') return <span className="bk-na" title={f.source_url ?? undefined}>{c.notPublished}</span>
  if (f.state === 'SOURCE_UNAVAILABLE') return <span className="bk-na">{c.sourceUnavailable}</span>
  if (f.state === 'NOT_APPLICABLE') return <span className="bk-na">{c.notApplicable}</span>
  if (f.state === 'UNVERIFIED') return <span className="bk-na">{c.notChecked}</span>
  if (f.value_bool != null) return <bdi>{f.value_bool ? '✓' : '✗'}</bdi>
  if (f.value_text != null) {
    const k = f.value_text as keyof typeof c.rateBasis
    if (c.rateBasis[k]) return <bdi>{c.rateBasis[k]}</bdi>
    /* Free prose: the bank's own Arabic is the evidence, our English is the
       rendering. Showing the Arabic to an English reader was a real leak. */
    return <span>{locale === 'ar' ? f.value_text : (f.value_text_en ?? f.value_text)}</span>
  }
  if (f.value_num == null) return <span className="bk-na">—</span>
  if (f.unit === 'percent') return <bdi>{f.value_num}%</bdi>
  if (f.unit === 'months') return <bdi>{f.value_num % 12 === 0 && f.value_num >= 12 ? c.years(String(f.value_num / 12)) : c.months(String(f.value_num))}</bdi>
  if (f.unit === 'iqd' || f.unit === 'usd') return <bdi>{iqd(f.value_num, f.unit)}</bdi>
  return <bdi>{f.value_num}</bdi>
}

/** «لمدة 12 شهراً» · «الراتب ≥ 500,000» — the rule, in the reader's language. */
function describe(x: ConditionRow, c: any): string {
  const field = c.condField[x.field_key] ?? x.field_key
  const op = c.condOp[x.op] ?? x.op
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
  if (x.value_bool === true && x.op === 'eq') return field
  if (x.value_bool === false && x.op === 'eq') return c.condFieldNo[x.field_key] ?? `${c.condOp.ne} ${field}`
  /* An equality on a tenor reads as a scenario, not as an algebraic claim. */
  if (x.field_key === 'term_months' && x.op === 'eq') return `${field}: ${raw}`
  return `${field} ${op} ${raw}`
}
