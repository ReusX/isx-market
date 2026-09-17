'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import { fetchLive, fetchCompanyMeta, mergeCompanies } from '@/lib/market'
import { sectorLabel } from '@/lib/screener'
import type { Company, CompanyMeta } from '@/types'
import '@/styles/tools-page.css'

/**
 * /analysis and /analysis/[sym] — the machine-written company analysis.
 *
 * The index is one table of companies (search, sector) linking to each
 * analysis; the detail fetches `/api/analysis/[sym]` (cached a week
 * server-side, generated on a miss) and lays the result out as reading:
 * headline, summary, the verdict as a chip, key figures, the bull and bear
 * cases as two lists, themes, outlook, and the disclaimer. Arabic-only,
 * client-fetched, unchanged in substance from the old page.
 */
const RAIL = [
  { key: 'market', route: '/' }, { key: 'board', route: '/market' }, { key: 'companies', route: '/companies' },
  { key: 'screener', route: '/screener' }, { key: 'heatmap', route: '/heatmap' }, { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
] as const

/* The analysis index exists in Arabic only; resolved per locale so the
   static link gate sees the guard. */
const ANALYSIS_HOME: Record<string, string | null> = { ar: '/analysis', en: null }
const SEC_CODE: Record<string, string> = { BANK: 'Banks', TEL: 'Telecom', IND: 'Industry', HTL: 'Tourism', INS: 'Insurance', SVC: 'Services', AGR: 'Agriculture', INV: 'Investment' }

export function AnalysisIndexPage() {
  const { t, locale, href: L } = useLocale()
  const A = t.company.analysis
  const [companies, setCompanies] = useState<Company[]>([])
  const [q, setQ] = useState('')
  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()]).then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks).filter((c) => c.ar || c.en))).catch(() => setCompanies([]))
  }, [])
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase()
    return companies.filter((c) => !n || `${c.sym} ${c.ar} ${c.en}`.toLowerCase().includes(n))
  }, [companies, q])
  const name = (c: Company) => (locale === 'ar' ? c.ar || c.en : c.en || c.ar) || c.sym

  return (
    <SiteShell>
      <main className="tl id-full iq-door">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: t.market.page.rail[r.key], route: r.route }))} />
        <div className="tl-body">
          <header className="tl-head">
            <p className="id-eyebrow">{A.eyebrow}</p>
            <PageTitle title={A.title} note={A.note} />
          </header>
          <div className="tl-tools"><input type="search" className="id-input tl-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={A.search} aria-label={A.search} /></div>
          {!rows.length ? <p className="id-note">{A.noResults}</p> : (
            <div className="id-table-scroll">
              <table className="id-table tl-table id-num">
                <thead><tr><th scope="col">{t.personal.watchlist.colCompany}</th><th scope="col">{t.personal.watchlist.colSector}</th><th scope="col" className="is-end"></th></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.sym}>
                      <td><Link href={L(`/analysis/${c.sym}`)} className="id-name tl-name">{name(c)}</Link><span className="id-sub"><bdi>{c.sym}</bdi></span></td>
                      <td>{sectorLabel(SEC_CODE[String(c.sec)] ?? String(c.sec), locale)}</td>
                      <td className="is-end"><Link className="id-btn is-sm" href={L(`/analysis/${c.sym}`)}>{A.open}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </SiteShell>
  )
}

type Point = { title: string; body: string }
type Analysis = { headline: string; summary: string; kpis: { label: string; value: string; change: string }[]; bullCase: Point[]; bearCase: Point[]; verdict: string; verdictBody: string; themes: string[]; outlook: string }

