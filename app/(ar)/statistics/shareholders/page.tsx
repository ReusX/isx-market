import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { ShareholdersPage } from '@/components/site/ShareholdersPage'
import { loadShareholders } from '@/lib/marketServer'

/* The filing is monthly; an hour is as fresh as it can honestly be. */
export const revalidate = 3600

export const metadata: Metadata = {
  // Without this the page inherited the parent layout's canonical and
  // declared itself a duplicate of /statistics.
  alternates: seoAlternates('/statistics/shareholders'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/statistics/shareholders'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  title: 'كبار المساهمين في بورصة العراق · أكبر الحصص المُفصح عنها',
  description: 'من يملك أكبر الحصص في شركات سوق العراق للأوراق المالية، باسم كل مساهم ونسبة ملكيته من رأس المال، من آخر تقرير شهري لمركز الإيداع.',
}

/** /statistics/shareholders · كبار المساهمين — the largest disclosed stakes. */
export default async function Page() {
  return <ShareholdersPage initial={await loadShareholders('ar')} />
}
