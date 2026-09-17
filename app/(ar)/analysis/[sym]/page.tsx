import { AnalysisPage } from '@/components/site/AnalysisPage'

/* Title and description live in ../layout.tsx; the analysis itself is
   fetched in the browser from /api/analysis/[sym]. */
export default function Page({ params }: { params: { sym: string } }) {
  return <AnalysisPage sym={params.sym.toUpperCase()} />
}
