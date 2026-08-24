import { LegalDoc } from '@/components/info/LegalDoc'
import { TERMS_DOC } from '@/lib/legalContent'

/**
 * /legal — شروط الاستخدام وإخلاء المسؤولية.
 *
 * What this route IS: Terms of Use plus the investment and market-data
 * disclaimer. The title says so, rather than calling itself a vague «legal
 * framework» page.
 *
 * The standing disclaimer below is carried over from the live page unchanged
 * in meaning: it is the product's only regulatory statement, and paraphrasing
 * it would alter what it says.
 *
 * ⚠ A DRAFT pending Iraq-qualified counsel. Three fields are open here — the
 * wording of the liability limits under Iraqi law, whether an indemnity clause
 * belongs at all, and the governing law, competent court and operator identity.
 */
export default function LegalPage() {
  return (
    <LegalDoc
      route="/legal"
      eyebrow="شروط الاستخدام"
      title="الشروط وإخلاء المسؤولية"
      sections={TERMS_DOC}
      scene="legal"
      banner="IQWealth ليست شركة وساطة مالية مرخّصة ولا تقدّم نصائح استثمارية. جميع المعلومات على المنصّة لأغراض إعلامية وتعليمية فقط."
    />
  )
}
