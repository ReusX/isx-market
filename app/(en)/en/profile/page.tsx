import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { ProfilePage as Account } from '@/components/site/ProfilePage'

/** `/en/profile`. Usability mirror — noindex, no hreflang. */
export const metadata: Metadata = {
  title: 'Account · settings',
  description: 'Your IQWealth account settings: name, email, password, language, appearance and your saved data.',
  robots: { index: false, follow: false },
  alternates: seoAlternates('/profile', 'en'),
}

export default function Page() {
  return <Account />
}
