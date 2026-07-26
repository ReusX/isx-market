import { CompanyLogo } from '@/components/CompanyLogo'

export function CompanyIdentity({
  symbol,
  name,
  logo,
  color,
}: {
  symbol: string
  name: string
  logo?: string
  color?: string
}) {
  return (
    <span className="market-company-inline">
      <CompanyLogo className="market-company-logo" sym={symbol} logo={logo} color={color} />
      <span className="market-company-identity">
        <strong>{name}</strong>
        <bdi>{symbol}</bdi>
      </span>
    </span>
  )
}
