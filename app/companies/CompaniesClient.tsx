'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchLive, fetchCompanyMeta, mergeCompanies, SECTORS } from '@/lib/market'
import { SectorChip } from '@/components/design/SectorChip'
import { CompanyLogo } from '@/components/CompanyLogo'
import type { Company } from '@/types'

type SortKey = 'mcap' | 'price' | 'change' | 'volume'

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const SECTOR_AR = new Map(SECTORS.filter(s => s.id !== 'all').map(s => [s.id, s.ar]))

const liveMcap = (c: Company) => (c.shares && c.close > 0 ? c.close * c.shares : (c.mcap || 0) * 1e6)

export default function CompaniesClient() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [sector, setSector] = useState('all')
  const [query, setQuery] = useState('')
  // Companies directory defaults to market capitalisation, descending.
  const [sortKey, setSortKey] = useState<SortKey>('mcap')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  const listed = useMemo(() => companies.filter(c => c.close > 0), [companies])

  const rows = useMemo(() => {
    let data = listed
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
      : liveMcap(c)
    return [...data].sort((a, b) => (sortDir === 'asc' ? val(a) - val(b) : val(b) - val(a)))
  }, [listed, sector, query, sortKey, sortDir])

  function sortBy(key: SortKey) {
    if (key === sortKey) { setSortDir(d => (d === 'asc' ? 'desc' : 'asc')); return }
    setSortKey(key); setSortDir('desc')
  }

  return (
    <section className="companies-section" aria-labelledby="companies-directory-title">
      <div className="section-heading">
        <div>
          <div className="section-kicker">دليل الشركات</div>
          <h2 id="companies-directory-title">
            {loading ? 'جاري التحميل…' : `${rows.length} شركة`}
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
          placeholder="ابحث عن شركة أو رمز…"
          aria-label="بحث عن شركة"
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

      {failed ? (
        <div className="empty-state">
          <strong>تعذّر تحميل بيانات الشركات</strong>
          <span>يرجى تحديث الصفحة.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><bdi>#</bdi></th>
                <th>الشركة</th>
                <th><button type="button" onClick={() => sortBy('price')}>آخر سعر</button></th>
                <th><button type="button" onClick={() => sortBy('change')}>التغير</button></th>
                <th><button type="button" onClick={() => sortBy('volume')}>الحجم</button></th>
                <th><button type="button" onClick={() => sortBy('mcap')}>القيمة السوقية</button></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((company, i) => (
                <tr key={company.sym} className="row-link">
                  <td data-label="#"><bdi className="num-roll">{i + 1}</bdi></td>
                  <td data-label="الشركة">
                    <Link className="company-cell" href={`/c/${company.sym}`}>
                      <CompanyLogo className="logo-chip" sym={company.sym} logo={company.logo} />
                      <span>
                        <strong>{company.ar || company.en || company.sym}</strong>
                        <small>{SECTOR_AR.get(company.sec) ?? company.sec} · <bdi>{company.sym}</bdi></small>
                      </span>
                    </Link>
                  </td>
                  <td data-label="آخر سعر"><bdi className="num-roll">{priceFormat.format(company.close)} IQD</bdi></td>
                  <td data-label="التغير" className={company.pct >= 0 ? 'gain' : 'loss'}>
                    <bdi className="num-roll">{company.pct > 0 ? '+' : ''}{company.pct.toFixed(2)}%</bdi>
                  </td>
                  <td data-label="الحجم"><bdi className="num-roll">{compact.format(company.shares_traded ?? 0)}</bdi></td>
                  <td data-label="القيمة السوقية"><bdi className="num-roll">{compact.format(liveMcap(company))} IQD</bdi></td>
                </tr>
              ))}
              {!rows.length && !loading ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <strong>لا توجد شركات مطابقة</strong>
                    <span>جرّب تغيير القطاع أو مسح البحث.</span>
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
