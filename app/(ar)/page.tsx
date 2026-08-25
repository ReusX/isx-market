import { HomePage } from '@/components/routes/HomePage'

// Title/description are the ROOT layout's defaults — the homepage is the one
// route whose metadata belongs there. The surface is shared with `/en`.
export const revalidate = 60

export default function Page() {
  return <HomePage />
}
