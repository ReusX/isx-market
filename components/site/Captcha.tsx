'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useLocale } from '@/context/LocaleContext'

/**
 * Cloudflare Turnstile for the auth forms. Supabase Auth verifies the token
 * (Auth → Bot and Abuse Protection) on sign-up, password sign-in, password
 * reset and code resend, so every one of those calls passes
 * `options: { captchaToken }`.
 *
 * `interaction-only`: most readers never see it; a suspicious session gets a
 * one-tap check inside the form. Tokens are single-use, so `token()` hands
 * out the current one and resets the widget for the next attempt.
 *
 * Without NEXT_PUBLIC_TURNSTILE_SITE_KEY (a dev machine without the key) the
 * hook renders nothing and `token()` resolves undefined.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type Turnstile = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: Turnstile } }

let loading: Promise<void> | null = null
function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SRC; s.async = true; s.defer = true
    s.onload = () => resolve()
    s.onerror = () => { loading = null; reject(new Error('turnstile')) }
    document.head.appendChild(s)
  })
  return loading
}

export function useCaptcha() {
  const { locale } = useLocale()
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const current = useRef<string | null>(null)
  const waiters = useRef<((t: string | undefined) => void)[]>([])

  useEffect(() => {
    if (!SITE_KEY) return
    let gone = false
    load().then(() => {
      if (gone || !box.current || !window.turnstile) return
      widget.current = window.turnstile.render(box.current, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',
        language: locale,
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
        callback: (t: string) => { current.current = t; waiters.current.splice(0).forEach((w) => w(t)) },
        'expired-callback': () => { current.current = null },
        'error-callback': () => { current.current = null },
      })
    }).catch(() => { /* blocked script: the call goes without a token and Supabase says why */ })
    return () => {
      gone = true
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
  }, [locale])

  /** The token for one auth call; waits up to 20s for the check to finish. */
  const token = useCallback((): Promise<string | undefined> => {
    if (!SITE_KEY) return Promise.resolve(undefined)
    const take = (t: string | undefined) => {
      current.current = null
      if (widget.current && window.turnstile) window.turnstile.reset(widget.current)
      return t
    }
    if (current.current) return Promise.resolve(take(current.current))
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(undefined), 20_000)
      waiters.current.push((t) => { clearTimeout(timer); resolve(take(t)) })
    })
  }, [])

  const el = SITE_KEY ? <div ref={box} className="ath-captcha" /> : null
  return { el, token }
}
