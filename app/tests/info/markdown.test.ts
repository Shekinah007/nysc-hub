/**
 * Markdown sanitization tests (SPEC-info-hub.md):
 *   "<script> in body does not survive render" — the security contract.
 */
import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@/lib/markdown'

describe('renderMarkdown sanitization', () => {
  it('renders basic formatting, links, lists, headings', async () => {
    const html = await renderMarkdown('# Title\n\nA **bold** and *italic* line.\n\n- one\n- two\n\n[NYSC](https://www.nysc.gov.ng)')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('<a href="https://www.nysc.gov.ng">NYSC</a>')
  })

  it('strips <script> tags entirely', async () => {
    const html = await renderMarkdown('Hello\n\n<script>alert("xss")</script>\n\nWorld')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert')
    expect(html).toContain('Hello')
    expect(html).toContain('World')
  })

  it('strips event handlers from any element that survives', async () => {
    const html = await renderMarkdown('<img src="x" onerror="alert(1)">')
    expect(html).not.toContain('onerror')
  })

  it('blocks javascript: URLs in links', async () => {
    const html = await renderMarkdown('[click](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
  })

  it('renders GFM tables', async () => {
    const html = await renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })

  it('caches repeat renders of the same body', async () => {
    const first = await renderMarkdown('# Cached\n\nbody')
    const second = await renderMarkdown('# Cached\n\nbody')
    expect(first).toBe(second)
  })
})
