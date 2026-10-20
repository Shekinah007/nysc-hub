/**
 * Sanitized markdown rendering (SPEC-info-hub.md).
 *
 * Pipeline: remark-parse → remark-gfm → remark-rehype → rehype-sanitize →
 * rehype-stringify. The sanitize step is the security boundary: it keeps
 * basic formatting, links, lists, and headings, and strips scripts, event
 * handlers (`onerror` etc.), `javascript:` URLs, and raw HTML that
 * introduces them. Rendered output is safe to inject with dangerouslySetInnerHTML.
 *
 * The pipeline is memoized per body string: article bodies are stable, and
 * rendering the same body repeatedly (list pages render excerpts, article
 * pages render the full body) should not re-parse.
 */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify)

const renderCache = new Map<string, string>()
const CACHE_LIMIT = 64

/**
 * Render markdown to sanitized HTML. Output never contains scripts or
 * event handlers — enforced by rehype-sanitize, verified by tests.
 */
export async function renderMarkdown(body: string): Promise<string> {
  const cached = renderCache.get(body)
  if (cached !== undefined) return cached

  const file = await processor.process(body)
  const html = String(file)

  if (renderCache.size >= CACHE_LIMIT) {
    // Evict the oldest entry rather than growing unboundedly.
    const firstKey = renderCache.keys().next().value
    if (firstKey !== undefined) renderCache.delete(firstKey)
  }
  renderCache.set(body, html)
  return html
}
