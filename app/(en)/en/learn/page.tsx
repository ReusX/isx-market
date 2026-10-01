import { LearnPageBody } from '@/lib/learnData'

export const revalidate = 3600

export default function Page() {
  return <LearnPageBody locale="en" />
}
