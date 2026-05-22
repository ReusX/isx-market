import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'مخططات بورصة العراق | ISX Charts',
  description: 'مخططات أسعار أسهم بورصة العراق ومؤشر RSISX التاريخية. Iraq Stock Exchange historical price charts and RSISX index.',
  alternates: { canonical: 'https://iraqsm.com/charts' },
  openGraph: { url: 'https://iraqsm.com/charts', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
}
export default function ChartsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        Iraq Stock Exchange Charts — ISX Price History
      </h1>
      {children}
    </>
  )
}
