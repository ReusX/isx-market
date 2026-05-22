'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { rankFor, fmtPts } from '@/lib/ranks'

interface LeaderEntry {
  username: string
  points: number
  streak: number
  rank_id: string
}

export default function LeaderboardPage() {
  const { lang, profile } = useApp()
  const ar = lang === 'ar'
  const [data, setData]   = useState<LeaderEntry[]>([])
  const [loading, setL]   = useState(true)
  const [period, setPeriod] = useState<'all' | 'weekly'>('all')

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => setData(d.entries ?? []))
      .finally(() => setL(false))
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
          {ar ? 'المتصدرون' : 'Leaderboard'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink3)', margin: 0 }}>
          {ar ? 'أفضل المتداولين على منصة ISX Market' : 'Top traders on ISX Market'}
        </p>
      </div>

      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['all', 'weekly'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: '6px 16px', borderRadius: 999, border: 'none',
            background: period === p ? 'var(--brand)' : 'var(--surf)',
            color: period === p ? '#fff' : 'var(--ink3)',
            fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
          }}>
            {p === 'all' ? (ar ? 'كل الوقت' : 'All Time') : (ar ? 'هذا الأسبوع' : 'This Week')}
          </button>
        ))}
      </div>

      {/* My rank banner */}
      {profile && (
        <div style={{
          background: 'var(--brand-soft)', border: '1px solid var(--brand)',
          borderRadius: 14, padding: '12px 16px', marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
            {ar ? 'نقاطك' : 'Your Points'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16 }}>
            {fmtPts(profile.points)}
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        {loading && Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 10, width: 120, borderRadius: 4, marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 8, width: 70, borderRadius: 4 }} />
            </div>
            <div className="skeleton" style={{ height: 12, width: 60, borderRadius: 4 }} />
          </div>
        ))}
        {!loading && data.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>
            {ar ? 'لا توجد بيانات بعد — كن أول المتصدرين!' : 'No data yet — be the first!'}
          </div>
        )}
        {!loading && data.map((entry, i) => {
          const rank = rankFor(entry.points)
          const isMe = profile?.username === entry.username
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px', borderBottom: '1px solid var(--line)',
              background: isMe ? 'var(--brand-soft)' : '',
            }}>
              <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 18 : 12, color: 'var(--ink4)', fontWeight: 700, flexShrink: 0 }}>
                {i < 3 ? medals[i] : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    {entry.username}
                    {isMe && <span style={{ fontSize: 10, color: 'var(--brand)', marginInlineStart: 6 }}>({ar ? 'أنت' : 'you'})</span>}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: rank.color }}>{rank.icon} {ar ? rank.ar : rank.en}</span>
                </div>
                {entry.streak > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--ink4)' }}>🔥 {entry.streak} {ar ? 'يوم' : 'day streak'}</div>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--gold)' }}>
                {fmtPts(entry.points)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
