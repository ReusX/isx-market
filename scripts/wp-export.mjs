/**
 * One-time export of the headless WordPress posts into content/articles/.
 *
 * Every post becomes `content/articles/<section>/<id>.md`: YAML-ish frontmatter
 * plus the body EXACTLY as WordPress rendered it (`format: html`). Nothing is
 * rewritten except image URLs, which are downloaded into public/articles/<id>/
 * so the pages stop hotlinking other outlets and stop depending on the CMS host.
 *
 *   node scripts/wp-export.mjs [origin]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const WP = (process.argv[2] || 'https://paleturquoise-deer-610016.hostingersite.com').replace(/\/$/, '')
const SECTIONS = { 2: 'news', 3: 'research', 4: 'learn' }
const FIELDS = 'id,slug,date,modified,title,excerpt,content,featured_media,categories,tags,_embedded'

const yamlStr = (s) => JSON.stringify(String(s ?? ''))

async function fetchAll() {
  const out = []
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${WP}/wp-json/wp/v2/posts?page=${page}&per_page=100&_embed=1&_fields=${FIELDS}&orderby=date&order=desc`)
    if (!res.ok) break
    const posts = await res.json()
    out.push(...posts)
    if (posts.length < 100) break
  }
  return out
}

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' }

async function localise(id, html) {
  // Hostinger's lazy-loader leaves a 1×1 SVG in src and the real URL in data-src.
  html = html.replace(/<img([^>]*?)\ssrc="data:image\/svg\+xml[^"]*"([^>]*?)\sdata-src="([^"]+)"/gi, '<img$1 src="$3"$2')
             .replace(/<img([^>]*?)\sdata-src="([^"]+)"([^>]*?)\ssrc="data:image\/svg\+xml[^"]*"/gi, '<img$1 src="$2"$3')
             .replace(/\s(data-src|data-srcset|srcset|loading|decoding)="[^"]*"/gi, '')
  const urls = [...new Set([...html.matchAll(/\bsrc="(https?:\/\/[^"]+)"/g)].map(m => m[1]))]
  let n = 0
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: new URL(url).origin } })
      const type = (res.headers.get('content-type') || '').split(';')[0]
      if (!res.ok || !EXT[type]) { console.warn(`  keep ${url} (${res.status} ${type})`); continue }
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 2000) { console.warn(`  keep ${url} (tiny)`); continue }
      n += 1
      const dir = path.join('public', 'articles', String(id))
      await mkdir(dir, { recursive: true })
      const file = `${n}${EXT[type]}`
      await writeFile(path.join(dir, file), buf)
      html = html.split(url).join(`/articles/${id}/${file}`)
    } catch (e) { console.warn(`  keep ${url} (${e.message})`) }
  }
  return html
}

const posts = await fetchAll()
console.log(`${posts.length} posts`)
for (const p of posts) {
  const section = SECTIONS[p.categories?.[0]] || 'news'
  const dir = path.join('content', 'articles', section)
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, `${p.id}.md`)
  if (existsSync(file)) { console.log(`skip ${file}`); continue }
  console.log(`${file}  ${p.slug.slice(0, 40)}`)
  const body = await localise(p.id, p.content.rendered.trim())
  const image = body.match(/<img[^>]*\ssrc="([^"]+)"/)?.[1] ?? ''
  const fm = [
    '---',
    `id: ${p.id}`,
    `slug: ${yamlStr(decodeURIComponent(p.slug))}`,
    `title: ${yamlStr(p.title.rendered.replace(/<[^>]*>/g, '').trim())}`,
    `excerpt: ${yamlStr(p.excerpt.rendered.replace(/<[^>]*>/g, '').replace(/&hellip;|\[&hellip;\]/g, '…').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim())}`,
    `date: ${p.date}+03:00`,
    `modified: ${p.modified}+03:00`,
    `author: ${yamlStr(p._embedded?.author?.[0]?.name ?? '')}`,
    `image: ${yamlStr(image)}`,
    'format: html',
    '---',
  ].join('\n')
  await writeFile(file, `${fm}\n\n${body}\n`)
}
