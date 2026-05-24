'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'

interface ChatMessage {
  id: number
  user_id: string
  username: string
  message: string
  created_at: string
}

// Deterministic color from username
function avatarColor(name: string) {
  const colors = ['#4F6BFF', '#22C55E', '#F5C84B', '#A855F7', '#EF4444', '#06B6D4', '#F97316', '#EC4899']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function timeLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffM = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffM < 1) return 'الآن'
  if (diffM < 60) return `${diffM}د`
  if (diffM < 1440) return `${Math.floor(diffM / 60)}س`
  return d.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' })
}

const MAX_MESSAGES = 150
const supabase = createClient()

export default function ChatWidget() {
  const { user, profile, openAuth } = useApp()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const atBottomRef = useRef(true)

  // Load recent messages on mount
  useEffect(() => {
    supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_MESSAGES)
      .then(({ data }) => {
        if (data) setMessages(data.reverse())
      })
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as ChatMessage
          setMessages(prev => {
            const next = [...prev, msg]
            return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
          })
          if (!open || !atBottomRef.current) {
            setUnread(n => n + 1)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [open])

  // Scroll to bottom when opening or when new message arrives and user is at bottom
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [open, messages.length])

  // Track scroll position to know if user is at bottom
  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    if (atBottomRef.current) setUnread(0)
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || !user || !profile?.username || sending) return
    setSending(true)
    setInput('')
    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      username: profile.username,
      message: text,
    })
    if (error) setInput(text) // restore on failure
    setSending(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Community chat"
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
          right: 16,
          zIndex: 300,
          width: 48, height: 48,
          borderRadius: '50%',
          background: open ? 'var(--surf3)' : 'var(--brand)',
          border: '1px solid var(--line2)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
          cursor: 'pointer',
          transition: 'background 0.15s, transform 0.15s',
        }}
        className="chat-fab"
      >
        {open ? '✕' : '💬'}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--dn)', color: '#fff',
            fontSize: 10, fontWeight: 800,
            borderRadius: 10, minWidth: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 140px)',
          right: 12,
          zIndex: 299,
          width: 'min(360px, calc(100vw - 24px))',
          height: 'min(480px, calc(100dvh - 180px))',
          background: 'var(--surf)',
          border: '1px solid var(--line2)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          animation: 'chatSlideUp 0.18s ease-out',
        }}>

          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--surf2)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>💬</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>دردشة المجتمع</span>
              <span style={{
                fontSize: 10, background: 'var(--up-s)', color: 'var(--up)',
                borderRadius: 6, padding: '2px 6px', fontWeight: 700,
              }}>LIVE</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 16, lineHeight: 1, padding: 4 }}
            >✕</button>
          </div>

          {/* Messages list */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            style={{
              flex: 1, overflowY: 'auto',
              padding: '8px 0',
              display: 'flex', flexDirection: 'column', gap: 0,
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--ink4)', fontSize: 13, marginTop: 40 }}>
                كن أول من يبدأ المحادثة 👋
              </div>
            )}
            {messages.map((m, i) => {
              const isMine = m.user_id === user?.id
              const showAvatar = i === 0 || messages[i - 1].user_id !== m.user_id
              const color = avatarColor(m.username)
              return (
                <div key={m.id} style={{
                  display: 'flex',
                  flexDirection: isMine ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  gap: 6,
                  padding: '2px 12px',
                  marginTop: showAvatar ? 8 : 1,
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: showAvatar ? color : 'transparent',
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: '#fff',
                  }}>
                    {showAvatar ? initials(m.username) : ''}
                  </div>

                  <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                    {showAvatar && (
                      <span style={{ fontSize: 10, color: color, fontWeight: 700, marginBottom: 2, paddingInline: 4 }}>
                        {isMine ? 'أنت' : m.username}
                      </span>
                    )}
                    <div style={{
                      background: isMine ? 'var(--brand)' : 'var(--surf3)',
                      color: isMine ? '#fff' : 'var(--ink)',
                      borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      padding: '7px 12px',
                      fontSize: 13,
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                      {m.message}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 3, paddingInline: 4 }}>
                      {timeLabel(m.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Unread pill */}
          {unread > 0 && (
            <button
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                position: 'absolute', bottom: 68, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--brand)', color: '#fff',
                border: 'none', borderRadius: 20, padding: '4px 14px',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              ↓ {unread} رسالة جديدة
            </button>
          )}

          {/* Input area */}
          <div style={{
            borderTop: '1px solid var(--line)', padding: '10px 12px',
            background: 'var(--surf2)', flexShrink: 0,
          }}>
            {!user ? (
              <button
                onClick={() => openAuth('signin')}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10,
                  background: 'var(--brand)', color: '#fff',
                  border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                سجّل دخولك للمشاركة في الدردشة
              </button>
            ) : !profile?.username ? (
              <div style={{ fontSize: 12, color: 'var(--ink3)', textAlign: 'center', padding: 8 }}>
                أكمل إعداد ملفك الشخصي لتتمكن من الدردشة
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value.slice(0, 500))}
                  onKeyDown={handleKey}
                  placeholder="اكتب رسالة..."
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', padding: '8px 12px',
                    borderRadius: 10, background: 'var(--surf3)',
                    border: '1px solid var(--line)', color: 'var(--ink)',
                    fontSize: 13, lineHeight: 1.5, outline: 'none',
                    fontFamily: 'inherit', overflow: 'hidden',
                    maxHeight: 80,
                  }}
                  onInput={e => {
                    const t = e.currentTarget
                    t.style.height = 'auto'
                    t.style.height = Math.min(t.scrollHeight, 80) + 'px'
                  }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: input.trim() ? 'var(--brand)' : 'var(--surf3)',
                    border: 'none', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, cursor: input.trim() ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                >
                  {sending ? '…' : '↑'}
                </button>
              </div>
            )}
            {user && profile?.username && (
              <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 4, textAlign: 'end' }}>
                {500 - input.length} حرف متبقٍ
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 769px) {
          .chat-fab {
            bottom: 24px !important;
          }
        }
      `}</style>
    </>
  )
}
