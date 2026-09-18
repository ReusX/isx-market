import Link from 'next/link'
import { loadBankRanking } from '@/lib/bankRanking'
import { money } from '@/lib/resultsText'
import { messages } from '@/lib/i18n'

/**
 * The live table inside «أفضل البنوك في العراق» — `{{bank-ranking}}`.
 * Server component; the article is Arabic-only, so it renders the Arabic dictionary.
 */
const pct = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

export async function BankRankingBlock() {
  const { ranked, withheld, unfiled } = await loadBankRanking()
  const t = messages('ar')
  const r = t.results, k = t.banks.hub.ranking
  if (!ranked.length) return <p className="id-note">{k.failed}</p>
  const years = Array.from(new Set(ranked.map((x) => x.year))).sort((a, b) => b - a)
  return (
    <figure className="bkr">
      <figcaption className="id-cap">{k.caption(years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : String(years[0]))}</figcaption>
      <div className="bkr-scroll">
        <table className="bkr-table">
          <thead>
            <tr>
              <th>#</th><th>{k.cols.bank}</th><th>{k.cols.type}</th><th>{k.cols.assets}</th><th>{k.cols.net}</th><th>{k.cols.deposits}</th><th>{k.cols.equity}</th><th>{k.cols.roe}</th><th>{k.cols.year}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((x, i) => (
              <tr key={x.bank.slug}>
                <td>{i + 1}</td>
                <td className="bkr-name">
                  <Link href={`/banks/${x.bank.slug}`}>{x.bank.name_ar}</Link>
                  {' '}<Link href={`/c/${x.bank.ticker}`} className="bkr-tick">{x.bank.ticker}</Link>
                </td>
                <td>{t.banks.type[x.bank.bank_type]}</td>
                <td className="num">{money(x.assets, r)}</td>
                <td className={`num ${x.netIncome != null && x.netIncome < 0 ? 'is-neg' : ''}`}>{x.netIncome != null ? money(x.netIncome, r) : '—'}</td>
                <td className="num">{x.deposits != null && x.deposits > 0 ? money(x.deposits, r) : '—'}</td>
                <td className="num">{x.equity != null ? money(x.equity, r) : '—'}</td>
                <td className="num">{x.roe != null ? `${pct.format(x.roe * 100)}%` : '—'}</td>
                <td className="num">{x.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {withheld.length || unfiled.length ? (
        <p className="id-cap bkr-note">
          {withheld.length ? k.withheld(withheld.map((b) => b.name_ar).join(k.sep)) + ' ' : ''}
          {unfiled.length ? k.unfiled(unfiled.map((b) => b.name_ar).join(k.sep)) : ''}
        </p>
      ) : null}
    </figure>
  )
}
