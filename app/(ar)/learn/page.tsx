import { LearnPageBody } from '@/lib/learnData'

// Title/description live in ./layout.tsx.
export const revalidate = 3600

export default function Page() {
  return <LearnPageBody locale="ar" />
}
