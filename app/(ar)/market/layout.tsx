/**
 * /market redirects to the root (see ./page.tsx). Nothing renders here; the
 * layout exists so the route segment keeps its place while the redirect
 * settles in the index.
 */
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
