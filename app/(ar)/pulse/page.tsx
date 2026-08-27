import { Pulse } from '@/components/routes/Pulse'

// Title/description live in ./layout.tsx. Shared with /en/pulse.
export const revalidate = 300

export default function Page() {
  return <Pulse />
}
