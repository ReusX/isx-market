import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

/*
 * ⚠ CORRECTED · the metadata used to describe a different page.
 *
 * The title promised «كيف تعمل ومن يشرف عليها» and the description promised how
 * trading sessions run, who supervises the market and how to buy and sell
 * shares. The page is, and has always been, a personal welcome LETTER from the
 * person who built the site, plus three claims about the platform and a way to
 * reach him. Someone who searched that promise and clicked landed on something
 * else entirely — which costs the click and the trust behind it.
 *
 * The page body is untouched. Only these strings changed, and they now describe
 * what a reader actually finds. Nothing new is claimed: no team, no founding
 * year, no coverage figure, no regulatory status.
 *
 * The house rules still hold — ONE SCRIPT PER TITLE and no brand token, because
 * bidi reorders a mixed title and Google appends the site name itself. The
 * English lives in the OG copy, where it is a share card rather than a SERP
 * line.
 */
export const metadata: Metadata = {
  title: { absolute: 'من نحن · من بنى منصّة بيانات بورصة العراق ولماذا' },
  description:
    'رسالة من أحمد بلحة، الكاتب المالي الذي أنشأ المنصّة: أداة مجانية لمتابعة بيانات بورصة العراق اليومية، ما تزال قيد التطوير — وطرق التواصل معه.',
  alternates: seoAlternates('/about'),
  keywords: [
    'من نحن', 'عن المنصة', 'IQWealth', 'iraqsm',
    'منصة بيانات بورصة العراق', 'اسهم العراق',
  ],
  openGraph: {
    url: absUrl('/about'),
    title: 'About IQWealth · Who built this, and why',
    description: 'A free platform for daily Iraq Stock Exchange data, built by a finance writer and still in development.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
