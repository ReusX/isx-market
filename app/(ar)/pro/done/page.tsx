import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { Suspense } from 'react'
import { ProDonePage } from '@/components/site/ProPage'

/** Wayl's return page: private, never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false }, alternates: seoAlternates('/pro/done') }

export default function Page() {
  return <Suspense><ProDonePage /></Suspense>
}
