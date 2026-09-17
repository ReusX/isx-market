/**
 * Turn a live chart SVG into a PNG the reader can copy or save.
 *
 * The chart is styled by stylesheet classes and CSS variables, none of which
 * survive serialisation, so every element's computed paint and type is
 * inlined onto a clone first. A caption band (title · value · date · site)
 * is drawn above the plot so the image explains itself once it leaves the
 * page. Rendered at 2× for crisp text; fonts fall back to the system stack
 * because a detached SVG cannot reach the page's webfonts.
 */
const PAINT = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linejoin', 'stroke-linecap', 'opacity',
  'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor', 'dominant-baseline', 'direction', 'stop-color', 'stop-opacity'] as const

export type ChartCaption = { title: string; value: string; note: string; brand: string }

function inlineStyles(src: Element, dst: Element) {
  const cs = getComputedStyle(src)
  for (const p of PAINT) {
    const v = cs.getPropertyValue(p)
    if (v) (dst as HTMLElement | SVGElement).style.setProperty(p, v)
  }
  const a = src.children, b = dst.children
  for (let i = 0; i < a.length; i++) inlineStyles(a[i], b[i])
}

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string))

export async function chartToPng(svg: SVGSVGElement, cap: ChartCaption): Promise<Blob> {
  const box = svg.getBoundingClientRect()
  const W = Math.round(box.width), H = Math.round(box.height)
  const BAND = 64, PAD = 16
  const clone = svg.cloneNode(true) as SVGSVGElement
  inlineStyles(svg, clone)
  clone.removeAttribute('class')
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(W)); clone.setAttribute('height', String(H))
  clone.setAttribute('x', '0'); clone.setAttribute('y', String(BAND))

  const root = getComputedStyle(document.documentElement)
  const bg = root.getPropertyValue('--surface').trim() || '#fff'
  const ink = root.getPropertyValue('--ink').trim() || '#000'
  const muted = root.getPropertyValue('--muted').trim() || '#666'
  const font = getComputedStyle(svg).fontFamily || 'system-ui, sans-serif'
  const rtl = document.documentElement.dir === 'rtl'
  const xText = rtl ? W - PAD : PAD, xBrand = rtl ? PAD : W - PAD
  const anchor = rtl ? 'end' : 'start', anchorB = rtl ? 'start' : 'end'

  const outer = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + BAND}" viewBox="0 0 ${W} ${H + BAND}">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="${xText}" y="26" text-anchor="${anchor}" fill="${ink}" font-family="${esc(font)}" font-size="15" font-weight="600">${esc(cap.title)}</text>
    <text x="${xText}" y="48" text-anchor="${anchor}" fill="${ink}" font-family="${esc(font)}" font-size="13">${esc(cap.value)} <tspan fill="${muted}">· ${esc(cap.note)}</tspan></text>
    <text x="${xBrand}" y="26" text-anchor="${anchorB}" fill="${muted}" font-family="${esc(font)}" font-size="12" letter-spacing=".06em">${esc(cap.brand)}</text>
    ${new XMLSerializer().serializeToString(clone)}
  </svg>`
  const url = URL.createObjectURL(new Blob([outer], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    await new Promise<void>((ok, no) => { img.onload = () => ok(); img.onerror = () => no(new Error('svg')); img.src = url })
    const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 1))
    const cv = document.createElement('canvas')
    cv.width = W * scale; cv.height = (H + BAND) * scale
    const ctx = cv.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)
    return await new Promise<Blob>((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error('png'))), 'image/png'))
  } finally { URL.revokeObjectURL(url) }
}

/** Save the PNG as a file. */
export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

/**
 * Put the PNG on the clipboard. Safari only honours writes that begin
 * inside the user gesture, so the ClipboardItem takes the pending promise
 * rather than waiting for the blob first. Returns false where the API is
 * missing (Firefox without the flag, insecure contexts).
 */
export async function copyBlob(make: () => Promise<Blob>): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': make() })])
    return true
  } catch { return false }
}
