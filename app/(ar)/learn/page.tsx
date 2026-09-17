import { LearnPageBody } from '@/lib/learnData'

// Title/description live in ./layout.tsx.
export const revalidate = 300

export default function Page() {
  return <LearnPageBody locale="ar" />
}
