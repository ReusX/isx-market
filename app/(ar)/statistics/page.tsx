import { Statistics } from '@/components/routes/Statistics'

// Title/description live in ./layout.tsx. Shared with /en/statistics.
export const revalidate = 300

export default function Page() {
  return <Statistics />
}
