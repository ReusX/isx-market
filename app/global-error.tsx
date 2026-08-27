'use client'

/**
 * The last resort · a failure in the root layout itself.
 *
 * Next replaces <html> and <body> when this renders, so it cannot use the
 * shell, the fonts, the token layer or any component that assumes them. That
 * is precisely why it is one self-contained file with inline styles: a global
 * error handler that depends on the thing that just failed is not a handler.
 *
 * It is deliberately the plainest screen in the product. The `error` object is
 * received and not rendered, for the same reasons as app/(ar)/error.tsx.
 *
 * ── Why this one screen is bilingual ──────────────────────────────────────
 * Every other surface knows its language because the route group it lives in
 * has one. This file sits ABOVE both root layouts — it is what renders when a
 * root layout itself fails — so there is no locale to read, and the two
 * honest options are to guess or to say it twice. It says it twice. Guessing
 * from `navigator.language` would show an Arabic reader English on the one
 * screen where nothing else worked.
 *
 * The document is `lang="ar"` because the Arabic line comes first and is the
 * site's primary language; the English block carries its own `lang="en"` so a
 * screen reader switches voice rather than reading English with Arabic
 * phonetics.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center',
        background: '#f0efec', color: '#1e2220',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: '.08em', color: '#6e746f' }}>500</p>
          <h1 style={{ margin: '10px 0 0', fontSize: 22, lineHeight: 1.35 }}>حدث خطأ لدينا</h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.8, color: '#4a504b' }}>
            تعذّر تحميل التطبيق. المشكلة من جانبنا.
          </p>
          <div lang="en" dir="ltr" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #d8d6d1' }}>
            <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.35, fontWeight: 600 }}>
              Something went wrong on our side
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.7, color: '#4a504b' }}>
              The application failed to load. This is our problem.
            </p>
          </div>
          <div style={{ height: 22 }} />
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44, padding: '0 22px', borderRadius: 10, border: 0,
              background: '#3171c6', color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            أعد المحاولة · Try again
          </button>
        </main>
      </body>
    </html>
  )
}
