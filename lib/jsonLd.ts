/**
 * Serialise structured data for a `<script type="application/ld+json">`.
 * JSON.stringify leaves `<` as is, so a string holding `</script>` (a news
 * title, an article body) would close the tag early and run what follows as
 * HTML. `<` is the same character to a JSON parser.
 */
export const serializeLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')
