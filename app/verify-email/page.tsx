import type { Metadata } from 'next'
import { Suspense } from 'react'
import { VerifyEmailScreen } from '@/components/auth/screens'

export const metadata: Metadata = {
  title: 'تفعيل الحساب · IQWealth',
  description: 'افتح رابط التأكيد المرسل إلى بريدك لتفعيل حسابك.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Suspense><VerifyEmailScreen /></Suspense>
}
