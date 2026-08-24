import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ForgotPasswordScreen } from '@/components/auth/screens'

export const metadata: Metadata = {
  title: 'إعادة تعيين كلمة المرور · IQWealth',
  description: 'أرسل رابطاً لتعيين كلمة مرور جديدة لحسابك.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Suspense><ForgotPasswordScreen /></Suspense>
}
