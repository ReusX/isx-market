import { DirectoryPage } from '@/components/site/DirectoryPage'
import { loadDirectory } from '@/lib/marketServer'
import { absUrl } from '@/lib/seo'

export const revalidate = 3600

/**
 * /companies · the directory: who is listed. No prices — those are the
 * root and /market. Server-rendered, with an ItemList of the companies so
 * the page is read as the list it is.
 */
export default async function Page() {
  const { rows, session } = await loadDirectory('ar')
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'الشركات المدرجة في بورصة العراق',
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: { '@type': 'Corporation', name: r.ar, tickerSymbol: r.sym, url: absUrl(`/c/${r.sym}`, 'ar') },
    })),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <DirectoryPage rows={rows} session={session} />
    </>
  )
}
