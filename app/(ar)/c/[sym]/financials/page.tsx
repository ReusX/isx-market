'use client'

import { useParams } from 'next/navigation'
import { CompanyFinancials } from '@/components/routes/CompanyFinancials'

// Shared with /en/c/[sym]/financials.
export default function Page() {
  const { sym } = useParams<{ sym: string }>()
  return <CompanyFinancials sym={(sym ?? '').toUpperCase()} />
}
