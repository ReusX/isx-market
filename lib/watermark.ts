// Shared chart watermarking + export helpers.
// Takes a source image (a data-URL produced by the chart library) and composites
// the iraqsm.com brand watermark onto it, then exposes download / clipboard copy.
// This guarantees the watermark is baked into every exported/copied image,
// regardless of what the live chart canvas contains.

const BRAND = '#4f6bff'

export type Composited = { blob: Blob; url: string }

/** Draw the source image onto a canvas over `bg`, stamp the watermark, return PNG. */
export async function compositeWatermark(
  src: string,
  opts: { bg: string; label?: string },
): Promise<Composited> {
  const img = new Image()
  img.src = src
  // decode() resolves once the image is ready to draw
  await img.decode()

  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // opaque background (chart canvases are often transparent)
  ctx.fillStyle = opts.bg
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  // ── centered large diffuse watermark ──
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.atan2(h, w) / 2) // gentle diagonal
  ctx.globalAlpha = 0.07
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 ${Math.round(Math.min(w, h * 2) / 11)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText('iraqsm.com', 0, 0)
  ctx.restore()

  // ── solid attribution badge, bottom-right ──
  const pad = Math.round(w * 0.012) + 6
  const fs = Math.max(13, Math.round(w / 64))
  ctx.save()
  ctx.font = `700 ${fs}px ui-sans-serif, system-ui, sans-serif`
  const text = opts.label ? `iraqsm.com · ${opts.label}` : 'iraqsm.com'
  const tw = ctx.measureText(text).width
  const bx = w - tw - pad * 2 - pad
  const by = h - fs - pad * 2 - pad
  const bw = tw + pad * 2
  const bh = fs + pad * 1.4
  // pill
  const r = bh / 2
  ctx.beginPath()
  ctx.moveTo(bx + r, by)
  ctx.arcTo(bx + bw, by, bx + bw, by + bh, r)
  ctx.arcTo(bx + bw, by + bh, bx, by + bh, r)
  ctx.arcTo(bx, by + bh, bx, by, r)
  ctx.arcTo(bx, by, bx + bw, by, r)
  ctx.closePath()
  ctx.globalAlpha = 0.9
  ctx.fillStyle = BRAND
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, bx + pad, by + bh / 2 + 1)
  ctx.restore()

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'),
  )
  return { blob, url: canvas.toDataURL('image/png') }
}

export function downloadImage(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Copy a PNG blob to the clipboard. Returns false if the browser blocks it. */
export async function copyImage(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return true
  } catch {
    return false
  }
}
