import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: { absolute: 'المصارف العراقية المدرجة في بورصة العراق | ISX Banks' },
  description: 'دليل شامل للمصارف العراقية المدرجة في بورصة العراق للأوراق المالية — مصرف الرافدين، مصرف الرشيد، مصرف بغداد، وجميع المصارف الاستثمارية والإسلامية. Iraq listed banks on ISX with stock prices.',
  alternates: { canonical: 'https://iraqsm.com/banks' },
  openGraph: {
    url: 'https://iraqsm.com/banks',
    title: 'المصارف العراقية | بورصة العراق ISX',
    description: 'أسعار أسهم المصارف العراقية المدرجة في بورصة العراق للأوراق المالية.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  keywords: ['مصرف الرافدين', 'مصرف الرشيد', 'مصرف بغداد', 'المصارف العراقية', 'بنوك العراق', 'مصرف التنمية الدولي'],
}
export default function BanksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
