import type { Metadata } from 'next'
import ProfileClient from './ProfileClient'

export const metadata: Metadata = {
  title: 'حسابي · الإعدادات',
  description: 'إعدادات حسابك في IQWealth: الاسم والبريد وكلمة المرور واللغة والمظهر وبياناتك المحفوظة.',
  // An account page is not a landing page.
  robots: { index: false, follow: false },
}

export default function ProfilePage() {
  return <ProfileClient />
}
