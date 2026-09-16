'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { CoverageChip, iqd } from './BanksHub'
import { CompanyLogo } from '@/components/CompanyLogo'
import companiesData from '@/public/data/companies.json'
import { isCurrentEnough } from '@/lib/banks'
import type {
  Bank, ProductRow, ServiceRow, FactRow, ConditionRow, BankFinancials, Coverage,
} from '@/lib/banks'
import {
  CATEGORY_KEYS, ratedCategoryCount, METHODOLOGY_AR,
  type EditorialProfile, type EditorialProduct, type CategoryKey,
} from '@/lib/bankEditorial'
import '@/styles/banks.css'

/**
 * /banks/[slug].
 *
 * ── The hierarchy is fixed, and it is the order a customer asks in ───────
 *   who is this bank, in one sentence  →  suits / watch out / how sure we are
 *   →  the editorial rating, each score with its sentence  →  the one or two
 *   products that matter, one rate each  →  the fees that matter  →  what the
 *   bank offers against what users report  →  two or three questions  →  the
 *   links you actually need, and the sources behind a small toggle.
 *
 *   The financial snapshot stays a join to the company record and sits low:
 *   this page is for someone choosing where to keep a salary, not an
 *   investor, and /c/[sym] is one link away.
 *
 * ── Two layers, kept apart ───────────────────────────────────────────────
 *   FACTS  from the fact tables: state, source, condition hash, freshness.
 *   COPY   from content/banks/profiles.ar.json: the verdict, the ratings, the
 *          FAQs. Desk-research judgments, said to be so every time.
 *   A product on this page is the join of the two: the package's name and
 *   summary and its ONE selected rate, with the sourced facts behind a
 *   disclosure. A rating never becomes a fact, and a fact never gets a score.
 *
 * ── «غير مقيّم» is not 0/5 ───────────────────────────────────────────────
 *   Support was not scored for any bank — the complaints available do not
 *   measure how problems end. So the overall figure, where one exists, covers
 *   80% of the weights and says so beside the number, on every viewport.
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
  /** The editorial layer, when the package wrote one. All 79 have one today;
   *  the page still renders without it. */
  editorial: EditorialProfile | null
}

const FIN_ORDER = [
  'total_assets', 'customer_deposits', 'total_equity',
  'net_income', 'paid_capital', 'capital_adequacy_ratio', 'lcr',
] as const

