import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'أبحاث وتحليلات | ISX Research',
  description: 'تقارير وتحليلات متعمقة لسوق الأسهم العراقي. In-depth Iraq Stock Exchange research reports and market analysis.',
  alternates: { canonical: 'https://iraqsm.com/research' },
  openGraph: { url: 'https://iraqsm.com/research', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
}
export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
