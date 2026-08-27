'use client'

/**
 * /statistics/shareholders — كبار المساهمين · Major Shareholders.
 *
 * ── One snapshot, not a union of months ───────────────────────────────────
 * The previous implementation read `.limit(1000)` across every period and then
 * de-duplicated by company+holder, so a company absent from the newest report
 * silently contributed a row from an older one and the page presented seven
 * months as a single filing. This reads the latest period only, pages until it
 * is exhausted, and renders that.
 *
 * ── Three fields the source has and this page does not show ───────────────
 * `change_pct` and `prev_pct` — 164 of 169 values are zero or null, and a
 * default zero is indistinguishable from a real one, so there are no arrows
 * and no deltas. `nationality` — every disclosed stake in this period is
 * recorded as Iraqi, so a two-value filter would be a control with one option;
 * the fact is stated in the source note instead, as a fact about the report
 * rather than a claim about the holders.
 *
 * Holder names are never matched or translated. A shareholder is a person or a
 * legal entity and the report's spelling is the only record of it there is —
 * so an English reader sees the Arabic name, exactly as filed.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { nf0 } from '@/lib/statistics'
import { useShareholders } from './depositoryData'
import { CoverageNote, DepositoryEmpty, DepositoryHead, PctCell, SearchField, SourceNote } from './depositoryUi'

export function ShareholdersPage() {
  const { t: T, locale, href: L } = useLocale()
  const ow = T.ownership
  const { data, loading, failed } = useShareholders(locale)
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const all = data?.rows ?? []
    const hit = needle
      ? all.filter(r => r.sym.toLowerCase().includes(needle)
          || r.company.toLowerCase().includes(needle)
          || r.holder.toLowerCase().includes(needle))
      : all
    return [...hit].sort((a, b) => b.pct - a.pct)
  }, [data, q])

  const largest = data?.rows.reduce((m, r) => Math.max(m, r.pct), 0) ?? 0

  return (
    <main className="iq-page stw dep">
      <DepositoryHead title={ow.shareholdersH1} standfirst={ow.shareholdersStandfirst} />

      <section className="stw-rail" aria-label={ow.shareholdersH1}>
        {loading ? (
          <p className="stw-rail-empty">{ow.latestDisclosure}…</p>
        ) : !data ? (
          <p className="stw-rail-empty">{ow.loadFailed}</p>
        ) : (
          <>
            <div className="stw-rail-lead">
              <span>{ow.largestStake}</span>
              <strong><bdi>{largest.toFixed(2)}%</bdi></strong>
            </div>
            <dl className="stw-rail-figs">
              <div><dt>{ow.disclosedStakes}</dt><dd><bdi>{nf0.format(data.rows.length)}</bdi></dd></div>
              <div><dt>{ow.companiesWithDisclosure}</dt><dd><bdi>{nf0.format(data.companies)}</bdi></dd></div>
              <div><dt>{ow.matchedToCompany}</dt><dd><bdi>{nf0.format(data.coverage.matched)}</bdi></dd></div>
            </dl>
          </>
        )}
      </section>

      <section className="stw-work">
        <div className="stw-mode-head dep-work-head">
          <div>
            <h2>{ow.shareholdersTableTitle}</h2>
            <p>{ow.shareholdersTableNote(nf0.format(rows.length))}</p>
          </div>
          <SearchField value={q} onChange={setQ} placeholder={ow.shareholdersSearch} />
        </div>

        {loading ? (
          <div className="stw-skel stw-skel-work" aria-hidden="true"><span /><span /><span /></div>
        ) : failed || !data ? (
          <DepositoryEmpty title={ow.loadFailed} />
        ) : !data.rows.length ? (
          <DepositoryEmpty title={ow.noShareholders} />
        ) : !rows.length ? (
          <DepositoryEmpty title={ow.noResults} hint={ow.noResultsHint} />
        ) : (
          <div className="mv-board-scroll stw-scroll dep-scroll">
            <table className="mv-table stw-table dep-table">
              <thead>
                <tr>
                  <th scope="col" className="dep-col-holder">{ow.shareholder}</th>
                  <th scope="col" className="dep-col-co">{ow.company}</th>
                  <th scope="col" className="mv-col-num dep-col-pct">{ow.ownershipPct}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="dep-col-holder">
                      {/* The block keeps the TABLE's direction so the column
                          aligns with its own header in English; the bdi
                          isolates the Arabic run inside it. `dir="auto"` on the
                          block would right-align every cell of an LTR table. */}
                      <span><bdi>{r.holder}</bdi></span>
                    </td>
                    <td className="dep-col-co">
                      <Link href={L(`/c/${r.sym}`)}>
                        <bdi className="stw-sym">{r.sym}</bdi>
                        <strong dir="auto">{r.company}</strong>
                      </Link>
                    </td>
                    <td className="mv-col-num dep-col-pct"><PctCell pct={r.pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data ? <SourceNote period={data.period} /> : null}
        {data && data.nationalities.length === 1 ? (
          <p className="stw-note">{ow.nationalityUniform}</p>
        ) : null}
        {data ? <CoverageNote coverage={data.coverage} /> : null}
      </section>
    </main>
  )
}
