import { AboutPage } from '@/components/routes/AboutPage'

// The same surface as `/about`. It reads its language from the root layout, so
// there is one component and no English fork to keep in step.
export default function Page() {
  return <AboutPage />
}
