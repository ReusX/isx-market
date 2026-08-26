'use client'

/**
 * /statistics/ownership — ملكية الشركات · Company Ownership.
 *
 * Built as a Statistics-family sibling: there was never an approved donor for
 * this route (the design app's own freeze documents mark it "designed as a
 * shell only", and its file still carries the baseline's fictional rows), so
 * it takes the /statistics workspace's own vocabulary instead.
 *
 * ── What this page may and may not say ────────────────────────────────────
 * The Iraqi/foreign split is a DISCLOSED field — `iraqi_shares` and
 * `foreign_shares` are populated for 125 of the 126 companies in the period —
 * so the headline figure is real, not the holder-structure guess the foreign
 * flow audit found NULL. The market totals in the rail are summed over EVERY
 * row in the period, because a sum needs no company name; the TABLE below
 * shows only the companies whose record could be proven, and says so.
 *
 * The holder-change field is absent, deliberately: 164 of 169 values are zero
 * or null, and a default zero cannot be told from a real one.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { iqd, nf0 } from '@/lib/statistics'
import { useOwnership } from './depositoryData'
import { CoverageNote, DepositoryEmpty, DepositoryHead, PctCell, SearchField, SourceNote } from './depositoryUi'

export function OwnershipPage() {
  const { t: T, locale, href: L } = useLocale()
  const ow = T.ownership
  const { data, loading, failed } = useOwnership(locale)
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const all = data?.rows ?? []
    const hit = needle
      ? all.filter(r => r.sym.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle))
      : all
    return [...hit].sort((a, b) => b.foreignPct - a.foreignPct)
  }, [data, q])

  return (
    <main className="iq-page stw dep">
      <DepositoryHead title={ow.ownershipH1} standfirst={ow.ownershipStandfirst} />

      <section className="stw-rail" aria-label={ow.ownershipH1}>
        {loading ? (
          <p className="stw-rail-empty">{ow.latestDisclosure}…</p>
        ) : !data ? (
          <p className="stw-rail-empty">{ow.loadFailed}</p>
        ) : (
          <>
            <div className="stw-rail-lead">
              <span>{ow.foreignOfDeposited}</span>
              <strong><bdi>{data.market.foreignPct.toFixed(2)}%</bdi></strong>
              <em className="is-muted">
                {ow.iraqiOfDeposited} <bdi>{(100 - data.market.foreignPct).toFixed(2)}%</bdi>
              </em>
            </div>
            <dl className="stw-rail-figs">
              <div><dt>{ow.companiesInReport}</dt><dd><bdi>{nf0.format(data.market.companies)}</bdi></dd></div>
              <div><dt>{ow.foreignHeldShares}</dt><dd><bdi>{iqd(data.market.foreign)}</bdi></dd></div>
              <div><dt>{ow.foreignHolders}</dt><dd><bdi>{nf0.format(data.market.foreignHolders)}</bdi></dd></div>
              <div><dt>{ow.matchedToCompany}</dt><dd><bdi>{nf0.format(data.coverage.matched)}</bdi></dd></div>
            </dl>
          </>
        )}
      </section>

      <section className="stw-work">
        <div className="stw-mode-head dep-work-head">
          <div>
            <h2>{ow.ownershipTableTitle}</h2>
            <p>{ow.ownershipTableNote(nf0.format(rows.length))}</p>
          </div>
          <SearchField value={q} onChange={setQ} placeholder={ow.ownershipSearch} />
        </div>

        {loading ? (
          <div className="stw-skel stw-skel-work" aria-hidden="true"><span /><span /><span /></div>
        ) : failed || !data ? (
          <DepositoryEmpty title={ow.loadFailed} />
        ) : !data.rows.length ? (
          <DepositoryEmpty title={ow.noOwnership} />
        ) : !rows.length ? (
          <DepositoryEmpty title={ow.noResults} hint={ow.noResultsHint} />
        ) : (
          <div className="mv-board-scroll stw-scroll dep-scroll">
            <table className="mv-table stw-table dep-table">
              <thead>
                <tr>
                  <th scope="col" className="dep-col-co">{ow.company}</th>
                  <th scope="col" className="mv-col-num dep-col-pct">{ow.foreignOwnershipCol}</th>
                  <th scope="col" className="mv-col-num">{ow.foreignSharesCol}</th>
                  <th scope="col" className="mv-col-num">{ow.foreignHoldersCol}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.sym}>
                    <td className="dep-col-co">
                      {/* Only a resolved record gets a link — an unresolved one
                          never reaches this table at all. */}
                      <Link href={L(`/c/${r.sym}`)}>
                        <bdi className="stw-sym">{r.sym}</bdi>
                        <strong dir="auto">{r.name}</strong>
                      </Link>
                    </td>
                    <td className="mv-col-num dep-col-pct"><PctCell pct={r.foreignPct} /></td>
                    <td className="mv-col-num stw-v"><bdi>{iqd(r.foreignShares)}</bdi></td>
                    <td className="mv-col-num"><bdi>{r.foreignHolders == null ? '—' : nf0.format(r.foreignHolders)}</bdi></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data ? <SourceNote period={data.period} /> : null}
        {data ? <CoverageNote coverage={data.coverage} /> : null}
      </section>
    </main>
  )
}
