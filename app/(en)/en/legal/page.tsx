import { LegalDoc } from '@/components/info/LegalDoc'
import { TERMS_DOC_EN, DOC_UPDATED_EN } from '@/lib/legalContentEn'

/**
 * `/en/legal` — a TRANSLATION of the Arabic terms, section for section.
 *
 * ⚠ The banner is the product's only regulatory statement and says exactly
 * what the Arabic says: not a licensed brokerage, no investment advice,
 * information and education only.
 */
export default function Page() {
  return (
    <LegalDoc
      route="/legal"
      eyebrow="Terms of Use"
      title="Terms and disclaimer"
      sections={TERMS_DOC_EN}
      updated={DOC_UPDATED_EN}
      scene="legal"
      banner="IQWealth is not a licensed financial brokerage and does not provide investment advice. All information on the platform is for information and education only."
    />
  )
}
