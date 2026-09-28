import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { NotificationsPage } from '@/components/site/NotificationsPage'

/**
 * /notifications · the app's notification settings. Personal and app-only —
 * on the web it only explains where notifications live — so noindex, like
 * the other personal tools.
 */
export const metadata: Metadata = {
  title: 'الإشعارات · سعر الدولار والذهب وتنبيهات الأسعار',
  description: 'إشعارات تطبيق IQWealth: سعر الدولار والذهب اليومي وتنبيهات الأسعار التي تضعها.',
  robots: { index: false, follow: true },
  alternates: seoAlternates('/notifications'),
}

export default function Page() {
  return <NotificationsPage />
}
