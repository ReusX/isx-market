'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { rankFor, fmtPts, rankProgress, nextRank } from '@/lib/ranks'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const { lang, user, profile, refreshProfile, signOut } = useApp()
  const ar = lang === 'ar'
  const sb = createClient()
  const [editing, setEditing]   = useState(false)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  if (!user || !profile) return (
    <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
        {ar ? 'يجب تسجيل الدخول' : 'Sign in required'}
      </div>
      <Link href="/?auth=signup" style={{
        padding: '9px 20px', background: 'var(--brand)', borderRadius: 10,
        fontSize: 13, fontWeight: 700, color: '#fff', display: 'inline-block',
      }}>
        {ar ? 'تسجيل الدخول' : 'Sign In'}
      </Link>
    </div>
  )

  const rank     = rankFor(profile.points)
  const progress = rankProgress(profile.points)
  const nxt      = nextRank(rank)

  async function saveUsername() {
    if (!username.trim() || username === profile?.username) { setEditing(false); return }
    setSaving(true)
    await sb.from('profiles').update({ username: username.trim() }).eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const statCard = (icon: string, label: string, val: string | number) => (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800 }}>{val}</div>
      <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>{label}</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px' }}>
      {/* Avatar & name */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 20, padding: '24px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--brand)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {(profile.username ?? user.email ?? '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={username} onChange={e => setUsername(e.target.value)} autoFocus
                style={{
                  padding: '7px 10px', borderRadius: 8, background: 'var(--surf3)',
                  border: '1px solid var(--brand)', color: 'var(--ink)', fontFamily: 'inherit',
                  fontSize: 15, fontWeight: 700, outline: 'none', width: 160,
                }} />
              <button onClick={saveUsername} disabled={saving} style={{
                padding: '7px 14px', background: 'var(--brand)', borderRadius: 8,
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
              }}>
                {saving ? '...' : (ar ? 'حفظ' : 'Save')}
              </button>
              <button onClick={() => { setEditing(false); setUsername(profile.username ?? '') }} style={{
                padding: '7px 12px', background: 'var(--surf3)', borderRadius: 8,
                border: 'none', color: 'var(--ink3)', fontSize: 12, fontFamily: 'inherit',
              }}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 18 }}>{profile.username}</span>
              {saved && <span style={{ fontSize: 11, color: 'var(--up)' }}>✓</span>}
              <button onClick={() => setEditing(true)} style={{
                background: 'none', border: '1px solid var(--line)', borderRadius: 6,
                padding: '3px 9px', fontSize: 11, color: 'var(--ink4)', fontFamily: 'inherit',
              }}>
                {ar ? 'تعديل' : 'Edit'}
              </button>
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 3 }}>{user.email}</div>
          <div style={{ marginTop: 6 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: `${rank.color}22`, color: rank.color, border: `1px solid ${rank.color}`,
            }}>
              {rank.icon} {ar ? rank.ar : rank.en}
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {statCard('₽', ar ? 'نقطة' : 'Points', fmtPts(profile.points))}
        {statCard('🔥', ar ? 'تسلسل' : 'Streak', `${profile.streak ?? 0}d`)}
        {statCard(rank.icon, ar ? 'الرتبة' : 'Rank', ar ? rank.ar : rank.en)}
      </div>

      {/* Progress bar */}
      {nxt && (
        <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
            <span style={{ color: rank.color, fontWeight: 700 }}>{ar ? rank.ar : rank.en}</span>
            <span style={{ color: 'var(--ink4)' }}>{Math.round(progress)}%</span>
            <span style={{ color: nxt.color, fontWeight: 700 }}>{ar ? nxt.ar : nxt.en}</span>
          </div>
          <div style={{ height: 8, background: 'var(--surf3)', borderRadius: 4 }}>
            <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${rank.color}, ${nxt.color})`, width: `${progress}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 6 }}>
            {fmtPts(nxt.min - profile.points)} {ar ? 'نقطة متبقية' : 'pts to next rank'}
          </div>
        </div>
      )}

      {/* Referral section */}
      <div id="referral" style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
          {ar ? '👥 رمز الإحالة' : '👥 Referral Code'}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <div style={{
            flex: 1, padding: '10px 14px', background: 'var(--surf3)',
            borderRadius: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16,
            letterSpacing: '0.1em', color: 'var(--gold)',
          }}>
            {profile.referral_code ?? '—'}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(profile.referral_code ?? '')}
            style={{
              padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)',
              background: 'var(--surf3)', color: 'var(--ink3)', fontSize: 12, fontFamily: 'inherit',
            }}>
            {ar ? 'نسخ' : 'Copy'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.6 }}>
          {ar
            ? 'شارك رمزك واحصل على 500 نقطة لكل صديق يسجّل معك!'
            : 'Share your code and earn 500 pts for every friend who signs up!'}
        </div>
      </div>

      {/* Sign out */}
      <button onClick={signOut} style={{
        width: '100%', padding: '11px', borderRadius: 12,
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
        color: 'var(--dn)', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
      }}>
        {ar ? 'تسجيل الخروج' : 'Sign Out'}
      </button>
    </div>
  )
}
