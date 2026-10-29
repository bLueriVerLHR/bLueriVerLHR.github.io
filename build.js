import { readFile, readdir, mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { Marked } from 'marked'
import { parse } from 'yaml'

const root = fileURLToPath(new URL('.', import.meta.url))
const output = join(root, 'dist')
const markdown = new Marked()

// replace special characters
const escape = value => String(value ?? '').replace(
  /[&<>"']/g,
  char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char])

async function pages() {
  const template = await readFile(join(root, 'index.html'), 'utf8')
  const posts = []

  const render = data => template.replace(
    /\{\{(title|section|name|content)\}\}/g,
    (_, key) => key === 'content' ? data.content : escape(data[key])
  )

  for (const file of (await readdir(join(root, 'posts'))).filter(file => file.endsWith('.md'))) {
    const raw = (await readFile(join(root, 'posts', file), 'utf8'))
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')

    const front = raw.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)
    const meta = front ? parse(front[1]) ?? {} : {}
    if (meta.draft === true)
      continue
    
    const slug = file.slice(0, -3)
    if (slug === 'index')
      throw new Error('posts/index.md conflicts with index.html.')
    
    posts.push({
      slug,
      title: meta.title ?? slug,
      section: meta.section ?? 7,
      authors: Array.isArray(meta.authors)
        ? meta.authors.join(', ')
        : meta.authors ?? '',
      date: String(meta.date ?? ''),
      body: front ? raw.slice(front[0].length) : raw
    })
  }
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))

  const date = post => post.date
    ? `<time datetime="${escape(post.date)}">${escape(post.date.slice(0, 10))}</time>` : ''

  const files = new Map([
    ['style.css', await readFile(join(root, 'style.css'), 'utf8')],
    ['.nojekyll', '']
  ])

  files.set('index.html', render({
    title: 'Index',
    name: 'bLueriVerLHR',
    section: 7,
    content: 
` <h1>TABLE OF CONTENTS</h1>
  <ul class="post-list">
  ${posts.map(post => 
`   <li>
      <a href="./${encodeURIComponent(post.slug)}.html">${escape(post.title)}</a>
      ${post.date ? `<span class="meta">${date(post)}</span>` : ''}
    </li>`
  ).join('\n')}
  </ul>`
  }))

  for (const post of posts) {
    const html = markdown.parse(post.body).replace(/<table>[\s\S]*?<\/table>/g,
      table => `<div class="table-wrapper">${table}</div>`)

    files.set(`${post.slug}.html`, render({
      ...post,
      name: post.slug.toUpperCase(),
      content:
` <article>
  <h1>${escape(post.title)}</h1>
  ${post.authors ? `<p class="intro meta">Authors: ${post.authors}</p>` : ''}
  ${post.date ? `<p class="intro meta">${date(post)}</p>` : ''}
  <div class="manual-body">${html}</div>
  </article>`
    }))
  }

  return files
}

const mode = process.argv[2] ?? 'build'

if (mode === 'build') {
  const files = await pages()
  await rm(output, { recursive: true, force: true })
  await mkdir(output, { recursive: true })
  
  for (const [name, content] of files)
    await writeFile(join(output, name), content)
  
  console.log(`Built ${files.size - 3} article(s) → dist/`)
} else if (mode === 'dev' || mode === 'preview') {
  if (mode === 'preview')
    await readdir(output) // Preview requires a completed build.

  const port = mode === 'dev' ? 5173 : 4173

  createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
      const name = pathname === '/' ? 'index.html' : pathname.slice(1)
      if (!name || /[/\\:]/.test(name) || name === '.' || name === '..') {
        res.writeHead(404).end('Not found')
        return
      }
      const content = mode === 'dev' ? (await pages()).get(name) : await readFile(join(output, name))
      if (content === undefined) {
        res.writeHead(404).end('Not found')
        return
      }
      res.writeHead(200, {
        'Content-Type': name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8'
      })
      res.end(content)
    } catch (error) {
      const status = error.code === 'ENOENT' ? 404 : error instanceof URIError ? 400 : 500
      if (status === 500) console.error(error)
      res.writeHead(status, {
        'Content-Type': 'text/plain; charset=utf-8'
      }).end(status === 500 ? 'Build failed; check the terminal.' : 'Not found')
    }
  }).listen(port, '127.0.0.1', () => console.log(`Server address: http://localhost:${port}`))
} else {
  throw new Error(`Unknown command: ${mode}`)
}
