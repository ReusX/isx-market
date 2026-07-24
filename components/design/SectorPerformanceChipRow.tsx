import Link from 'next/link'
import { SectorChip } from './SectorChip'
import type { SectorDatum } from './magnitude'

/**
 * Sector performance strip. Each chip drills through to the heatmap filtered on
 * that sector, per the universal "every summary is clickable" rule.
 */
export function SectorPerformanceChipRow({ sectors }: { sectors: SectorDatum[] }) {
  const sortedSectors = [...sectors].sort((a, b) => b.change - a.change)

  return (
    <section className="sector-chip-section" aria-labelledby="sector-chip-title">
      <div className="sector-chip-header">
        <div>
          <div className="chip-eyebrow">
            <span className="flow-status-dot gain-dot" />
            <span>خريطة حرارية</span>
          </div>
          <h2 id="sector-chip-title">أداء القطاعات</h2>
        </div>
        <Link className="text-link" href="/heatmap">الخريطة الحرارية ←</Link>
      </div>

      {sortedSectors.length > 0 ? (
        <div className="sector-chip-row">
          {sortedSectors.map((sector) => (
            <SectorChip
              change={sector.change}
              href={`/heatmap?sector=${encodeURIComponent(sector.name)}`}
              key={sector.name}
              label={sector.name}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>لا توجد بيانات لليوم</strong>
          <span>تظهر القطاعات بعد توفر تداولات الجلسة.</span>
        </div>
      )}
    </section>
  )
}
