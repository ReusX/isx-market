import { LegalDoc } from '@/components/info/LegalDoc'
import { TERMS_DOC, DOC_UPDATED } from '@/lib/legalContent'

/**
 * /legal — شروط الاستخدام وإخلاء المسؤولية.
 *
 * The standing disclaimer below is the product's only regulatory statement,
 * and paraphrasing it would alter what it says. The English version at
 * /en/legal translates it exactly.
 */
export default function Page() {
  return (
    <LegalDoc
      route="/legal"
      eyebrow="شروط الاستخدام"
      title="الشروط وإخلاء المسؤولية"
      sections={TERMS_DOC}
      updated={DOC_UPDATED}
      scene="legal"
      banner="IQWealth ليست شركة وساطة مالية مرخّصة ولا تقدّم نصائح استثمارية. جميع المعلومات على المنصّة لأغراض إعلامية وتعليمية فقط."
    />
  )
}
