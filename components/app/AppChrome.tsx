'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { splitLocale } from '@/lib/i18n/paths'
import { existsIn } from '@/lib/i18n/routes'
import type { Messages } from '@/lib/i18n'
import { isNativeApp, enablePush, pushApi, type Topic } from '@/lib/nativePush'
import {
  HOME, SETTINGS, NATIVE_KEY, INTERESTS, interestDef, interestOf, readPrefs, writePrefs, defaultPrefs,
  startRoute, tabsFor, haptic, shareScreen, appRoute, publicRoute, type AppPrefs, type Interest, type Tab,
} from '@/lib/appMode'
import { RAILS, railDef, type Door, type RailIcon as IconName } from '@/components/site/rails'
import { RailIcon } from '@/components/site/RailIcon'
import { ThemeToggle } from '@/components/site/ThemeToggle'
import { LanguageSwitch } from '@/components/site/LanguageSwitch'
import '@/styles/app.css'

/**
 * The app's frame, drawn only inside the IQWealth app (`html.is-app`).
 *
 * The page underneath is the website page, unchanged; the website's own
 * chrome is hidden by styles/app.css. This adds what an app has instead:
 * a slim top bar with the section's pages as chips, a bottom tab bar built
 * from the reader's interests, the «المزيد» sheet, pull-to-refresh, a short
 * page transition, and — on first launch — the «ما الذي يهمك؟» onboarding.
 */
const TAB_ICON: Record<string, IconName | 'home' | 'more'> = {
  home: 'home', fx: 'fx', gold: 'gold', market: 'market', banks: 'banks', economy: 'oil',
  learn: 'learn', news: 'news', notify: 'notify', more: 'more',
}
const INTEREST_ICON: Record<Interest, IconName> = {
  fx: 'fx', gold: 'gold', market: 'market', banks: 'banks', economy: 'oil', learn: 'learn', news: 'news',
}

function Icon({ name }: { name: IconName | 'home' | 'more' | 'share' }) {
  if (name === 'home' || name === 'more' || name === 'share') {
    return (
      <svg className="iqr-ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {name === 'home' ? <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>
          : name === 'more' ? <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>
          : <><path d="M12 3v12" /><path d="M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>}
      </svg>
    )
  }
  return <RailIcon name={name} />
}

/** A page's label as the site's rails name it, children included. */
function pageLabel(route: string, t: Messages): string | null {
  for (const door of Object.keys(RAILS) as Door[]) {
    for (const d of RAILS[door]) {
      if (d.route === route) return d.label(t)
      const c = d.children?.find((x) => x.route === route)
      if (c) return c.label(t)
    }
  }
  return null
}

