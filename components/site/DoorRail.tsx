'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { splitLocale } from '@/lib/i18n/paths'
import { existsIn } from '@/lib/i18n/routes'
import { EMPTY, arrange, readPrefs, writePrefs, type RailPrefs } from '@/lib/railPrefs'
import { NavIcon } from './SiteNav'
import { RailIcon } from './RailIcon'
import { RAILS, allPages, type Door, type RailDef } from './rails'

/**
 * Navigation WITHIN a product section — the pages of the active door.
 *
 * The top navigation is the product navigation (the four doors); this is
 * the only other navigation on the page, and it never repeats itself in
 * the content. Three shapes, one list:
 *
 *   ≥ 1280px  a 260px sidebar on the start side, sticky under the top nav;
 *             the active page a quiet surface with a thin blue edge.
 *   < 1280px  the sidebar leaves the grid and becomes one horizontally
 *             scrollable row above the content — never squeezed beside it.
 *   < 720px   out of the flow entirely: a «القسم» control opens the list.
 *
 * The list is the reader's to arrange. «تخصيص» turns every row into a
 * control: move up or down, hide, and a picker to pull in any page from
 * any section. The arrangement lives in localStorage per section
 * (lib/railPrefs) — applied after mount, so the server HTML is always the
 * default order and there is nothing for a crawler to disagree with.
 */
export type RailItem = { label: string; route: string; soon?: boolean }

type Row = { route: string; def: RailDef; label: string }

