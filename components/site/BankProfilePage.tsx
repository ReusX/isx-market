'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import type { BankProfileInitial, ProfileProduct } from '@/lib/banksServer'
import { isCurrentEnough, type FactRow } from '@/lib/banks'
import { CATEGORY_KEYS, ratedCategoryCount, storeRatingText, type CategoryKey } from '@/lib/bankEditorial'
import { describeCondition, factText, factNote, introSentence, basisLabel } from '@/lib/bankFacts'
import '@/styles/banks-page.css'

/**
 * /banks/[slug] · one bank.
 *
 * A reading page, so it is constrained: identity first, then — in the
 * order a customer asks — the verdict where there is one, the rating with
 * each score's sentence, the published products with one rate each and the
 * conditions that make it true, the fees, the services, the financial
 * snapshot for listed banks, the questions, the links, and the sources.
 *
 * Every state has its own words. «Not published», «source unreachable»,
 * «not checked» and «not applicable» are four different facts and never
 * collapse into a dash. A rate the bank published more than a year ago is
 * shown with its date and never as the headline.
 *
 * Server-seeded by `loadBankProfile`; this component fetches nothing.
 */

const nf = new Intl.NumberFormat('en-US')
type Units = { tn: string; bn: string; mn: string; k: string }
function compact(v: number | null | undefined, u: Units): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const a = Math.abs(v), s = v < 0 ? '−' : ''
  if (a >= 1e12) return `${s}${(a / 1e12).toFixed(2)} ${u.tn}`
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(1)} ${u.bn}`
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(0)} ${u.mn}`
  return `${s}${nf.format(a)}`
}

