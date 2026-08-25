import { LegalDoc } from '@/components/info/LegalDoc'
import { PRIVACY_DOC_EN, DOC_UPDATED_EN } from '@/lib/legalContentEn'

/**
 * `/en/privacy` — a TRANSLATION of the Arabic policy, section for section.
 *
 * Nothing is added, dropped or softened. See `lib/legalContentEn.ts` for the
 * parity rules, including the substantive points that must survive: 18+,
 * hosting-location uncertainty, retention by criteria rather than fixed
 * periods, manual account deletion with no promised turnaround, and IQWealth
 * described as a financial information platform with no invented legal entity.
 */
export default function Page() {
  return (
    <LegalDoc
      route="/privacy"
      eyebrow="Privacy Policy"
      title="How we handle your data"
      sections={PRIVACY_DOC_EN}
      updated={DOC_UPDATED_EN}
      scene="privacy"
    />
  )
}