export function AnalysisPage({ sym }: { sym: string }) {
  const { t, locale, href: L } = useLocale()
  const A = t.company.analysis
  const [co, setCo] = useState<CompanyMeta | null>(null)
  const [data, setData] = useState<{ ar: Analysis; en: Analysis } | null>(null)
  const [phase, setPhase] = useState<'loading' | 'done' | 'error'>('loading')
  useEffect(() => { fetchCompanyMeta().then((m) => setCo(m.find((c) => c.sym === sym) ?? null)).catch(() => null) }, [sym])
  const load = useCallback(async () => {
    setPhase('loading')
    try {
      let res = await fetch(`/api/analysis/${sym}`)
      if (!res.ok) res = await fetch(`/api/analysis/${sym}`, { method: 'POST' })
      if (!res.ok) throw new Error(String(res.status))
      setData(await res.json()); setPhase('done')
    } catch { setPhase('error') }
  }, [sym])
  useEffect(() => { load() }, [load])
  const c = data ? (locale === 'ar' ? data.ar : data.en) : null
  const name = co ? ((locale === 'ar' ? co.ar || co.en : co.en || co.ar) || sym) : sym
  const verdictTone = (v: string) => (/bull/i.test(v) ? 'is-up' : /bear/i.test(v) ? 'is-down' : 'is-flat')

  return (
    <SiteShell>
      <main className="tl id-full iq-door">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: t.market.page.rail[r.key], route: r.route }))} />
        <article className="tl-body id-read">
          <p className="id-eyebrow">{ANALYSIS_HOME[locale] ? <><Link href={L(ANALYSIS_HOME[locale]!)}>{A.back}</Link> · </> : null}<Link href={L(`/c/${sym}`)}>{A.companyPage}</Link></p>
          <PageTitle title={c?.headline || name} note={A.note} />
          <p className="id-cap id-num"><bdi>{sym}</bdi>{co ? ` · ${sectorLabel(SEC_CODE[String(co.sec)] ?? String(co.sec), locale)}` : ''}</p>
          {phase === 'loading' ? <p className="id-note">{A.loading}…</p> : null}
          {phase === 'error' ? <p className="id-note">{A.failed} · <button type="button" className="id-btn is-sm" onClick={load}>{A.retry}</button></p> : null}
          {c ? (
            <>
              <p className="id-body tl-lede">{c.summary}</p>
              {c.verdict ? (
                <section className="id-panel tl-panel">
                  <p className="id-cap">{A.verdict}</p>
                  <p className="tl-verdict"><span className={`id-chg ${verdictTone(c.verdict)}`}>{A.verdicts[c.verdict] ?? c.verdict}</span></p>
                  <p className="id-body">{c.verdictBody}</p>
                </section>
              ) : null}
              {c.kpis?.length ? (
                <section className="tl-sec"><h2 className="id-h3">{A.kpis}</h2>
                  <div className="id-stats id-num">{c.kpis.map((k) => <div className="id-stat" key={k.label}><small>{k.label}</small><b><bdi>{k.value}</bdi></b><span className="id-cap"><bdi>{k.change}</bdi></span></div>)}</div>
                </section>
              ) : null}
              {[[A.bull, c.bullCase], [A.bear, c.bearCase]].map(([h, pts]) => (pts as Point[])?.length ? (
                <section className="tl-sec" key={h as string}><h2 className="id-h3">{h as string}</h2>
                  <dl className="inf-claims">{(pts as Point[]).map((p) => <div key={p.title}><dt>{p.title}</dt><dd>{p.body}</dd></div>)}</dl>
                </section>
              ) : null)}
              {c.themes?.length ? <section className="tl-sec"><h2 className="id-h3">{A.themes}</h2><div className="id-pills">{c.themes.map((th) => <span key={th} className="id-pill is-sm">{th}</span>)}</div></section> : null}
              {c.outlook ? <section className="tl-sec"><h2 className="id-h3">{A.outlook}</h2><p className="id-body">{c.outlook}</p></section> : null}
              <p className="id-note tl-sec">{A.disclaimer}</p>
            </>
          ) : null}
        </article>
      </main>
    </SiteShell>
  )
}
