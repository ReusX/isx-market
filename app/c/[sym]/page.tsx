'use client'

import { useParams } from 'next/navigation'
import { CompanyClient } from './CompanyClient'

export default function CompanyPage() {
  const { sym } = useParams<{ sym: string }>()
  return <CompanyClient sym={(sym ?? '').toUpperCase()} />
}
