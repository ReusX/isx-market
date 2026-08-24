/**
 * The long-form article layer — what a WordPress body can honestly become.
 *
 * The approved article template wants a contents list, and the CMS does not
 * store one. `_fields` carries no outline, no heading list and no reading
 * time; the body arrives as one blob of HTML. So the outline is DERIVED from
 * the body's own headings, which is not invention — the headings are the
 * editor's, in the editor's order, with the editor's words.
 *
 * Nothing else is derived. Author, date, category and image are printed only
 * when the CMS actually has them; where it does not, the line is omitted
 * rather than filled with a placeholder or a dash.
 */

export type Heading = { id: string; text: string; level: 2 | 3 }

/** Strip tags and decode the handful of entities WordPress emits in titles. */
function plain(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&rsquo;|&#8217;/g, '’')
    .replace(/&hellip;/g, '…')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Give every h2/h3 in the body a stable id and return the outline.
 *
 * The id is positional (`sec1`, `sec2`, …) rather than a slug of the Arabic
 * heading: a percent-encoded Arabic fragment is unreadable in a shared URL and
 * breaks the moment a heading is edited. An id the editor already set is kept
 * — theirs is the one that may already be linked from elsewhere.
 *
 * ⚠ This is a targeted rewrite of two tag names, not an HTML parser and not a
 * sanitiser. The body is rendered exactly as WordPress returned it, the way
 * the live article template already does; this adds an attribute and reads the
 * text between the tags, and touches nothing else.
 */
export function outlineBody(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = []
  let n = 0

  /**
   * An `<h1>` inside the body becomes an `<h2>`.
   *
   * The page already has one: the article title. A second `h1` gives the
   * document two top-level headings and no single entry point for a screen
   * reader — and it happens for real, on one of the 52 published articles,
   * where the editor opened the body with a repeat of the headline.
   *
   * The WORDS are untouched; only the level changes, and it changes to the
   * level the editor almost certainly meant — the first section under the
   * title. That also feeds it into the derived contents list below, which a
   * body `h1` would otherwise skip.
   */
  const levelled = html.replace(/<(\/?)h1(\s|>)/gi, '<$1h2$2')

  const out = levelled.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (whole, tag: string, attrs: string, inner: string) => {
      const text = plain(inner)
      // A heading with no text is a spacer, not an outline entry.
      if (!text) return whole
      n += 1
      const existing = /\sid\s*=\s*["']([^"']+)["']/i.exec(attrs)
      const id = existing?.[1] ?? `sec${n}`
      headings.push({ id, text, level: tag.toLowerCase() === 'h3' ? 3 : 2 })
      return existing
        ? `<${tag}${attrs}>${inner}</${tag}>`
        : `<${tag}${attrs} id="${id}">${inner}</${tag}>`
    })
  return { html: out, headings }
}

export { plain as plainText }
