import { LegalDoc } from '@/components/info/LegalDoc'
import { PRIVACY_DOC, DOC_UPDATED } from '@/lib/legalContent'

/**
 * /privacy — سياسة الخصوصية.
 *
 * The text was written against the audited product, not from a template:
 * every factual sentence in `lib/legalContent.ts` was checked against this
 * repo, and anything that could not be verified was left open rather than
 * guessed. The four fields that once carried visible `[مراجعة قانونية]`
 * markers — hosting locations, retention periods, the minimum account age,
 * and who operates the platform — were resolved with final copy from the
 * operator on 2026-08-25. Nothing was invented to close them: no country is
 * named for the hosting, no fixed retention period is promised that the
 * product cannot enforce, and no legal entity or registered address is
 * asserted.
 *
 * The English version at /en/privacy is a TRANSLATION of this same text —
 * see `lib/legalContentEn.ts` for the parity rules it holds itself to.
 */
export default function Page() {
  return (
    <LegalDoc
      route="/privacy"
      eyebrow="سياسة الخصوصية"
      title="كيف نتعامل مع بياناتك"
      sections={PRIVACY_DOC}
      updated={DOC_UPDATED}
      scene="privacy"
    />
  )
}
