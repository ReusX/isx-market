import 'server-only'
import { createSign } from 'node:crypto'

/**
 * Firebase Cloud Messaging, HTTP v1 — the one channel the app's notifications
 * go out on (FCM also relays to iOS once an APNs key is added to the project).
 *
 * No SDK: a service account signs a JWT (RS256, node:crypto), Google trades it
 * for an access token, and each message is one POST. The access token lives
 * for an hour; it is cached for 50 minutes per server instance.
 *
 * Credentials: FIREBASE_SERVICE_ACCOUNT holds the service-account JSON that
 * Firebase generates (Project settings → Service accounts → Generate new
 * private key), either raw or base64-encoded. It is a secret: Vercel env and
 * .env.local only, never the repo.
 */
interface ServiceAccount { project_id: string; client_email: string; private_key: string }

function account(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  try {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    const a = JSON.parse(text) as ServiceAccount
    return a.project_id && a.client_email && a.private_key ? a : null
  } catch {
    return null
  }
}

export const pushConfigured = () => account() !== null

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64url')

let cached: { token: string; until: number } | null = null

async function accessToken(a: ServiceAccount): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token
  const now = Math.floor(Date.now() / 1000)
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: a.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(a.private_key)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${b64url(sig)}` }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fcm auth ${res.status}`)
  const j = (await res.json()) as { access_token: string }
  cached = { token: j.access_token, until: Date.now() + 50 * 60_000 }
  return j.access_token
}

export interface Push {
  title: string
  body: string
  /** Opened when the notification is tapped — a path on iraqsm.com. */
  url: string
  /** Groups a family of messages so a newer one replaces the older on the lock screen. */
  tag?: string
}

/** 'ok', 'dead' (token unregistered — disable the device) or 'error'. */
export type SendResult = 'ok' | 'dead' | 'error'

export async function sendToToken(token: string, p: Push, validateOnly = false): Promise<SendResult> {
  const a = account()
  if (!a) return 'error'
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken(a)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      validate_only: validateOnly,
      message: {
        token,
        notification: { title: p.title, body: p.body },
        data: { url: p.url },
        android: {
          priority: 'high',
          notification: { channel_id: 'prices', icon: 'ic_stat_iqwealth', color: '#146BFD', ...(p.tag ? { tag: p.tag } : {}) },
        },
        apns: { payload: { aps: { sound: 'default', ...(p.tag ? { 'thread-id': p.tag } : {}) } } },
      },
    }),
    cache: 'no-store',
  })
  if (res.ok) return 'ok'
  // FCM's own verdict on a token that will never work again.
  const text = await res.text()
  if (res.status === 404 || /UNREGISTERED|registration-token-not-registered/.test(text)) return 'dead'
  if (res.status === 400 && /INVALID_ARGUMENT/.test(text) && /token/i.test(text)) return 'dead'
  return 'error'
}

/** Fan a message out to many tokens, a few at a time. Returns the dead ones. */
export async function sendToMany(tokens: string[], p: Push): Promise<{ sent: number; dead: string[] }> {
  const dead: string[] = []
  let sent = 0
  for (let i = 0; i < tokens.length; i += 20) {
    const batch = tokens.slice(i, i + 20)
    const out = await Promise.all(batch.map((t) => sendToToken(t, p)))
    out.forEach((r, j) => { if (r === 'ok') sent += 1; else if (r === 'dead') dead.push(batch[j]) })
  }
  return { sent, dead }
}
