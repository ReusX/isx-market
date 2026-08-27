import { Heatmap } from '@/components/routes/Heatmap'

// Title/description live in ./layout.tsx. Shared with /en/heatmap.
export const revalidate = 300

export default function Page() {
  return <Heatmap />
}
