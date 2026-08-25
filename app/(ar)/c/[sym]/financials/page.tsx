'use client'

import { useParams } from 'next/navigation'
import { FinancialsClient } from './FinancialsClient'

export default function CompanyFinancialsPage() {
  const { sym } = useParams<{ sym: string }>()
  return <FinancialsClient sym={(sym ?? '').toUpperCase()} />
}
