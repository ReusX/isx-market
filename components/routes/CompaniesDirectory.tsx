'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import Link from 'next/link'
import { fetchLive, fetchCompanyMeta, mergeCompanies, liveMcap, lastTradeNote, daysSinceTrade, isSuspended, STALE_DAYS, SECTORS, companyName } from '@/lib/market'
import { localeDate } from '@/lib/date'
import { ListingStatusTabs, type ListingStatus } from '@/components/design/ListingStatusTabs'
import { SectorChip } from '@/components/design/SectorChip'
import { CompanyLogo } from '@/components/CompanyLogo'
import type { Company } from '@/types'

type SortKey = 'mcap' | 'price' | 'change' | 'volume'

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })



export default function CompaniesDirectory() {
  const { t: T, locale, href: L } = useLocale()
  const d = T.company.directory
  const sectorName = new Map(SECTORS.filter(s => s.id !== 'all').map(s => [s.id, locale === 'ar' ? s.ar : s.en]))
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [sector, setSector] = useState('all')
  const [query, setQuery] = useState('')
  // Companies directory defaults to market capitalisation, descending.
  const [sortKey, setSortKey] = useState<SortKey>('mcap')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [status, setStatus] = useState<ListingStatus>('active')

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  const listed = useMemo(() => companies.filter(c => c.close > 0), [companies])

  const suspendedCount = useMemo(() => listed.filter(c => isSuspended(c)).length, [listed])

  const rows = useMemo(() => {
    let data = listed
    data = data.filter(c => (status === 'suspended' ? isSuspended(c) : !isSuspended(c)))
    if (sector !== 'all') data = data.filter(c => c.sec === sector)
    const q = query.trim().toLowerCase()
    if (q) {
      data = data.filter(c =>
        c.sym.toLowerCase().includes(q) ||
        (c.en ?? '').toLowerCase().includes(q) ||
        (c.ar ?? '').includes(query.trim()),
      )
    }
    const val = (c: Company) =>
      sortKey === 'price' ? c.close
      : sortKey === 'change' ? c.pct
      // `vol` holds the traded VALUE in dinars; الحجم means the share count.
      : sortKey === 'volume' ? (c.shares_traded ?? 0)
      // Market cap is hidden in the suspended tab (see the cell below), so
      // order those by how recently they last traded instead.
      : status === 'suspended' ? -daysSinceTrade(c)
      : liveMcap(c)
    return [...data].sort((a, b) => (sortDir === 'asc' ? val(a) - val(b) : val(b) - val(a)))
  }, [listed, sector, query, sortKey, sortDir, status])

  function sortBy(key: SortKey) {
    if (key === sortKey) { setSortDir(d => (d === 'asc' ? 'desc' : 'asc')); return }
    setSortKey(key); setSortDir('desc')
  }

  return (
    <section className="companies-section" aria-labelledby="companies-directory-title">
      <div className="section-heading">
        <div>
          <div className="section-kicker">{d.eyebrow}</div>
          <h2 id="companies-directory-title">
            {loading ? d.loading : d.count(String(rows.length))}
          </h2>
        </div>
      </div>

      <div className="directory-filters">
        <input
          className="directory-search"
          type="text"
          dir="auto"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={d.searchPlaceholder}
          aria-label={d.searchLabel}
        />
        <div className="sector-chip-row">
          {SECTORS.map(s => (
            <SectorChip
              key={s.id}
              label={s.ar}
              selected={sector === s.id}
              selectionTone="accent"
              onClick={() => setSector(s.id)}
            />
          ))}
        </div>
      </div>

      <ListingStatusTabs
        value={status}
        onChange={setStatus}
        activeCount={listed.length - suspendedCount}
        suspendedCount={suspendedCount}
      />

      {status === 'suspended' ? (
        <p className="listing-status-note">
          {d.staleNote(String(STALE_DAYS))}
        </p>
      ) : null}

      {failed ? (
        <div className="empty-state">
          <strong>{d.loadFailed}</strong>
          <span>{d.loadFailedHint}</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><bdi>#</bdi></th>
                <th>{d.colCompany}</th>
                <th><button type="button" onClick={() => sortBy('price')}>{d.colLast}</button></th>
                <th><button type="button" onClick={() => sortBy('change')}>{d.colChange}</button></th>
                <th><button type="button" onClick={() => sortBy('volume')}>{d.colVolume}</button></th>
                <th><button type="button" onClick={() => sortBy('mcap')}>{d.colMcap}</button></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((company, i) => (
                <tr key={company.sym} className="row-link">
                  <td data-label="#"><bdi className="num-roll">{i + 1}</bdi></td>
                  <td data-label={d.colCompany}>
                    <Link className="company-cell" href={L(`/c/${company.sym}`)}>
                      <CompanyLogo className="logo-chip" sym={company.sym} logo={company.logo} />
                      <span>
                        <strong dir="auto">{companyName(company, company.sym, locale)}</strong>
                        <small>{sectorName.get(company.sec) ?? company.sec} · <bdi>{company.sym}</bdi></small>
                      </span>
                    </Link>
                  </td>
                  <td data-label={d.colLast} title={lastTradeNote(company, locale === 'ar')}>
                    <span className="stacked-cell">
                      <bdi className="num-roll">{priceFormat.format(company.close)} IQD</bdi>
                      {company.stale && company.lastTrade && daysSinceTrade(company) > 5
                        ? <small><bdi>{localeDate(company.lastTrade, locale)}</bdi></small>
                        : null}
                    </span>
                  </td>
                  {/* A name that has not traded — sometimes for years — has no
                      change and no volume to report for this session. */}
                  <td data-label={d.colChange} className={company.stale ? '' : company.pct >= 0 ? 'gain' : 'loss'}>
                    {company.stale
                      ? <span className="stale-flag" title={lastTradeNote(company, locale === 'ar')}>—</span>
                      : <bdi className="num-roll">{company.pct > 0 ? '+' : ''}{company.pct.toFixed(2)}%</bdi>}
                  </td>
                  <td data-label={d.colVolume}>
                    {company.stale
                      ? <span className="stale-flag" title={lastTradeNote(company, locale === 'ar')}>·</span>
                      : <bdi className="num-roll">{compact.format(company.shares_traded ?? 0)}</bdi>}
                  </td>
                  {/* No market cap for a suspended name: it is close x share
                      count, and that close can be a decade old. */}
                  <td data-label={d.colMcap}>{!isSuspended(company) && liveMcap(company) > 0
                      ? <bdi className="num-roll">{compact.format(liveMcap(company))} IQD</bdi>
                      : <span className="stale-flag" title={lastTradeNote(company, locale === 'ar')}>·</span>}</td>
                </tr>
              ))}
              {!rows.length && !loading ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <strong>{d.noMatch}</strong>
                    <span>{d.noMatchHint}</span>
                  </div>
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
