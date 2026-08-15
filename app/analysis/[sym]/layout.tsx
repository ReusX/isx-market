import type { Metadata } from 'next'
import companies from '@/public/data/companies.json'
import { absUrl, seoAlternates } from '@/lib/seo'

/*
 * Per-company analysis pages had no metadata whatsoever, so all ~104 of them
 * shared the root canonical — every one declaring itself a duplicate of the
 * homepage. They also all shared the homepage's title.
 */
export async function generateMetadata(
  { params }: { params: { sym: string } },
): Promise<Metadata> {
  const sym = params.sym.toUpperCase()
  const meta = (companies as { sym: string; ar?: string; en?: string }[]).find(c => c.sym === sym)
  const name = meta?.ar?.trim() || meta?.en?.trim() || sym

  return {
    title: `تحليل سهم ${name} · ${sym} في بورصة العراق`,
    description: `تحليل أداء سهم ${name} (${sym}) في سوق العراق للأوراق المالية: أبرز المؤشرات المالية، نقاط القوة والمخاطر، وخلاصة التقييم.`,
    alternates: seoAlternates(`/analysis/${sym}`),
    openGraph: { url: absUrl(`/analysis/${sym}`), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default function AnalysisSymLayout({ children }: { children: React.ReactNode }) {
  return children
}