export function BankProfile({ bank, products, facts, conditions, services, financials, coverage, editorial: ed }: Props) {
  const { t: T, locale, href: L } = useLocale()
  const c = T.banks
  const e = c.ed
  const ar = locale === 'ar'
  const name = ar ? bank.name_ar : bank.name_en
  const city = bank.hq_city ? (c.city[bank.hq_city] ?? bank.hq_city) : null
  const byProduct = (id: number) => facts.filter((f) => f.product_id === id)
  const art = bank.ticker
    ? (companiesData as { sym: string; logo?: string; color?: string }[]).find((x) => x.sym === bank.ticker)
    : undefined
  const rated = ed ? ratedCategoryCount(ed) : 0
  const available = services.filter((s) => s.availability === 'available')
  const productRows = new Map(products.map((p) => [p.slug, p]))
  const sources = sourceList(ed, facts)

  return (
    <main className="iq-page bk-page">
      <Link className="bk-back" href={L('/banks')}>
        <span className="dir-go" aria-hidden="true">›</span> {c.backToBanks}
      </Link>

      {/* ── Who this is, in one line and one paragraph ─────────────────── */}
      <header className="bk-hero-card">
        <CompanyLogo className="bk-mark" sym={bank.ticker ?? initials(bank.name_en)}
          logo={art?.logo} color={art?.color ?? 'var(--mv-hero)'} letters={bank.ticker ? 2 : 3} />
        <div className="bk-hero-main">
          <h1>{ar && ed ? ed.h1 : name}</h1>
          <p className="bk-meta">
            <span>{c.type[bank.bank_type]} · {c.ownership[bank.ownership]}{city ? ` · ${city}` : ''}</span>
            {bank.operating_status !== 'operating' ? (
              <span className={`bk-flag is-${bank.operating_status}`}>
                {(ar ? bank.status_note_ar : bank.status_note_en) ?? c.status[bank.operating_status]}
              </span>
            ) : null}
            {bank.usd_restricted ? <span className="bk-flag is-usd">{c.usdRestricted}</span> : null}
          </p>
          <p className="bk-intro">{ar && ed ? ed.intro : intro(bank, c, city)}</p>
        </div>
      </header>

      {bank.operating_status !== 'operating' ? (
        <p className={`bk-notice is-${bank.operating_status}`}>{c.statusNote[bank.operating_status]}</p>
      ) : null}
      {bank.research_state === 'source_unreachable' ? (
        <p className="bk-notice is-unreachable">{c.unreachableNote}</p>
      ) : null}

      {/* ── Suits / watch out ──────────────────────────────────────────── */}
      {ed ? (
        <section className="bk-verdict" aria-label={e.verdict}>
          {ar ? (
            <>
              <div className="bk-verdict-cell"><h2>{e.suitableFor}</h2><p>{ed.suitableFor}</p></div>
              <div className="bk-verdict-cell is-warn"><h2>{e.watchOut}</h2><p>{ed.watchOut}</p></div>
            </>
          ) : (
            <div className="bk-verdict-cell">
              <h2>{e.verdict}</h2>
              <p>{e.arabicOnly} <Link className="bk-link" href={`/banks/${bank.slug}`} lang="ar">{e.arabicLink}</Link></p>
            </div>
          )}
        </section>
      ) : null}

      {/* ── The rating: one number, one line, six short rows ───────────── */}
      {ed ? <Ratings ed={ed} rated={rated} /> : null}

      {/* ── Products: name, one rate, one line of conditions ───────────── */}
      {ed?.products.length ? (
        <section className="bk-section" id="products">
          <h2>{e.products}</h2>
          <div className="bk-picks">
            {ed.products.map((p) => {
              const row = productRows.get(p.slug)
              return <Pick key={p.slug} p={p} row={row ?? null} facts={row ? byProduct(row.id) : []} conditions={conditions} />
            })}
          </div>
          {ed.products.some((p) => p.rate) ? <p className="bk-foot">{e.ratesFoot}</p> : null}
        </section>
      ) : !ed && products.length ? (
        <section className="bk-section">
          <h2>{c.deposits} · {c.loans}</h2>
          <div className="bk-products">
            {products.map((p) => <Product key={p.id} p={p} facts={byProduct(p.id)} conditions={conditions} />)}
          </div>
        </section>
      ) : null}

      {ar && ed?.fees ? (
        <section className="bk-section">
          <h2>{e.fees}</h2>
          <p className="bk-fees">{ed.fees}</p>
        </section>
      ) : null}

      {/* ── Services the bank publishes, and the app in one line ───────── */}
      {(available.length || ed?.app || (ar && ed)) ? (
        <section className="bk-section">
          <h2>{e.experience}</h2>
          <div className="bk-panel-flat">
            {available.length ? (
              <ul className="bk-services">
                {available.map((s) => (
                  <li key={s.service_key} className="is-available">
                    <span className="bk-svc-icon" aria-hidden="true">✓</span>
                    <span>{c.service[s.service_key as keyof typeof c.service] ?? s.service_key}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {available.some((s) => s.service_key === 'usd_account') && bank.usd_restricted
              ? <p className="bk-foot">{c.usdRestrictedNote}</p> : null}

            {ed?.app || (ar && ed) ? (
              <div className="bk-app">
                <div className="bk-app-head">
                  <b>{e.app}</b>
                  {ed?.ratings.categories.mobile?.score != null
                    ? <Score n={ed.ratings.categories.mobile.score} />
                    : <em className="bk-na">{e.notRated}</em>}
                  {ed?.app ? <a className="bk-link" href={ed.app.url} target="_blank" rel="noopener noreferrer">{e.appLink}</a> : null}
                </div>
                {ar && ed ? <p className="bk-prose">{ed.experience}</p> : null}
                {ed?.app ? <p className="bk-foot">{e.reportedFoot}</p> : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {ar && ed?.faqs.length ? (
        <section className="bk-section" id="faq">
          <h2>{e.faqs}</h2>
          <dl className="bk-faq">
            {ed.faqs.map((f, i) => (
              <div key={i}><dt>{f.q}</dt><dd>{f.a}</dd></div>
            ))}
          </dl>
        </section>
      ) : null}

      {financials ? (
        <section className="bk-section">
          <div className="bk-section-head">
            <h2>{c.financials}</h2>
            <span className="bk-section-note">{c.financialsNote(String(financials.fiscalYear), financials.period)}</span>
            <Link className="bk-link bk-section-link" href={L(`/c/${bank.ticker}/financials`)}>
              {c.viewCompany} <i className="dir-go" aria-hidden="true">←</i>
            </Link>
          </div>
          <dl className="bk-dl is-compact">
            {FIN_ORDER.filter((k) => financials.values[k] != null).slice(0, 4).map((k) => (
              <div key={k}>
                <dt>{c.fin[k]}</dt>
                <dd><bdi>{k.endsWith('ratio') || k === 'lcr' ? `${financials.values[k].toFixed(1)}%` : iqd(financials.values[k])}</bdi></dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* ── Links, then sources behind a toggle ────────────────────────── */}
      <section className="bk-section bk-sources">
        <h2>{e.links}</h2>
        <div className="bk-hero-links">
          {bank.website ? (
            <a className="bk-pill" href={bank.website} target="_blank" rel="noopener noreferrer">
              {bank.website.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          ) : null}
          {bank.ticker ? (
            <Link className="bk-pill" href={L(`/c/${bank.ticker}`)}><bdi>{bank.ticker}</bdi> · {c.linkedCompany}</Link>
          ) : null}
          {ed?.links.filter((l) => l.url !== bank.website).map((l, i) => (
            <a key={i} className="bk-pill" href={l.url} target="_blank" rel="noopener noreferrer">
              {ar ? l.label : l.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
            </a>
          ))}
        </div>
        <details className="bk-details">
          <summary>{e.sourcesToggle(String(sources.length))}</summary>
          <ul>
            {sources.map((u) => (
              <li key={u.url}>
                <a className="bk-link" href={u.url} target="_blank" rel="noopener noreferrer">
                  {u.title ?? u.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70)}
                </a>
                {u.date ? <small> · {u.date}</small> : null}
              </li>
            ))}
          </ul>
          <p className="bk-verified">
            {c.methodology}
            {bank.research_checked_at ? ` ${c.verifiedOn(localeDate(bank.research_checked_at, locale))}.` : ''}
          </p>
        </details>
        {ed ? <p className="bk-foot">{e.editorialNotice}</p> : null}
      </section>
    </main>
  )
}

/** «4/5» with a five-segment bar. Never rendered for a null. */
function Score({ n, outOf = 5 }: { n: number; outOf?: number }) {
  return (
    <span className="bk-score-inline">
      <bdi><b>{n}</b>/{outOf}</bdi>
      <span className="bk-bar" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((k) => (
          <i key={k} className={k <= Math.floor(n) ? 'on' : k - 0.5 === n ? 'half' : ''} />
        ))}
      </span>
    </span>
  )
}

/* ── The rating block ───────────────────────────────────────────────────── */

function Ratings({ ed, rated }: { ed: EditorialProfile; rated: number }) {
  const { t: T, locale } = useLocale()
  const e = T.banks.ed
  const ar = locale === 'ar'
  const r = ed.ratings

  return (
    <section className="bk-section" id="rating">
      <h2>{e.ratings}</h2>

      {rated === 0 ? (
        <p className="bk-empty-line">{e.notRatedLine}</p>
      ) : (
        <div className="bk-rating">
          <div className="bk-overall">
            {r.overall !== null ? (
              <strong><bdi>{r.overall}</bdi><small>/{r.outOf}</small></strong>
            ) : null}
            <div>
              <b>{r.overall !== null ? e.coverage.overall : e.coverage.partial}</b>
              <span>{r.overall !== null ? e.overallLine(String(rated)) : e.partialLine(String(rated))}</span>
            </div>
          </div>

          <ul className="bk-rating-rows">
            {CATEGORY_KEYS.map((k: CategoryKey) => {
              const cat = r.categories[k]
              if (!cat) return null
              return (
                <li key={k} className={cat.score === null ? 'is-unrated' : ''}>
                  <span>{e.category[k]}</span>
                  {cat.score !== null ? <Score n={cat.score} outOf={cat.outOf} /> : <em>{e.notRated}</em>}
                </li>
              )
            })}
          </ul>

          {/* The sentence behind each score, one toggle for all of them. */}
          {ar ? (
            <details className="bk-details bk-why-details">
              <summary>{e.why}</summary>
              <dl className="bk-why-list">
                {CATEGORY_KEYS.filter((k) => r.categories[k]?.score !== null).map((k) => (
                  <div key={k}><dt>{e.category[k]}</dt><dd>{r.categories[k].rationale}</dd></div>
                ))}
              </dl>
            </details>
          ) : null}
        </div>
      )}

      {/* A <details> cannot live inside a <p>; it hydrated wrong. */}
      <div className="bk-foot">
        {e.ratingsWhat}
        {ar ? (
          <details className="bk-details is-inline">
            <summary>{e.methodology}</summary>
            {METHODOLOGY_AR.split('\n').map((para, i) => <p key={i} className="bk-prose">{para}</p>)}
          </details>
        ) : null}
      </div>
    </section>
  )
}

/* ── One product row ───────────────────────────────────────────────────── */

function Pick({ p, row, facts, conditions }: {
  p: EditorialProduct; row: ProductRow | null; facts: FactRow[]; conditions: ConditionRow[]
}) {
  const { t: T, locale } = useLocale()
  const c = T.banks
  const e = c.ed
  const ar = locale === 'ar'
  const rateFact = facts.find((f) => f.field_key === 'rate')
  const detail = facts.filter((f) => !['rate', 'rate_basis'].includes(f.field_key))
  const scenario = rateFact ? conditions.filter((x) => x.fact_id === rateFact.id) : []
  return (
    <article className="bk-pick">
      <div className="bk-pick-main">
        <h3>{ar ? p.name : (row ? row.name_en : p.name)}</h3>
        {ar ? <p className="bk-prose">{p.summary}</p> : null}
      </div>
      <div className="bk-pick-rate">
        {p.rate ? (
          <>
            <strong><bdi>{p.rate.value}%</bdi></strong>
            <em>{e.basis[p.rate.basis]}</em>
            {ar ? <span className="bk-scenario-line">{p.rate.scenario}</span>
              : scenario.length ? <span className="bk-scenario-line">{scenario.map((x) => describe(x, c)).join(' · ')}</span> : null}
          </>
        ) : (
          <span className="bk-na">{e.noRateSelected}</span>
        )}
      </div>
      {detail.length ? (
        <details className="bk-details bk-pick-details">
          <summary>{e.detailsToggle}</summary>
          <dl className="bk-facts">
            {detail.map((f) => (
              <div key={f.id}>
                <dt>
                  {ar ? f.label_ar : f.label_en}
                  {f.is_conditional ? (
                    <small> · {conditions.filter((x) => x.fact_id === f.id).map((x) => describe(x, c)).join(' · ')}</small>
                  ) : null}
                </dt>
                <dd><FactValue f={f} /></dd>
                {f.state === 'KNOWN' && noteOf(f, locale) ? <p className="bk-fact-note">{noteOf(f, locale)}</p> : null}
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </article>
  )
}

/** The sources actually cited on this page, deduplicated, package first. */
function sourceList(ed: EditorialProfile | null, facts: FactRow[]): { url: string; title: string | null; date: string | null }[] {
  const seen = new Set<string>()
  const out: { url: string; title: string | null; date: string | null }[] = []
  for (const s of ed?.sources ?? []) if (!seen.has(s.url)) { seen.add(s.url); out.push({ url: s.url, title: s.title, date: s.date }) }
  for (const f of facts) if (f.source_url && !seen.has(f.source_url)) { seen.add(f.source_url); out.push({ url: f.source_url, title: null, date: null }) }
  return out.slice(0, 12)
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
  /* A figure the source published more than a year ago keeps its place on the
     page and loses the headline: it is shown in the detail list with the date
     it was published, so it reads as a dated figure rather than an offer. */
  const headline = rateFact && rateFact.state === 'KNOWN' && isCurrentEnough(rateFact) ? rateFact : null
  const dated = rateFact && rateFact.state === 'KNOWN' && !headline ? rateFact : null
  const detail = facts.filter((f) => !['rate', 'rate_basis'].includes(f.field_key))
  const scenario = headline ? conditions.filter((x) => x.fact_id === headline.id) : []
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
        {headline?.value_num != null ? (
          <>
            <strong><bdi>{headline.value_num}%</bdi></strong>
            {basis?.state === 'KNOWN' && basis.value_text
              ? <em>{c.rateBasis[basis.value_text as keyof typeof c.rateBasis] ?? basis.value_text}</em>
              : basis?.state === 'UNKNOWN' ? <em className="bk-na">{c.rateBasis.unstated}</em> : null}
          </>
        ) : (
          <span className="bk-na">
            {rateFact?.state === 'SOURCE_UNAVAILABLE' ? c.sourceUnavailable
              : rateFact?.state === 'UNVERIFIED' ? c.notChecked
                : dated ? c.noCurrentRate : c.noRatePublished}
          </span>
        )}
      </div>

      {/* The dated figure, said once, with the date that demoted it. */}
      {dated?.value_num != null ? (
        <p className="bk-dated">
          {c.datedRate(String(dated.value_num), localeDate(dated.effective_date!, locale))}
        </p>
      ) : null}

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
              {/* A conditional fact carries its condition in the label. Three
                  rows all labelled «أعلى مبلغ» with different numbers is not a
                  product summary, it is a puzzle. */}
              <dt>
                {locale === 'ar' ? f.label_ar : f.label_en}
                {f.is_conditional ? (
                  <small> · {conditions.filter((x) => x.fact_id === f.id).map((x) => describe(x, c)).join(' · ')}</small>
                ) : null}
              </dt>
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
