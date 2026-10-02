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
import { CATEGORY_KEYS } from '@/lib/bankEditorial'
import { describeCondition, factText, factNote, introSentence, basisLabel } from '@/lib/bankFacts'
import '@/styles/econ-page.css'
import '@/styles/company-page.css'
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
function compact(v: number | null | undefined, u: Units): { n: string; unit: string } {
  if (v == null || !Number.isFinite(v)) return { n: '—', unit: '' }
  const a = Math.abs(v), s = v < 0 ? '−' : ''
  if (a >= 1e12) return { n: `${s}${(a / 1e12).toFixed(2)}`, unit: u.tn }
  if (a >= 1e9) return { n: `${s}${(a / 1e9).toFixed(1)}`, unit: u.bn }
  if (a >= 1e6) return { n: `${s}${(a / 1e6).toFixed(0)}`, unit: u.mn }
  return { n: `${s}${nf.format(a)}`, unit: '' }
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

  /* The frame's figure: the best current published rate (a deposit's
     highest, else a loan's lowest), else the latest filed total assets. */
  const found = ed ? CATEGORY_KEYS.flatMap((k) => { const c = ed.ratings.categories[k]; return c?.rationale ? [[k, c.rationale] as const] : [] }) : []
  const lead = (() => {
    const current = products.flatMap((p) => {
      const f = p.facts.find((x) => x.field_key === 'rate')
      return f && f.state === 'KNOWN' && f.value_num != null && isCurrentEnough(f) ? [{ p, rate: f.value_num }] : []
    })
    const dep = current.filter((x) => x.p.kind.startsWith('deposit')).sort((a, b) => b.rate - a.rate)[0]
    const loan = current.filter((x) => !x.p.kind.startsWith('deposit')).sort((a, b) => a.rate - b.rate)[0]
    const pick = dep ?? loan
    if (pick) return { figure: `${pick.rate}%`, chip: P.board.bestRate, line: ar ? pick.p.name_ar : pick.p.name_en }
    const ta = fin?.values.total_assets
    if (ta != null) { const c = compact(ta, u); return { figure: c.n, chip: P.board.assets, line: `${c.unit} · ${B.financialsNote(String(fin!.fiscalYear), fin!.period === 'ANNUAL' ? '' : fin!.period)}` } }
    return null
  })()

  return (
    <SiteShell>
      <main className="bnk id-full iq-door" data-world="tile" data-level="accent">
        <DoorRail door="banking" />
        <div className="bnk-body">
          <p className="id-eyebrow fx-crumb"><Link href={L('/banks')}>{P.back}</Link> · {B.type[bank.bank_type]} · {B.ownership[bank.ownership]}</p>
          <div className="fx-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <header className="fx-head bp-id">
                  {initial.logo ? <img className="bnk-logo is-lg" src={initial.logo} alt="" width={48} height={48} /> : null}
                  <PageTitle title={name} note={introSentence(bank, B, city)} className="fx-title" />
                </header>
                {lead ? (
                  <>
                    <p className="fx-huge id-num">
                      <span className="fx-huge-num">
                        <bdi>{lead.figure}</bdi>
                        <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                          <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        </svg>
                      </span>
                    </p>
                    <p className="fx-line"><span className="id-chg is-flat">{lead.chip}</span><span>{lead.line}</span></p>
                  </>
                ) : null}
                {ed && ar && ed.h1 ? <p className="bp-verdict">{ed.h1}</p> : null}
                {bank.operating_status !== 'operating' ? (
                  <p className="id-note bnk-notice">
                    <b>{B.status[bank.operating_status]}</b> · {B.statusNote[bank.operating_status as keyof typeof B.statusNote]}
                    {(ar ? bank.status_note_ar : bank.status_note_en) ? ` ${ar ? bank.status_note_ar : bank.status_note_en}` : ''}
                  </p>
                ) : null}
                {bank.usd_restricted ? <p className="id-note bnk-notice"><b>{B.usdRestricted}</b> · {B.usdRestrictedNote}</p> : null}
                {bank.research_state === 'source_unreachable' ? <p className="id-note bnk-notice">{B.unreachableNote}</p> : null}
                {bank.research_state === 'not_researched' ? <p className="id-note bnk-notice">{B.notResearchedNote}</p> : null}
              </div>
              <section className="id-print is-key fx-calc" aria-label={P.board.keyTitle}>
                <h2 className="fx-calc-title">{P.board.keyTitle}</h2>
                <dl className="bp-keys id-num">
                  {identity.map((r) => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}
                  {ed?.app && ed.app.storeRating != null ? (
                    <div><dt>{E.app}</dt><dd><a className="id-link" href={ed.app.url} target="_blank" rel="noopener"><bdi dir="ltr">★ {ed.app.storeRating}{ed.app.ratingCount ? ` · ${ed.app.ratingCount}` : ''}</bdi></a></dd></div>
                  ) : null}
                </dl>
                {ed?.app && ed.app.storeRating != null ? <p className="fx-calc-note">{E.reportedFoot}</p> : null}
              </section>
            </div>
          </div>

          {ed && ar ? (
            <section className="bnk-sec" aria-label={P.editorialTitle}>
              <h2 className="id-h3">{P.editorialTitle}</h2>
              <p className="id-body bp-intro">{ed.intro}</p>
              <div className="fx-facts bp-two">
                {ed.suitableFor ? (
                  <section className="id-print is-calm fx-fact">
                    <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M14 34l12 12 24-28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <h3 className="fx-fact-head">{E.suitableFor}</h3>
                    <p className="fx-pocket">{ed.suitableFor}</p>
                  </section>
                ) : null}
                {ed.watchOut ? (
                  <section className="id-print is-calm fx-fact">
                    <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 10l24 42H8zM32 28v10M32 45v1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <h3 className="fx-fact-head">{E.watchOut}</h3>
                    <p className="fx-pocket">{ed.watchOut}</p>
                  </section>
                ) : null}
              </div>
              <p className="id-cap">{E.editorialNotice}</p>
            </section>
          ) : null}

          {/* What we found, per topic — the editorial's sentences without
              scores (most banks are only partly scored, so no number is shown). */}
          {ed && ar && found.length ? (
            <section className="bnk-sec" aria-label={P.board.foundTitle}>
              <PageTitle as="h2" className="id-h3" title={P.board.foundTitle} note={E.ratingsWhat} />
              <div className="fx-facts bp-found">
                {found.map(([k, text]) => (
                  <section key={k} className="id-print is-calm fx-fact">
                    <h3 className="fx-fact-head">{E.category[k]}</h3>
                    <p className="fx-pocket">{text}</p>
                  </section>
                ))}
              </div>
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
            <section className="bnk-sec id-print is-calm bp-panel" aria-label={E.fees}>
              <h2 className="id-h3">{E.fees}</h2>
              <p className="id-body">{ed.fees}</p>
            </section>
          ) : null}

          {services.length ? (
            <section className="bnk-sec id-print is-calm bp-panel" aria-label={P.servicesTitle}>
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
              <div className="cmp-figs id-num bnk-fin">
                {(['total_assets', 'customer_deposits', 'total_equity', 'net_income'] as const).filter((k) => fin.values[k] != null).map((k) => {
                  const c = compact(fin.values[k], u)
                  return <div className="id-print is-calm cmp-fig" key={k}><small>{B.fin[k]}</small><strong><bdi dir="ltr">{c.n}</bdi> <span className="bp-unit">{c.unit}</span></strong><span>{B.financialsNote(String(fin.fiscalYear), fin.period === 'ANNUAL' ? '' : fin.period)}</span></div>
                })}
                {fin.values.capital_adequacy_ratio != null ? (
                  <div className="id-print is-calm cmp-fig"><small>{B.fin.capital_adequacy_ratio}</small>{/* Filed as a percentage figure already (52.97 = 52.97%). */}
                  <strong><bdi>{fin.values.capital_adequacy_ratio.toFixed(1)}%</bdi></strong><span>{B.financialsNote(String(fin.fiscalYear), fin.period === 'ANNUAL' ? '' : fin.period)}</span></div>
                ) : null}
              </div>
              <p><Link className="id-btn is-sm" href={L(`/c/${bank.ticker}/financials`)}>{P.finLink} →</Link></p>
            </section>
          ) : null}

          {ed && ar && ed.faqs.length ? (
            <section className="bnk-sec id-print is-calm bp-panel" aria-label={P.faqsTitle}>
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
            <section className="bnk-sec id-print is-calm bp-panel" aria-label={P.linksTitle}>
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
    <article className="bnk-prod id-print is-calm">
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
