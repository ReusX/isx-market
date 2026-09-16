import { SiteNav } from './SiteNav'
import { SiteFoot } from './SiteFoot'
import '@/styles/site.css'

/**
 * What a rebuilt page wears: the pill navigation above, the foot below.
 * A route that renders this must also be listed in AppFrame.REBUILT so the
 * old frame steps aside; that list is the migration ledger.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <SiteNav on="page" />
      {children}
      <SiteFoot />
    </div>
  )
}
