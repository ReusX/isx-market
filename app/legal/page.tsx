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
 * The three fields that used to carry visible `[مراجعة قانونية]` markers were
 * resolved with final copy from the operator on 2026-08-25: liability is
 * limited only as far as Iraqi law permits, the indemnity question was
 * answered NO — that section is now «الاستخدام المسؤول» and states plainly
 * that no clause obliges the user to indemnify us — and the governing law is
 * Iraq with its competent courts, naming no specific court or venue.
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
