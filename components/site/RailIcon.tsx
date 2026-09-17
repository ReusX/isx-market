import type { RailIcon as Name } from './rails'

/* 24-grid, 1.6 stroke, round joins — the same hand as NavIcon so the rail
   and the top nav read as one family. */
const P: Record<Name, React.ReactNode> = {
  market:     <><path d="M3 17l5-6 4 4 5-7 4 3" /><path d="M3 21h18" /></>,
  board:      <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 10v10" /></>,
  companies:  <><path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" /><path d="M15 9h3a2 2 0 0 1 2 2v10M8 7h3M8 11h3M8 15h3M4 21h17" /></>,
  screener:   <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /></>,
  heatmap:    <><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="5" rx="1" /><rect x="13" y="10" width="8" height="11" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /></>,
  statistics: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  pulse:      <path d="M3 12h4l3-7 4 14 3-7h4" />,
  news:       <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h5v5H7zM14 8h3M14 11h3M7 16h10" /></>,
  banks:      <><path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 18h18" /><path d="M12 3l9 7H3z" /></>,
  deposits:   <><path d="M5 11a7 7 0 0 1 14 0v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" /><path d="M9 11h6M12 3v2" /><circle cx="17" cy="9" r=".6" /></>,
  loans:      <><path d="M3 17l4-1 5 2 6-3a2 2 0 0 0-2-3l-4 1" /><path d="M3 14l3-1" /><circle cx="15" cy="7" r="3" /></>,
  cards:      <><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M6 15h4" /></>,
  fx:         <><path d="M12 3v18" /><path d="M16.5 7.5A3.5 3.5 0 0 0 13 5h-2a3 3 0 0 0 0 6h2a3 3 0 0 1 0 6h-2a3.5 3.5 0 0 1-3.5-2.5" /></>,
  currencies: <><circle cx="9" cy="9" r="6" /><path d="M14.5 10.5A6 6 0 1 1 10.5 14.5" /></>,
  gold:       <><path d="M3 18l2-6h6l2 6zM11 18l2-6h6l2 6z" /><path d="M8 12l2-6h4l2 6" /></>,
  silver:     <><path d="M4 18l2-6h12l2 6z" /><path d="M9 12l1.5-5h3L15 12" /><path d="M12 3v2" /></>,
  oil:        <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  window:     <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11M15 9v11" /></>,
  inflation:  <><path d="M3 18l5-5 4 3 6-8" /><path d="M14 8h4v4" /></>,
  policyRate: <><path d="M5 19L19 5" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></>,
  learn:      <><path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" /></>,
  zero:       <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>,
  research:   <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M8 11h6M11 8v6" /></>,
  portfolio:  <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>,
  watchlist:  <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  alerts:     <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>,
}

export function RailIcon({ name }: { name: Name }) {
  return (
    <svg className="iqr-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  )
}
