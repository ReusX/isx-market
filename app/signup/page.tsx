import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignUpScreen } from '@/components/auth/screens'

export const metadata: Metadata = {
  title: 'إنشاء حساب · IQWealth',
  description: 'أنشئ حساباً مجانياً في IQWealth لمزامنة محفظتك وقوائم متابعتك عبر أجهزتك.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Suspense><SignUpScreen /></Suspense>
}
