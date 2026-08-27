import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

/*
 * ⚠ CORRECTED · the description said «تواصل مع فريق IQWealth».
 *
 * There is no team. The About page, in the owner's own words, says one person
 * built and runs this. A description that invents a team to sound established
 * is the same class of defect as inventing a founding year, and it is the
 * first thing a reader who arrives from that snippet finds contradicted.
 *
 * The brand token is also gone from the title, per the house rule the rest of
 * the site follows: Google appends the site name itself from WebSite.name, so
 * a brand suffix only spends characters to print it twice.
 */
export const metadata: Metadata = {
  title: 'تواصل معنا · بريد ومنافذ التواصل المباشرة',
  description: 'راسلنا بخصوص بيانات بورصة العراق، تصحيح معلومة، مشكلة في الحساب، أو استفسار شراكة — بريد مباشر ورقم هاتف معلن.',
  alternates: seoAlternates('/contact'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/contact'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