export function AppChrome() {
  const { t, locale, href: L } = useLocale()
  const A = t.app
  const router = useRouter()
  const pathname = usePathname() ?? '/'
  const { route } = splitLocale(pathname)
  const [on, setOn] = useState(false)
  const [prefs, setPrefs] = useState<AppPrefs | null>(null)
  const [ready, setReady] = useState(false)
  const [more, setMore] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  /* ── Mode, prefs, and the launch redirect ─────────────────────────────── */
  useEffect(() => {
    const html = document.documentElement
    if (isNativeApp()) {
      try { localStorage.setItem(NATIVE_KEY, '1') } catch { /* ignore */ }
      html.classList.add('is-app')
    }
    const isApp = html.classList.contains('is-app')
    setOn(isApp)
    if (!isApp) return
    // No pinch zoom inside the app: the pages are laid out for the phone already.
    const vp = document.querySelector('meta[name="viewport"]')
    vp?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    const load = () => setPrefs(readPrefs())
    load()
    setReady(true)
    window.addEventListener('iq:prefs', load)
    return () => window.removeEventListener('iq:prefs', load)
  }, [])

  // The pre-paint script normally does this before anything draws; this is the
  // fallback for a launch where it could not (first run, or the bridge was late).
  useEffect(() => {
    if (!on || !ready) return
    let started = false
    try { started = sessionStorage.getItem('iq.app.started') === '1'; sessionStorage.setItem('iq.app.started', '1') } catch { /* ignore */ }
    if (!started && route === '/') router.replace(L(startRoute(readPrefs())))
  }, [on, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Per navigation: remember the tab, animate the page in ────────────── */
  useEffect(() => {
    if (!on) return
    const alt = appRoute(route)
    if (alt) { router.replace(L(alt)); return }
    setMore(false)
    const p = readPrefs()
    if (p && (route === HOME || interestOf(route))) {
      if (p.last !== route) { p.last = route; try { localStorage.setItem('iq.app', JSON.stringify(p)) } catch { /* ignore */ } }
    }
    const main = document.querySelector('.site > main, main')
    if (main && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      main.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' })
    }
    window.scrollTo(0, 0)
  }, [on, route]) // eslint-disable-line react-hooks/exhaustive-deps

  // The page is padded by the bar's real height (it grows by the chip row).
  useEffect(() => {
    if (!on || !prefs) return
    const bar = document.querySelector<HTMLElement>('.app-top')
    if (!bar) return
    const set = () => document.documentElement.style.setProperty('--app-top', `${bar.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [on, prefs, route])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }, [])

  if (!on) return null
  if (ready && !prefs) return <Onboarding onDone={(p, go) => { writePrefs(p); setPrefs(p); router.replace(L(go)) }} />
  if (!prefs) return null

  const tabs = tabsFor(prefs.interests)
  const here = interestOf(route)
  const active: Tab['id'] = route === HOME ? 'home'
    : route === '/notifications' ? 'notify'
    : here && tabs.some((x) => x.id === here) ? here
    : 'more'

  const section = here ? interestDef(here) : null
  const chips = section ? section.pages.filter((p) => existsIn(p, locale)) : []
  const chipOn = chips.filter((p) => route === p || route.startsWith(`${p}/`)).sort((a, b) => b.length - a.length)[0]
  const title = route === HOME ? A.brand
    : here ? (chipOn ? A.pages[chipOn] : null) ?? A.tabs[here]
    : route === SETTINGS ? A.settings.title
    : route === '/app/widgets' ? A.widgets.title
    : route === '/notifications' ? A.tabs.notify
    : A.brand

  return (
    <>
      <header className="app-top">
        {/* One row: the section's pages as chips when it has them, else the title. */}
        <div className="app-top-row">
          {chips.length > 1 ? (
            <nav className="app-chips" aria-label={title}>
              {chips.map((p) => (
                <Link key={p} href={L(p)} className="app-chip" aria-current={p === chipOn ? 'page' : undefined} onClick={haptic}>
                  {A.pages[p] ?? pageLabel(p, t) ?? p}
                </Link>
              ))}
            </nav>
          ) : <p className="app-title">{title}</p>}
          <button
            type="button" className="app-icon-btn" aria-label={A.share.label} disabled={sharing}
            onClick={async () => {
              haptic(); setSharing(true)
              const r = await shareScreen(document.title, location.origin + L(publicRoute(route)), locale === 'ar')
              setSharing(false)
              if (r === 'copied') flash(A.share.copied)
            }}
          >
            <Icon name="share" />
          </button>
        </div>
      </header>

      <PullToRefresh labels={A.ptr} onRefresh={() => { window.dispatchEvent(new Event('iq:refresh')); router.refresh() }} />

      <nav className="app-tabs" aria-label={A.brand}>
        {tabs.map((tab) => {
          const cur = tab.id === active
          const inner = (
            <>
              <span className="app-tab-ico"><Icon name={TAB_ICON[tab.id] as IconName} /></span>
              <span className="app-tab-txt">{A.tabs[tab.id]}</span>
            </>
          )
          return tab.route ? (
            <Link key={tab.id} href={L(tab.route)} className="app-tab" aria-current={cur ? 'page' : undefined} onClick={haptic}>{inner}</Link>
          ) : (
            <button key={tab.id} type="button" className="app-tab" aria-expanded={more} aria-current={cur ? 'page' : undefined} onClick={() => { haptic(); setMore((m) => !m) }}>{inner}</button>
          )
        })}
      </nav>

      {more ? <MoreSheet prefs={prefs} onClose={() => setMore(false)} /> : null}
      {toast ? <p className="app-toast" role="status">{toast}</p> : null}
    </>
  )
}

/* ── «المزيد» · every page of the chosen sections, then the app's own links ── */
function MoreSheet({ prefs, onClose }: { prefs: AppPrefs; onClose: () => void }) {
  const { t, locale, href: L } = useLocale()
  const A = t.app
  return (
    <div className="app-sheet-wrap" onClick={onClose}>
      <div className="app-sheet" role="dialog" aria-label={A.more.title} onClick={(e) => e.stopPropagation()}>
        <div className="app-sheet-grip" aria-hidden="true" />
        {INTERESTS.filter((i) => prefs.interests.includes(i.id)).map((i) => (
          <section key={i.id} className="app-sheet-sec">
            <h2 className="app-sheet-h">{A.interests[i.id].name}</h2>
            <ul className="app-sheet-list">
              {i.pages.filter((p) => existsIn(p, locale)).map((p) => (
                <li key={p}><Link href={L(p)} onClick={haptic}><RailIcon name={railDef(p)?.icon ?? INTEREST_ICON[i.id]} />{A.pages[p] ?? pageLabel(p, t) ?? p}</Link></li>
              ))}
            </ul>
          </section>
        ))}
        <section className="app-sheet-sec">
          <ul className="app-sheet-list">
            <li><Link href={L('/profile')} onClick={haptic}><RailIcon name="portfolio" />{A.more.account}</Link></li>
            <li><Link href={L('/notifications')} onClick={haptic}><RailIcon name="notify" />{A.tabs.notify}</Link></li>
            <li><Link href={L(SETTINGS)} onClick={haptic}><Icon name="more" />{A.more.settings}</Link></li>
            <li><Link href={L('/app/widgets')} onClick={haptic}><RailIcon name="heatmap" />{A.widgets.title}</Link></li>
            <li><Link href={L('/about')}>{A.more.about}</Link></li>
            <li><Link href={L('/privacy')}>{A.more.privacy}</Link></li>
            <li><Link href={L('/contact')}>{A.more.contact}</Link></li>
          </ul>
          <div className="app-sheet-row">
            <ThemeToggle />
            <LanguageSwitch variant="row" onNavigate={onClose} />
          </div>
        </section>
        <button type="button" className="id-btn app-sheet-close" onClick={onClose}>{A.more.close}</button>
      </div>
    </div>
  )
}

/* ── Pull to refresh ─────────────────────────────────────────────────────── */
function PullToRefresh({ labels, onRefresh }: { labels: { pull: string; release: string; loading: string }; onRefresh: () => void }) {
  const [dy, setDy] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef<number | null>(null)
  const TRIGGER = 72

  useEffect(() => {
    const down = (e: TouchEvent) => {
      if (window.scrollY > 0 || busy || document.querySelector('.app-sheet-wrap, .app-onb')) { start.current = null; return }
      start.current = e.touches[0].clientY
    }
    const move = (e: TouchEvent) => {
      if (start.current == null) return
      const d = e.touches[0].clientY - start.current
      if (d <= 0 || window.scrollY > 0) { setDy(0); return }
      setDy(Math.min(110, d * 0.5))
    }
    const up = () => {
      if (start.current == null) return
      start.current = null
      setDy((d) => {
        if (d >= TRIGGER) {
          setBusy(true); haptic(); onRefresh()
          setTimeout(() => setBusy(false), 1100)
        }
        return 0
      })
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [busy, onRefresh])

  if (!dy && !busy) return null
  return (
    <div className="app-ptr" style={{ transform: `translateY(${busy ? 48 : dy}px)` }} role="status">
      <span className={`app-ptr-spin ${busy || dy >= TRIGGER ? 'is-on' : ''}`} aria-hidden="true" />
      <span>{busy ? labels.loading : dy >= TRIGGER ? labels.release : labels.pull}</span>
    </div>
  )
}

/* ── First launch · «ما الذي يهمك؟» ─────────────────────────────────────── */
function Onboarding({ onDone }: { onDone: (p: AppPrefs, go: string) => void }) {
  const { t } = useLocale()
  const O = t.app.onboard
  const [picked, setPicked] = useState<Interest[]>([])
  const [step, setStep] = useState<'pick' | 'notify'>('pick')
  const [busy, setBusy] = useState(false)

  const topics = (['fx', 'gold', 'market'] as Topic[]).filter((x) => picked.includes(x as Interest))
  const finish = () => {
    const p = defaultPrefs(INTERESTS.map((i) => i.id).filter((id) => picked.includes(id)))
    onDone(p, startRoute(p))
  }
  const next = () => {
    haptic()
    if (topics.length && isNativeApp()) setStep('notify')
    else finish()
  }
  const list = topics.map((x) => O.topics[x])
  const joined = list.length > 1 ? `${list.slice(0, -1).join(O.comma)}${O.and}${list[list.length - 1]}` : list[0] ?? ''

  return (
    <div className="app-onb" role="dialog" aria-labelledby="app-onb-h">
      {step === 'pick' ? (
        <>
          <p className="app-onb-kicker">{O.welcome}</p>
          <h1 id="app-onb-h" className="app-onb-h">{O.title}</h1>
          <p className="app-onb-lead">{O.lead}</p>
          <ul className="app-onb-grid">
            {INTERESTS.map((i) => {
              const sel = picked.includes(i.id)
              return (
                <li key={i.id}>
                  <button
                    type="button" className="app-onb-opt" aria-pressed={sel}
                    onClick={() => { haptic(); setPicked((p) => (sel ? p.filter((x) => x !== i.id) : [...p, i.id])) }}
                  >
                    <RailIcon name={INTEREST_ICON[i.id]} />
                    <span className="app-onb-name">{t.app.interests[i.id].name}</span>
                    <span className="app-onb-note">{t.app.interests[i.id].note}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="app-onb-foot">
            <button type="button" className="id-btn is-primary app-onb-next" disabled={!picked.length} onClick={next}>
              {picked.length ? O.next : O.pickOne}
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 id="app-onb-h" className="app-onb-h">{O.notifyTitle}</h1>
          <p className="app-onb-lead">{O.notifyLead(joined)}</p>
          <div className="app-onb-foot is-stack">
            <button
              type="button" className="id-btn is-primary app-onb-next" disabled={busy}
              onClick={async () => {
                haptic(); setBusy(true)
                try { if (await enablePush()) await pushApi('topics', { topics }) } catch { /* settings page can retry */ }
                finish()
              }}
            >
              {O.notifyYes}
            </button>
            <button type="button" className="id-btn app-onb-skip" disabled={busy} onClick={finish}>{O.notifyLater}</button>
          </div>
        </>
      )}
    </div>
  )
}
