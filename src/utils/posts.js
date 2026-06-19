import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import katex from 'katex'

marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  }
}))

function parseFootnotes(md) {
  const footnoteDefs = {}
  const fnRegex = /^\[\^([^\]]+)\]:\s*(.+)$/gm
  let m
  while ((m = fnRegex.exec(md)) !== null) {
    footnoteDefs[m[1]] = m[2]
  }
  let body = md.replace(/^\[\^[^\]]+\]:\s*.+$/gm, '')
  body = body.replace(/\n{3,}/g, '\n\n')
  body = body.replace(/\[\^([^\]]+)\](?!:)/g, (_, id) => {
    if (footnoteDefs[id]) {
      return `<sup id="fnref-${id}"><a href="#fn-${id}" class="footnote-ref">[${id}]</a></sup>`
    }
    return `[^${id}]`
  })
  if (Object.keys(footnoteDefs).length > 0) {
    body += '\n\n<div class="footnotes">\n<hr>\n<ol>\n'
    for (const [id, def] of Object.entries(footnoteDefs)) {
      body += `<li id="fn-${id}"><p>${def} <a href="#fnref-${id}" class="footnote-backref">↩</a></p></li>\n`
    }
    body += '</ol>\n</div>\n'
  }
  return body
}

function renderKatex(html) {
  return html.replace(/\$\$(.+?)\$\$/gs, (_, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }) }
    catch { return `<code>${tex}</code>` }
  }).replace(/\$(.+?)\$/g, (_, tex) => {
    try { return katex.renderToString(tex.trim(), { throwOnError: false }) }
    catch { return `<code>${tex}</code>` }
  })
}

export function parseFrontmatter(raw) {
  raw = raw.replace(/\r\n/g, '\n')
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: '' }
  const [, front, body] = match
  const meta = {}
  front.split('\n').forEach(line => {
    const m = line.match(/^(\w[\w-]*):\s*(.*)/)
    if (m) {
      const key = m[1]
      let val = m[2].trim()
      if ((val.startsWith('[') && val.endsWith(']')) ||
          (val.startsWith('"[') && val.endsWith(']"'))) {
        val = val.replace(/^"\[/, '[').replace(/\]"$/, ']')
        try {
          const arr = JSON.parse(val)
          val = Array.isArray(arr) ? arr : [val]
        } catch {
          val = val.replace(/^\[|\]$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, ''))
        }
      }
      if (val === 'true') val = true
      else if (val === 'false') val = false
      meta[key] = val
    }
  })
  return { meta, body }
}

export function renderMarkdown(body) {
  body = parseFootnotes(body)
  let html = marked.parse(body)
  html = renderKatex(html)
  html = html.replace(/(<table[\s\S]*?<\/table>)/g, '<div class="table-wrapper">$1</div>')
  return html
}

export function extractToc(html) {
  const headings = []
  const regex = /<h([2-4])\s+id="([^"]*)"[^>]*>([^<]*)<\/h[2-4]>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    headings.push({ level: parseInt(match[1]), id: match[2], text: match[3] })
  }
  return headings
}

const postFiles = import.meta.glob('../posts/*.md', { query: '?raw', import: 'default' })

let _posts = null

export async function loadPosts() {
  if (_posts) return _posts
  const all = []
  for (const [path, loader] of Object.entries(postFiles)) {
    const raw = await loader()
    const { meta, body } = parseFrontmatter(raw)
    const slug = path.split('/').pop().replace(/\.md$/, '')
    const html = renderMarkdown(body)
    all.push({ ...meta, slug, html, raw_body: body })
  }
  _posts = all
    .filter(p => !p.draft)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  return _posts
}

export async function loadPost(slug) {
  const posts = await loadPosts()
  return posts.find(p => p.slug === slug) || null
}

export async function loadTags() {
  const posts = await loadPosts()
  const tagMap = {}
  posts.forEach(p => {
    const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : [])
    tags.forEach(t => {
      t = t.trim()
      if (!t) return
      if (!tagMap[t]) tagMap[t] = []
      tagMap[t].push(p)
    })
  })
  return tagMap
}
