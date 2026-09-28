'use client'

/**
 * Push notifications inside the IQWealth app (Capacitor shell loading
 * iraqsm.com). On the plain website every function here is a no-op: the web
 * has no push, and `isNativeApp()` is false.
 *
 * The FCM token is kept in localStorage — it is this device's key to its own
 * settings at /api/push — and re-sent on every app start so the server can
 * notice a token Firebase has rotated.
 */
export type Topic = 'fx' | 'gold' | 'market'
export type AlertKind = 'fx' | 'gold' | 'stock'
export interface PushAlert {
  id: string; kind: AlertKind; symbol: string | null; op: 'above' | 'below'; target: number
  created_at: string; triggered_at: string | null; triggered_value: number | null
}
export interface PushState { topics: Topic[]; alerts: PushAlert[] }

const KEY = 'iq.push.token'

type Cap = { isNativePlatform?: () => boolean; getPlatform?: () => string }
const cap = (): Cap | undefined => (typeof window === 'undefined' ? undefined : (window as unknown as { Capacitor?: Cap }).Capacitor)

export const isNativeApp = () => !!cap()?.isNativePlatform?.()
export const platform = () => (cap()?.getPlatform?.() === 'ios' ? 'ios' : 'android')

export function savedToken(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

export async function pushApi(action: string, body: Record<string, unknown> = {}, token = savedToken()): Promise<PushState | null> {
  if (!token) return null
  const res = await fetch('/api/push', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token, ...body }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `push ${res.status}`)
  return res.json()
}

export type Permission = 'granted' | 'denied' | 'prompt' | 'unsupported'

export async function permission(): Promise<Permission> {
  if (!isNativeApp()) return 'unsupported'
  const { PushNotifications } = await import('@capacitor/push-notifications')
  const p = await PushNotifications.checkPermissions()
  return p.receive === 'granted' ? 'granted' : p.receive === 'denied' ? 'denied' : 'prompt'
}

/**
 * Ask for permission (only ever from a user's tap — Android shows the system
 * dialog once) and register with FCM. Resolves when the server knows the
 * device, with its settings.
 */
export async function enablePush(): Promise<PushState | null> {
  if (!isNativeApp()) return null
  const { PushNotifications } = await import('@capacitor/push-notifications')
  let p = await PushNotifications.checkPermissions()
  if (p.receive !== 'granted') p = await PushNotifications.requestPermissions()
  if (p.receive !== 'granted') return null
  const token = await new Promise<string>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('registration timed out')), 20_000)
    PushNotifications.addListener('registration', (r) => { clearTimeout(t); resolve(r.value) })
    PushNotifications.addListener('registrationError', (e) => { clearTimeout(t); reject(new Error(e.error)) })
    PushNotifications.register()
  })
  try { localStorage.setItem(KEY, token) } catch { /* private mode — settings still apply this session */ }
  return pushApi('register', { platform: platform() }, token)
}
