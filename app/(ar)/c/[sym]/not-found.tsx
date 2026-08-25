import Link from 'next/link'

export default function CompanyNotFound() {
  return (
    <div style={{
      maxWidth: 480, margin: '80px auto', padding: '0 24px',
      textAlign: 'center', fontFamily: 'inherit',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📉</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
        Company Not Found
      </h2>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 24, lineHeight: 1.6 }}>
        This ticker isn't listed on the Iraq Stock Exchange, or may have been delisted.
      </p>
      <Link href="/companies" style={{
        display: 'inline-block', padding: '10px 24px',
        background: 'var(--brand)', color: '#fff',
        borderRadius: 10, fontWeight: 700, fontSize: 14,
      }}>
        View All Listed Companies
      </Link>
    </div>
  )
}