export function BankProfilePage({ initial }: { initial: BankProfileInitial }) {
  const { t, locale, href: L } = useLocale()
  const B = t.banks
  const P = B.profile
  const E = B.ed
  const u = t.site.units
  const ar = locale === 'ar'
  const { bank, products, services, fin, editorial: ed } = initial
  const name = ar ? bank.name_ar : bank.name_en || bank.name_ar
  const city = bank.hq_city ? (ar ? bank.hq_city : (B.city[bank.hq_city] ?? bank.hq_city)) : null
  const rated = ed ? ratedCategoryCount(ed) : 0
  const svcKeys = ['mobile_banking', 'internet_banking', 'cards', 'usd_account', 'international_transfer', 'salary_domiciliation', 'atm'] as const

  const sources = (() => {
    const seen = new Set<string>()
    const out: { url: string; title: string | null; date: string | null }[] = []
    for (const s of ed?.sources ?? []) if (!seen.has(s.url)) { seen.add(s.url); out.push({ url: s.url, title: s.title, date: s.date }) }
    for (const p of products) for (const f of p.facts) if (f.source_url && !seen.has(f.source_url)) { seen.add(f.source_url); out.push({ url: f.source_url, title: null, date: null }) }
    return out.slice(0, 12)
  })()

  const identity: { k: string; v: React.ReactNode }[] = [
    { k: P.identity.type, v: B.type[bank.bank_type] },
    { k: P.identity.ownership, v: B.ownership[bank.ownership] },
    ...(bank.founded ? [{ k: P.identity.founded, v: <bdi>{bank.founded}</bdi> }] : []),
    ...(city ? [{ k: P.identity.hq, v: city }] : []),
    ...(bank.ticker ? [{ k: P.identity.ticker, v: <Link className="id-link" href={L(`/c/${bank.ticker}`)}><bdi>{bank.ticker}</bdi></Link> }] : []),
    ...(bank.website ? [{ k: P.identity.website, v: <a className="id-link" href={bank.website} target="_blank" rel="noopener"><bdi>{bank.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</bdi></a> }] : []),
    ...(bank.swift ? [{ k: P.identity.swift, v: <bdi>{bank.swift}</bdi> }] : []),
  ]

  return (
    <SiteShell>
      <main className="bnk id-full iq-door">
        <DoorRail door="banking" />
        <div className="bnk-body bnk-read">
          <header className="bnk-head">
            <p className="id-eyebrow"><Link href={L('/banks')}>{P.back}</Link> · {B.type[bank.bank_type]} · {B.ownership[bank.ownership]}</p>
            <div className="bnk-id">
              {initial.logo ? <img className="bnk-logo is-lg" src={initial.logo} alt="" width={48} height={48} /> : null}
              <PageTitle title={name} note={introSentence(bank, B, city)} />
            </div>
            <dl className="bnk-facts id-num">
              {identity.map((r) => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}
            </dl>
            {bank.operating_status !== 'operating' ? (
              <p className="id-note bnk-notice">
                <b>{B.status[bank.operating_status]}</b> · {B.statusNote[bank.operating_status as keyof typeof B.statusNote]}
                {(ar ? bank.status_note_ar : bank.status_note_en) ? ` ${ar ? bank.status_note_ar : bank.status_note_en}` : ''}
              </p>
            ) : null}
            {bank.usd_restricted ? <p className="id-note bnk-notice"><b>{B.usdRestricted}</b> · {B.usdRestrictedNote}</p> : null}
            {bank.research_state === 'source_unreachable' ? <p className="id-note bnk-notice">{B.unreachableNote}</p> : null}
            {bank.research_state === 'not_researched' ? <p className="id-note bnk-notice">{B.notResearchedNote}</p> : null}
          </header>

          {ed && ar ? (
            <section className="bnk-sec" aria-label={P.editorialTitle}>
              <h2 className="id-h3">{P.editorialTitle}</h2>
              {/* The editorial headline: the verdict in one line. */}
              {ed.h1 ? <p className="bnk-verdict-line">{ed.h1}</p> : null}
              <p className="id-body">{ed.intro}</p>
              <dl className="bnk-verdict">
                {ed.suitableFor ? <div><dt>{E.suitableFor}</dt><dd>{ed.suitableFor}</dd></div> : null}
                {ed.watchOut ? <div><dt>{E.watchOut}</dt><dd>{ed.watchOut}</dd></div> : null}
              </dl>
              <p className="id-cap">{E.editorialNotice}</p>
            </section>
          ) : null}

          {ed && rated ? (
            <section className="bnk-sec" aria-label={P.ratingsTitle}>
              <PageTitle as="h2" className="id-h3" title={P.ratingsTitle} note={E.ratingsWhat} />
              <div className="bnk-overall id-num">
                {ed.ratings.overall != null ? <strong><bdi>{ed.ratings.overall}</bdi><small>/{ed.ratings.outOf}</small></strong> : null}
                <span className="id-cap">{ed.ratings.overall != null ? E.overallLine(String(rated)) : E.partialLine(String(rated))}</span>
              </div>
              <table className="id-table bnk-rt id-num">
                <tbody>
                  {CATEGORY_KEYS.map((k: CategoryKey) => {
                    const c = ed.ratings.categories[k]
                    if (!c) return null
                    return (
                      <tr key={k}>
                        <th scope="row">
                          <span className="id-name">{E.category[k]}</span>
                          {ar && c.rationale ? <span className="id-sub">{c.rationale}</span> : null}
                        </th>
                        <td className="is-end bnk-rt-score">
                          {c.score != null ? <bdi>{c.score}<span className="id-cap">/{c.outOf}</span></bdi> : <span className="id-cap">{E.notRated}</span>}
                          {c.confidence ? <span className="id-sub">{E.confidence[c.confidence]}</span> : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {ed.app && storeRatingText(ed.app) ? (
                <p className="id-cap bnk-app">{E.app}: <a className="id-link" href={ed.app.url} target="_blank" rel="noopener">{ed.app.title}</a> · <bdi>{storeRatingText(ed.app)}</bdi> · {E.reportedFoot}</p>
              ) : null}
            </section>
          ) : null}

          {products.length ? (
            <section className="bnk-sec" aria-label={P.productsTitle}>
              <PageTitle as="h2" className="id-h3" title={P.productsTitle} note={P.productsNote} />
              <div className="bnk-products">
                {products.map((p) => <Product key={p.id} p={p} />)}
              </div>
              <p className="id-cap">{E.ratesFoot}</p>
            </section>
          ) : null}

          {ed && ar && ed.fees ? (
            <section className="bnk-sec" aria-label={E.fees}>
              <h2 className="id-h3">{E.fees}</h2>
              <p className="id-body">{ed.fees}</p>
            </section>
          ) : null}

          {services.length ? (
            <section className="bnk-sec" aria-label={P.servicesTitle}>
              <PageTitle as="h2" className="id-h3" title={P.servicesTitle} note={P.servicesNote} />
              <ul className="bnk-svc">
                {svcKeys.map((k) => {
                  const s = services.find((x) => x.service_key === k)
                  if (!s) return null
                  return (
                    <li key={k} className={`is-${s.availability}`}>
                      <i aria-hidden="true">{s.availability === 'available' ? '✓' : s.availability === 'unavailable' ? '✗' : '?'}</i>
                      <span>{B.service[k]}</span>
                      <small className="id-cap">{s.availability === 'available' ? B.available : s.availability === 'unavailable' ? B.unavailable : B.unchecked}{s.verified_at ? ` · ${localeDate(s.verified_at, locale)}` : ''}</small>
                    </li>
                  )
                })}
              </ul>
              {ed && ar && ed.experience ? <p className="id-body">{ed.experience}</p> : null}
            </section>
          ) : null}

          {fin && bank.ticker ? (
            <section className="bnk-sec" aria-label={P.finTitle}>
              <h2 className="id-h3">{P.finTitle}</h2>
              <p className="id-cap">{B.financialsNote(String(fin.fiscalYear), fin.period === 'ANNUAL' ? '' : fin.period)}</p>
              <div className="id-stats id-num bnk-fin">
                {(['total_assets', 'customer_deposits', 'total_equity', 'net_income'] as const).filter((k) => fin.values[k] != null).map((k) => (
                  <div className="id-stat" key={k}><small>{B.fin[k]}</small><b><bdi>{compact(fin.values[k], u)}</bdi></b></div>
                ))}
                {fin.values.capital_adequacy_ratio != null ? (
                  <div className="id-stat"><small>{B.fin.capital_adequacy_ratio}</small>{/* Filed as a percentage figure already (52.97 = 52.97%). */}
                  <b><bdi>{fin.values.capital_adequacy_ratio.toFixed(1)}%</bdi></b></div>
                ) : null}
              </div>
              <p><Link className="id-btn is-sm" href={L(`/c/${bank.ticker}/financials`)}>{P.finLink} →</Link></p>
            </section>
          ) : null}

          {ed && ar && ed.faqs.length ? (
            <section className="bnk-sec" aria-label={P.faqsTitle}>
              <h2 className="id-h3">{P.faqsTitle}</h2>
              {/* Native <details>: the answers stay in the markup. */}
              {ed.faqs.map((f, i) => (
                <details key={i} className="bnk-faq">
                  <summary>{f.q}</summary>
                  <p className="id-body">{f.a}</p>
                </details>
              ))}
            </section>
          ) : null}

          {(ed?.links.length || sources.length) ? (
            <section className="bnk-sec" aria-label={P.linksTitle}>
              {ed?.links.length ? (
                <>
                  <h2 className="id-h3">{P.linksTitle}</h2>
                  <ul className="bnk-links">
                    {ed.links.map((l) => <li key={l.url}><a className="id-link" href={l.url} target="_blank" rel="noopener">{l.label} ↗</a></li>)}
                  </ul>
                </>
              ) : null}
              {sources.length ? (
                <details className="bnk-src">
                  <summary className="id-cap">{P.sourcesTitle(String(sources.length))}</summary>
                  <ol>
                    {sources.map((s) => (
                      <li key={s.url} className="id-cap"><a className="id-link" href={s.url} target="_blank" rel="noopener"><bdi>{s.title ?? s.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 72)}</bdi></a>{s.date ? ` · ${localeDate(s.date, locale)}` : ''}</li>
                    ))}
                  </ol>
                </details>
              ) : null}
            </section>
          ) : null}

          {ed && !ar ? <p className="id-cap"><Link className="id-link" href={`/banks/${bank.slug}`}>{E.arabicLink}</Link> · {E.arabicOnly}</p> : null}

          <AboutSection title={P.aboutTitle} body={P.aboutBody} />
        </div>
      </main>
    </SiteShell>
  )
}

/* ── One product: one rate, its scenario, then the facts ─────────────────── */
function Product({ p }: { p: ProfileProduct }) {
  const { t, locale } = useLocale()
  const B = t.banks
  const ar = locale === 'ar'
  const name = ar ? p.name_ar : p.name_en
  const rateFact = p.facts.find((f) => f.field_key === 'rate')
  const basis = p.facts.find((f) => f.field_key === 'rate_basis')
  /* A figure the source published more than a year ago keeps its place on
     the page and loses the headline. */
  const headline = rateFact && rateFact.state === 'KNOWN' && isCurrentEnough(rateFact) ? rateFact : null
  const dated = rateFact && rateFact.state === 'KNOWN' && !headline ? rateFact : null
  const detail = p.facts.filter((f) => !['rate', 'rate_basis'].includes(f.field_key))
  const scenario = headline ? p.conditions.filter((x) => x.fact_id === headline.id) : []
  const allUnknown = p.facts.length > 0 && p.facts.every((f) => f.state !== 'KNOWN')
  const condOf = (f: FactRow) => p.conditions.filter((x) => x.fact_id === f.id).map((x) => describeCondition(x, B)).join(' · ')

  return (
    <article className="bnk-prod">
      <header className="bnk-prod-head">
        <h3 className="bnk-prod-name">{name}{p.currency && p.currency !== 'IQD' ? <span className="bnk-chip"><bdi>{p.currency}</bdi></span> : null}{p.financing_type === 'islamic' ? <span className="bnk-chip">{B.type.islamic}</span> : null}</h3>
        <p className="bnk-prod-rate id-num">
          {headline?.value_num != null ? (
            <>
              <strong><bdi>{headline.value_num}%</bdi></strong>
              <span className="id-cap">
                {basis?.state === 'KNOWN' && basis.value_text ? (basisLabel(basis.value_text, B) ?? basis.value_text)
                  : basis?.state === 'UNKNOWN' ? B.rateBasis.unstated : null}
              </span>
            </>
          ) : (
            <span className="id-cap">
              {rateFact?.state === 'SOURCE_UNAVAILABLE' ? B.sourceUnavailable : rateFact?.state === 'UNVERIFIED' ? B.notChecked : dated ? B.noCurrentRate : B.noRatePublished}
            </span>
          )}
        </p>
      </header>
      {scenario.length ? <p className="id-cap bnk-prod-when">{scenario.map((x) => describeCondition(x, B)).join(' · ')}</p> : null}
      {dated?.value_num != null && dated.effective_date ? <p className="id-cap bnk-prod-when">{B.datedRate(String(dated.value_num), localeDate(dated.effective_date, locale))}</p> : null}
      {factNote(rateFact, locale) ? <p className="id-cap bnk-prod-when">{factNote(rateFact, locale)}</p> : null}

      {allUnknown && detail.length > 1 ? (
        <p className="id-cap">{B.notPublished} · {detail.map((f) => (ar ? f.label_ar : f.label_en)).join(ar ? '، ' : ', ')}</p>
      ) : detail.length ? (
        <dl className="bnk-facts id-num">
          {detail.map((f) => {
            const v = factText(f, B, locale)
            return (
              <div key={f.id}>
                <dt>{ar ? f.label_ar : f.label_en}{f.is_conditional ? <small> · {condOf(f)}</small> : null}</dt>
                <dd className={v.known ? '' : 'is-na'}><bdi>{v.text}</bdi>{v.known && factNote(f, locale) ? <span className="id-sub">{factNote(f, locale)}</span> : null}</dd>
              </div>
            )
          })}
        </dl>
      ) : null}
      {p.last_verified ? <p className="id-cap bnk-prod-ver">{B.verifiedShort(localeDate(p.last_verified, locale))}</p> : null}
    </article>
  )
}
