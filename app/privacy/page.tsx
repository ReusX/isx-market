import { LegalDoc } from '@/components/info/LegalDoc'
import { PRIVACY_DOC } from '@/lib/legalContent'

/**
 * /privacy — سياسة الخصوصية.
 *
 * A direct transplant of the approved page. The text is a first-publication
 * DRAFT written against the audited product, not a template: every factual
 * sentence in `lib/legalContent.ts` was checked against this repo, and
 * anything that could not be verified carries a visible `[مراجعة قانونية]`
 * marker instead of a guess.
 *
 * ⚠ It requires Iraq-qualified counsel before publication. Four fields are
 * still open here — data-hosting locations, retention periods, the minimum
 * age for an account, and the operator's legal name and registered address.
 */
export default function PrivacyPage() {
  return (
    <LegalDoc
      route="/privacy"
      eyebrow="سياسة الخصوصية"
      title="كيف نتعامل مع بياناتك"
      sections={PRIVACY_DOC}
      scene="privacy"
    />
  )
}
