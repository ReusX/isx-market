import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { Account } from '@/components/routes/Account'

export const metadata: Metadata = {
  title: 'الحساب · الإعدادات',
  description: 'إعدادات حسابك في IQWealth: الاسم والبريد وكلمة المرور واللغة والمظهر وبياناتك المحفوظة.',
  robots: { index: false, follow: false },
  alternates: seoAlternates('/profile'),
}

export default function Page() {
  return <Account />
}
