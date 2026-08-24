import type { Metadata } from 'next'
import PortfolioClient from './PortfolioClient'

export const metadata: Metadata = {
  title: 'محفظتي · متابعة أسهمك في بورصة العراق',
  description: 'تابع قيمة محفظتك وأرباحها غير المحققة وتوزيعها على القطاعات، محسوبة من أسعار الإغلاق الرسمية لبورصة العراق.',
  // A personal workspace is not a landing page.
  robots: { index: false, follow: false },
}

export default function PortfolioPage() {
  return <PortfolioClient />
}
