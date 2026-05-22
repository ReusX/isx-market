'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { rankFor, fmtPts, rankProgress, nextRank } from '@/lib/ranks'
import { createClient } from '@/lib/supabase/client'
import type { Holding, Transaction } from '@/types'

const VIRTUAL_CASH = 10_000_000 // 10M IQD starting cash

function WalletPageInner() {
  const { lang, user, profile, authLoading, refreshProfile, openAuth } = useApp()
  const ar = lang === 'ar'
  const sb = createClient()
  const searchParams = useSearchParams()

  const [holdings,  setHoldings]  = useState<Holding[]>([])
  const [txHistory, setTxHistory] = useState<Transaction[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tab, setTab]             = useState<'overview' | 'holdings' | 'history' | 'deposit'>('overview')
  const [depositAmt, setDeposit]  = useState('')
  const [submitting, setSubmit]   = useState(false)
  const [msg, setMsg]             = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      sb.from('holdings').select('*').eq('user_id', user.id),
      sb.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]).then(([{ data: h }, { data: t }]) => {
      setHoldings((h as Holding[]) ?? [])
      setTxHistory((t as Transaction[]) ?? [])
    }).finally(() => setLoading(false))
  }, [user])

  if (authLoading) return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
      {[120, 80, 200].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 16, marginBottom: 12 }} />
      ))}
    </div>
  )

  if (!user || !profile) return (
    <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
        {ar ? 'يجب تسجيل الدخول' : 'Sign in required'}
      </div>
      <button onClick={() => openAuth('signin')} style={{
        padding: '9px 20px', background: 'var(--brand)', borderRadius: 10,
        fontSize: 13, fontWeight: 700, color: '#fff', border: 'none', fontFamily: 'inherit',
      }}>
        {ar ? 'تسجيل الدخول' : 'Sign In'}
      </button>
    </div>
  )

  const rank      = rankFor(profile.points)
  const progress  = rankProgress(profile.points)
  const nxt       = nextRank(rank)
  const cashbal   = (profile as any).cash_balance ?? VIRTUAL_CASH

  const totalPortVal = holdings.reduce((sum, h) => sum + (h.avg_price * h.qty), 0)

  async function submitDeposit() {
    if (!depositAmt || Number(depositAmt) <= 0) return
    setSubmit(true)
    const res = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deposit_request', amount: Number(depositAmt) }),
    })
    const data = await res.json()
    if (data.ok) {
      setMsg(ar ? 'تم إرسال طلب الإيداع بنجاح ✅' : 'Deposit request submitted ✅')
      setDeposit('')
    } else {
      setMsg(data.error ?? 'Error')
    }
    setSubmit(false)
  }

  const tabs = [
    { id: 'overview',  ar: 'نظرة عامة', en: 'Overview' },
    { id: 'holdings',  ar: 'المحفظة',   en: 'Holdings' },
    { id: 'history',   ar: 'السجل',     en: 'History' },
    { id: 'deposit',   ar: 'إيداع',     en: 'Deposit' },
  ] as const

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px' }}>
        {ar ? 'محفظتي' : 'My Wallet'}
      </h1>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surf)', borderRadius: 12, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            flex: 1, padding: '8px', borderRadius: 9, border: 'none',
            background: tab === t.id ? 'var(--surf2)' : 'none',
            color: tab === t.id ? 'var(--ink)' : 'var(--ink3)',
            fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
            boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
          }}>
            {ar ? t.ar : t.en}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Balance cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 600, marginBottom: 6 }}>
                {ar ? 'الرصيد النقدي' : 'Cash Balance'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--gold)' }}>
                {cashbal.toLocaleString('en')}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>IQD</div>
            </div>
            <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 600, marginBottom: 6 }}>
                {ar ? 'قيمة المحفظة' : 'Portfolio Value'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800 }}>
                {totalPortVal.toLocaleString('en', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>IQD</div>
            </div>
          </div>

          {/* Points & rank */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 600, marginBottom: 3 }}>
                  {ar ? 'النقاط' : 'Points'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800 }}>
                  {fmtPts(profile.points)}
                </div>
              </div>
              <div style={{
                padding: '6px 14px', borderRadius: 999,
                background: `${rank.color}22`, border: `1px solid ${rank.color}`,
                fontSize: 13, fontWeight: 700, color: rank.color,
              }}>
                {rank.icon} {ar ? rank.ar : rank.en}
              </div>
            </div>
            {nxt && (
              <>
                <div style={{ height: 6, background: 'var(--surf3)', borderRadius: 3, marginBottom: 6 }}>
                  <div style={{ height: '100%', borderRadius: 3, background: rank.color, width: `${progress}%`, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink4)' }}>
                  {ar
                    ? `${fmtPts(nxt.min - profile.points)} نقطة للوصول إلى ${nxt.ar}`
                    : `${fmtPts(nxt.min - profile.points)} pts to ${nxt.en}`}
                </div>
              </>
            )}
          </div>

          {/* Streak */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 600, marginBottom: 3 }}>
                {ar ? 'أيام التسلسل' : 'Streak'}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>
                🔥 {profile.streak ?? 0}
              </div>
            </div>
            <Link href="/rewards/spin" style={{
              padding: '9px 18px', background: 'linear-gradient(135deg,#4F6BFF,#A855F7)',
              borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {ar ? 'دوّر اليوم' : "Today's Spin"}
            </Link>
          </div>
        </div>
      )}

      {/* Holdings */}
      {tab === 'holdings' && (
        <div>
          {loading && <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />}
          {!loading && holdings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink4)', fontSize: 13 }}>
              {ar ? 'لا توجد أسهم في محفظتك بعد' : 'No holdings yet'}<br />
              <Link href="/market" style={{ color: 'var(--brand)', marginTop: 8, display: 'inline-block' }}>
                {ar ? 'تصفح السوق ›' : 'Browse Market ›'}
              </Link>
            </div>
          )}
          {!loading && holdings.length > 0 && (
            <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              {holdings.map((h, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
                  padding: '12px 16px', borderBottom: '1px solid var(--line)', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{h.sym}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{h.qty} {ar ? 'سهم' : 'shares'}</div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>{ar ? 'متوسط' : 'Avg'}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{h.avg_price.toFixed(3)}</div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>{ar ? 'القيمة' : 'Value'}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {(h.avg_price * h.qty).toLocaleString('en', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <Link href={`/c/${h.sym}`} style={{
                      padding: '4px 10px', background: 'var(--surf3)', borderRadius: 7,
                      fontSize: 11, color: 'var(--ink3)',
                    }}>›</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div>
          {loading && <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />}
          {!loading && txHistory.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink4)', fontSize: 13 }}>
              {ar ? 'لا توجد معاملات بعد' : 'No transactions yet'}
            </div>
          )}
          {!loading && txHistory.length > 0 && (
            <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              {txHistory.map((tx, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderBottom: '1px solid var(--line)',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                        background: tx.kind === 'buy' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                        color: tx.kind === 'buy' ? 'var(--up)' : 'var(--dn)',
                      }}>
                        {tx.kind.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{tx.sym ?? tx.kind}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 3 }}>
                      {new Date(tx.created_at).toLocaleDateString(ar ? 'ar-IQ' : 'en-GB')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>
                      {tx.amount.toLocaleString('en', { maximumFractionDigits: 0 })} IQD
                    </div>
                    {tx.qty && (
                      <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{tx.qty} {ar ? 'سهم' : 'shares'}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deposit */}
      {tab === 'deposit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              {ar ? 'طلب إيداع (تجريبي)' : 'Deposit Request (Demo)'}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', margin: '0 0 16px', lineHeight: 1.7 }}>
              {ar
                ? 'هذه منصة تداول افتراضية تعليمية. الأموال المُضافة هي رصيد تجريبي فقط وليس ودائع حقيقية.'
                : 'This is an educational paper-trading platform. Added funds are virtual credits only, not real deposits.'}
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--ink4)', display: 'block', marginBottom: 5 }}>
                {ar ? 'المبلغ (IQD)' : 'Amount (IQD)'}
              </label>
              <input type="number" min="0" value={depositAmt} onChange={e => setDeposit(e.target.value)}
                placeholder="1,000,000"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: 'var(--surf3)', border: '1px solid var(--line2)',
                  color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 15, outline: 'none',
                }} />
            </div>
            {msg && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 12, color: 'var(--up)', marginBottom: 10 }}>
                {msg}
              </div>
            )}
            <button onClick={submitDeposit} disabled={submitting || !depositAmt} style={{
              width: '100%', padding: '11px', borderRadius: 10, border: 'none',
              background: 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: 14,
              fontFamily: 'inherit', opacity: submitting ? 0.6 : 1,
            }}>
              {submitting ? '...' : (ar ? 'إرسال الطلب' : 'Submit Request')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)' }}>Loading…</div>}>
      <WalletPageInner />
    </Suspense>
  )
}
