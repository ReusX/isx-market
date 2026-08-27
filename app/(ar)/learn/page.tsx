import { LearnPageBody } from '@/components/routes/learnData'

// Title/description live in ./layout.tsx.
export const revalidate = 300

export default function Page() {
  return <LearnPageBody locale="ar" />
}