export function DoorRail({ door, items: _legacy }: { door: Door; items?: RailItem[] }) {
  const { t, locale, href: L } = useLocale()
  const { route } = splitLocale(usePathname() ?? '/')
  const name = t.home.landing.doors[door].name
  const S = t.site.rail

  const defaults = useMemo<Row[]>(() =>
    RAILS[door].filter((d) => d.soon || existsIn(d.route, locale)).map((d) => ({ route: d.route, def: d, label: d.label(t) })), [door, locale, t])
  const extras = useMemo<Row[]>(() =>
    allPages().filter((d) => existsIn(d.route, locale) && !RAILS[door].some((x) => x.route === d.route)).map((d) => ({ route: d.route, def: d, label: d.label(t) })), [door, locale, t])

  const [prefs, setPrefs] = useState<RailPrefs>(EMPTY)
  const [ready, setReady] = useState(false)
  const [editing, setEditing] = useState(false)
  const [picking, setPicking] = useState(false)
  /* Which parents show their sub-pages. A parent whose child is the current page starts open. */
  const [open, setOpen] = useState<string[]>([])
  useEffect(() => { const p = RAILS[door].find((d) => d.children?.some((c) => c.route === route)); if (p) setOpen((o) => o.includes(p.route) ? o : [...o, p.route]) }, [door, route])
  useEffect(() => { setPrefs(readPrefs(door)); setReady(true) }, [door])
  const save = (p: RailPrefs) => { setPrefs(p); writePrefs(door, p) }

  const rows = useMemo(() => arrange(defaults, extras, ready ? prefs : EMPTY), [defaults, extras, prefs, ready])
  const isOn = (r: Row) => route === r.def.route || (r.def.route !== '/' && route.startsWith(`${r.def.route}/`))
  const hidden = (r: Row) => prefs.hidden.includes(r.def.route) && !isOn(r)
  const shown = rows.filter((r) => editing || !hidden(r))
  const current = rows.find(isOn)
  const customised = prefs.order.length > 0 || prefs.hidden.length > 0 || prefs.added.length > 0

  const move = (r: Row, dir: -1 | 1) => {
    const order = rows.map((x) => x.def.route)
    const i = order.indexOf(r.def.route), j = i + dir
    if (j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    save({ ...prefs, order })
  }
  const toggleHide = (r: Row) => {
    const h = prefs.hidden.includes(r.def.route) ? prefs.hidden.filter((x) => x !== r.def.route) : [...prefs.hidden, r.def.route]
    save({ ...prefs, hidden: h })
  }
  const remove = (r: Row) => save({ ...prefs, added: prefs.added.filter((x) => x !== r.def.route), order: prefs.order.filter((x) => x !== r.def.route), hidden: prefs.hidden.filter((x) => x !== r.def.route) })
  const add = (d: RailDef) => { save({ ...prefs, added: [...prefs.added, d.route], hidden: prefs.hidden.filter((x) => x !== d.route) }); setPicking(false) }
  const reset = () => { save(EMPTY); setPicking(false) }
  const addable = extras.filter((x) => !prefs.added.includes(x.def.route))

  const list = (
    <nav className={`iqr-list ${editing ? 'is-editing' : ''}`.trim()} aria-label={name}>
      {shown.map((r, i) => {
        const d = r.def
        const tools = d.group === 'tools' && !editing && (i === 0 || shown[i - 1].def.group !== 'tools')
        const on = isOn(r)
        const hid = prefs.hidden.includes(d.route)
        const body = <><RailIcon name={d.icon} /><span className="iqr-label">{r.label}</span></>
        return (
          <div key={d.route} className="iqr-slot">
            {tools ? <p className="iqr-group">{S.tools}</p> : null}
            {editing ? (
              <div className={`iqr-item is-edit ${hid ? 'is-hidden' : ''}`.trim()}>
                {body}
                <span className="iqr-edit-acts">
                  <button type="button" className="iqr-mini" onClick={() => move(r, -1)} disabled={i === 0} aria-label={S.moveUp} title={S.moveUp}>↑</button>
                  <button type="button" className="iqr-mini" onClick={() => move(r, 1)} disabled={i === shown.length - 1} aria-label={S.moveDown} title={S.moveDown}>↓</button>
                  {prefs.added.includes(d.route)
                    ? <button type="button" className="iqr-mini" onClick={() => remove(r)} aria-label={S.remove} title={S.remove}>×</button>
                    : <button type="button" className="iqr-mini" onClick={() => toggleHide(r)} disabled={on} aria-pressed={hid} aria-label={hid ? S.show : S.hide} title={hid ? S.show : S.hide}>{hid ? '◌' : '●'}</button>}
                </span>
              </div>
            ) : d.soon ? (
              <span className="iqr-item is-soon" aria-disabled="true">{body}<small>{t.home.landing.soon}</small></span>
            ) : d.children?.length ? (
              <>
                <div className={`iqr-parent ${on ? 'is-on' : ''}`.trim()}>
                  <Link href={L(d.route)} className="iqr-item" aria-current={route === d.route ? 'page' : undefined}>{body}</Link>
                  <button type="button" className="iqr-chev" aria-expanded={open.includes(d.route)} aria-label={S.subpages} onClick={() => setOpen((o) => o.includes(d.route) ? o.filter((x) => x !== d.route) : [...o, d.route])}>
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
                {open.includes(d.route) ? (
                  <div className="iqr-sub">
                    {d.children.filter((c) => existsIn(c.route, locale)).map((c) => (
                      <Link key={c.route} href={L(c.route)} className="iqr-item is-sub" aria-current={route === c.route ? 'page' : undefined}>{c.icon ? <span className="iqr-emoji" aria-hidden="true">{c.icon}</span> : null}<span className="iqr-label">{c.label(t)}</span></Link>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <Link href={L(d.route)} className="iqr-item" aria-current={on ? 'page' : undefined}>{body}</Link>
            )}
          </div>
        )
      })}
      {editing ? (
        <div className="iqr-edit-foot">
          {picking ? (
            <div className="iqr-pick" role="group" aria-label={S.addPage}>
              {addable.length ? addable.map((x) => (
                <button key={x.def.route} type="button" className="iqr-item is-pick" onClick={() => add(x.def)}><RailIcon name={x.def.icon} /><span className="iqr-label">{x.label}</span><span className="iqr-mini" aria-hidden="true">+</span></button>
              )) : <p className="id-cap">{S.nothingToAdd}</p>}
              <button type="button" className="id-btn is-sm" onClick={() => setPicking(false)}>{S.cancel}</button>
            </div>
          ) : (
            <div className="iqr-edit-row">
              <button type="button" className="id-btn is-sm" onClick={() => setPicking(true)} disabled={!addable.length}>{S.addPage}</button>
              {customised ? <button type="button" className="id-btn is-sm" onClick={reset}>{S.reset}</button> : null}
            </div>
          )}
        </div>
      ) : null}
    </nav>
  )

  const editBtn = (
    <button type="button" className={`iqr-customise ${editing ? 'is-on' : ''}`.trim()} aria-pressed={editing} onClick={() => { setEditing((e) => !e); setPicking(false) }}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {editing ? <path d="M5 12l5 5L19 7" /> : <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>}
      </svg>
      <span>{editing ? S.done : S.customise}</span>
    </button>
  )

  return (
    <>
      <aside className="iqr" aria-label={name}>
        <p className="iqr-door"><NavIcon name={door} />{name}</p>
        {list}
        <div className="iqr-foot">{editBtn}</div>
      </aside>
      {/* Phone: the same list behind a «القسم» control. Native <details>, so
          it needs no script and closes on navigation like any link. */}
      <details className="iqr-sheet">
        <summary className="iqr-toggle" aria-label={t.site.section}>
          <span className="iqr-toggle-k">{t.site.section}</span>
          <span className="iqr-toggle-v">{current?.label ?? name}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </summary>
        <div className="iqr-sheet-body">
          {list}
          <div className="iqr-foot">{editBtn}</div>
        </div>
      </details>
    </>
  )
}
