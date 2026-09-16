import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { OwnershipPage } from '@/components/site/OwnershipPage'
import { loadOwnership } from '@/lib/marketServer'

/* The filing is monthly; an hour is as fresh as it can honestly be. */
export const revalidate = 3600

export const metadata: Metadata = {
  // Without this the page inherited the parent layout's canonical and
  // declared itself a duplicate of /statistics.
  alternates: seoAlternates('/statistics/ownership'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/statistics/ownership'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  title: 'الملكية الأجنبية في بورصة العراق · حصة الأجانب من الأسهم المودعة',
  description: 'كم من رأس المال المودع في شركات سوق العراق للأوراق المالية مملوك لمستثمرين أجانب وكم لمستثمرين عراقيين، شركة بشركة، من آخر تقرير شهري لمركز الإيداع.',
}

/** /statistics/ownership · الملكية الأجنبية — the Iraqi/foreign split of deposited capital. */
export default async function Page() {
  return <OwnershipPage initial={await loadOwnership('ar')} />
}
