import { AnalysisPage } from '@/components/site/AnalysisPage'

/* Title and description live in ../layout.tsx; the analysis itself is
   fetched in the browser from /api/analysis/[sym]. */
export default async function Page(props: { params: Promise<{ sym: string }> }) {
  const params = await props.params;
  return <AnalysisPage sym={params.sym.toUpperCase()} />
}
