import { DirectoryPage } from '@/components/site/DirectoryPage'
import { loadDirectory } from '@/lib/marketServer'
import { absUrl } from '@/lib/seo'
import { serializeLd } from '@/lib/jsonLd'

export const revalidate = 3600

/**
 * /companies · the directory: who is listed. No prices — those are the
 * root and /market. Server-rendered, with an ItemList of the companies so
 * the page is read as the list it is.
 */
export default async function Page() {
  const { rows, session } = await loadDirectory('en')
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Companies listed on the Iraq Stock Exchange',
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: { '@type': 'Corporation', name: r.en || r.ar, tickerSymbol: r.sym, url: absUrl(`/c/${r.sym}`, 'en') },
    })),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeLd(ld) }} />
      <DirectoryPage rows={rows} session={session} />
    </>
  )
}
