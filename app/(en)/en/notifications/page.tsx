import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { NotificationsPage } from '@/components/site/NotificationsPage'

/** `/en/notifications`. Usability mirror — noindex, no hreflang. */
export const metadata: Metadata = {
  title: 'Notifications · dollar and gold prices and price alerts',
  description: 'IQWealth app notifications: the daily dollar and gold price, and the price alerts you set.',
  robots: { index: false, follow: false },
  alternates: seoAlternates('/notifications', 'en'),
}

export default function Page() {
  return <NotificationsPage />
}
