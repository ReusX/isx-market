import { NewsPage } from '@/components/routes/newsData'

export const revalidate = 300

export default function Page() {
  return <NewsPage locale="en" />
}
