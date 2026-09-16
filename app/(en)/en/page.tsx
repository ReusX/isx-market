import { Landing } from '@/components/routes/Landing'

export const revalidate = 60

export default function Page() {
  return <Landing locale="en" />
}
