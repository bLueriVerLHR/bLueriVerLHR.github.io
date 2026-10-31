// Site generator: Markdown + TeX + code -> static HTML.
// Everything runs at build time; the output ships no JavaScript at all.
import { readFile, readdir, mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer, type ServerResponse } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Marked } from 'marked'
import type { Token, Tokens } from 'marked'
import { Fragment, type ComponentChildren } from 'preact'
import { renderToString } from 'preact-render-to-string'
import { createHighlighter, type ThemeRegistration } from 'shiki'
import temml from 'temml'
import { parse as parseYaml } from 'yaml'

import { codeTargets, createDialectTransformer, cppDialects } from './code-dialects.ts'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const outputDirectory = join(projectRoot, 'dist')

/** Front matter fields we understand; anything else is ignored. */
type FrontMatter = {
  title?: string
  section?: number
  authors?: string | string[]
  tags?: unknown
  date?: string | Date
  draft?: boolean
}

/** A post in the shape the components consume. */
type Post = {
  slug: string
  title: string
  manualSection: number
  authorLine: string
  tagList: string[]
  publishedOn: string
  isDraft: boolean
  markdown: string
}

// -- 1. Math: TeX -> MathML ------------------------------------------------
// The output keeps a TeX annotation, which helps both copy-paste and screen readers.
let currentArticle = ''

// -- 1a. Numbered equations ------------------------------------------------
// A display block carrying `\label{eq:name}` takes the next number, and
// `\eqref{eq:name}` prints that number as a link. Temml already emits the anchor
// id and an empty `<a>`; its own bundle fills that text with a browser script, so
// we do the same job at build time and keep the output JavaScript-free.

/** Characters Temml drops when it turns a label into an anchor id (`eq:a-b` -> `eqa-b`). */
const invalidIdCharacters = /[^A-Za-z0-9_-]/g

type EquationNumbers = {
  /** Label as written by the author -> number, e.g. `eq:softmax` -> 1. */
  byLabel: Map<string, number>
  /** Anchor id Temml generates -> number, e.g. `eqsoftmax` -> 1. */
  byAnchor: Map<string, number>
}

const emptyEquationNumbers = (): EquationNumbers => ({ byLabel: new Map(), byAnchor: new Map() })

let currentEquations: EquationNumbers = emptyEquationNumbers()

const labelOfEquation = (tex: string): string | undefined => {
  const label = /\\label\{([^{}]+)\}/.exec(tex)?.[1]?.trim()
  return label === undefined || label === '' ? undefined : label
}

/** First pass: number the labelled display blocks of one article in source order. */
const collectEquationNumbers = (source: string): EquationNumbers => {
  const numbers = emptyEquationNumbers()

  for (const block of source.matchAll(/^ {0,3}\\\[([\s\S]+?)\\\]/gm)) {
    const tex = block[1] ?? ''
    const label = labelOfEquation(tex)
    if (label === undefined) continue

    if (/\\tag\{/.test(tex)) {
      console.warn(`${currentArticle}: "${label}" comes with a \\tag; drop it so the label can number the equation`)
      continue
    }
    if (numbers.byLabel.has(label)) {
      console.warn(`${currentArticle}: duplicate equation label "${label}"`)
      continue
    }

    const number = numbers.byLabel.size + 1
    numbers.byLabel.set(label, number)
    numbers.byAnchor.set(label.replace(invalidIdCharacters, ''), number)
  }

  return numbers
}

/** Third pass: fill the empty `<a>` Temml leaves behind for `\ref` and `\eqref`. */
const fillEquationReferences = (html: string): string => {
  if (!html.includes('tml-ref')) return html

  return html.replace(
    /<a href=['"]#([^'"]*)['"] class="tml-ref( tml-eqref)?"><\/a>/g,
    (reference: string, anchor: string, isEquationRef: string | undefined) => {
      const number = currentEquations.byAnchor.get(anchor)
      let text = '(??)'
      if (number === undefined) {
        console.warn(`${currentArticle}: unknown equation reference "#${anchor}"`)
      } else {
        text = isEquationRef === undefined ? String(number) : `(${number})`
      }
      return reference.replace('></a>', `><math><mtext>${text}</mtext></math></a>`)
    }
  )
}

const renderMath = (tex: string, displayMode: boolean): string => {
  const source = tex.trim()
  try {
    const rendered = temml.renderToString(source, { displayMode, annotate: true })
    return fillEquationReferences(rendered)
  } catch (error) {
    console.warn(`${currentArticle}: ${(error as Error).message}`)
    return renderToString(<code>{source}</code>) // fall back to the raw TeX as inline code
  }
}

/**
 * Second pass: display math with its number set in the right margin. Temml's own
 * `\tag` centres the number inside a half-width cell, so numbers of different
 * widths never line up; setting the number in HTML keeps them in one column.
 */
const renderDisplayMath = (tex: string): string => {
  const label = labelOfEquation(tex)
  const number = label === undefined ? undefined : currentEquations.byLabel.get(label)
  const body = renderMath(tex.replace(/\\label\{[^{}]+\}/g, ''), true)

  if (label === undefined || number === undefined) return `<div class="math-block">${body}</div>\n`

  const anchor = label.replace(invalidIdCharacters, '')
  return (
    `<div class="math-block numbered" id="${anchor}">${body}` +
    `<span class="equation-number"><a href="#${anchor}">(${number})</a></span></div>\n`
  )
}

// -- 2. Manual sections ----------------------------------------------------
// Meaning of each number in the `NAME(7)` header, taken from `man 7 man-pages`
// (a copy lives in static/manpage.txt).
const manualSectionNames: Record<number, string> = {
  1: 'Executable programs or shell commands',
  2: 'System calls',
  3: 'Library calls',
  4: 'Special files',
  5: 'File formats and conventions',
  6: 'Games',
  7: 'Miscellaneous',
  8: 'System administration commands',
  9: 'Kernel routines'
}

/** Human readable expansion of a section number, used as the header's tooltip. */
const describeSection = (section: number): string =>
  manualSectionNames[section] ? `Section ${section}: ${manualSectionNames[section]}` : `Section ${section}`

// -- 3. Code: Shiki with a language-server flavoured palette ----------------
// Colour only where it carries meaning; bold = keyword, italic = comment or
// parameter, underline = preprocessor directive.
const codePalette = {
  keyword: '#111111',
  builtin: '#1d6b6b',
  function: '#365b96',
  string: '#3d6b2f',
  constant: '#8a5a1e',
  comment: '#7d7d7d',
  operator: '#666666'
}

const manPageTheme: ThemeRegistration = {
  name: 'man-page',
  type: 'light',
  colors: { 'editor.background': '#ffffff', 'editor.foreground': '#222222' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: codePalette.comment, fontStyle: 'italic' } },
    { scope: ['variable.parameter'], settings: { fontStyle: 'italic' } },
    { scope: ['keyword', 'storage'], settings: { foreground: codePalette.keyword, fontStyle: 'bold' } },
    { scope: ['keyword.operator.word.mnemonic'], settings: { foreground: codePalette.keyword, fontStyle: 'bold' } },
    { scope: ['keyword.control.directive'], settings: { foreground: codePalette.constant, fontStyle: 'underline' } },
    { scope: ['meta.preprocessor', 'entity.name.function.preprocessor'], settings: { foreground: codePalette.constant } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: codePalette.function } },
    { scope: ['entity.name.type', 'support.type', 'support.class', 'storage.type.built-in', 'storage.type.primitive', 'storage.modifier.pointer'], settings: { foreground: codePalette.builtin, fontStyle: '' } },
    { scope: ['string', 'punctuation.definition.string'], settings: { foreground: codePalette.string } },
    { scope: ['constant.numeric', 'constant.character', 'constant.language', 'keyword.other.unit'], settings: { foreground: codePalette.constant, fontStyle: '' } },
    { scope: ['keyword.operator'], settings: { foreground: codePalette.operator, fontStyle: '' } }
  ]
}

/** Shiki's font-style bitmask; it matches the FontStyle enum that shiki does not re-export. */
const fontStyle = { none: 0, italic: 1, bold: 2, underline: 4 } as const

/** Dialect words borrow colours from the palette instead of defining their own. */
const dialectStyles = {
  keyword: { color: codePalette.keyword, fontStyle: fontStyle.bold },
  function: { color: codePalette.function, fontStyle: fontStyle.none },
  variable: { color: codePalette.builtin, fontStyle: fontStyle.none }
}

const loadedLanguages = ['python', 'cpp', 'c', 'asm', 'bash', 'json', 'yaml', 'markdown', 'text']
const plainLanguages = new Set(['text', 'plaintext', 'txt'])

const highlighter = await createHighlighter({ themes: [manPageTheme], langs: loadedLanguages })
const dialectTransformers = {
  cuda: createDialectTransformer('cuda', dialectStyles)
} satisfies Record<keyof typeof cppDialects, ReturnType<typeof createDialectTransformer>>
const reportedLanguages = new Set<string>()

const highlightCode = (source: string, fenceLanguage?: string): string => {
  const requested = fenceLanguage ?? 'text'
  const target = codeTargets[requested] ?? { language: requested }
  let language = target.language

  if (!plainLanguages.has(language) && !highlighter.getLoadedLanguages().includes(language)) {
    if (!reportedLanguages.has(requested)) {
      console.warn(`${currentArticle}: unknown language "${requested}", rendered as plain text`)
      reportedLanguages.add(requested)
    }
    language = 'text'
  }

  return highlighter.codeToHtml(source, {
    lang: language,
    theme: manPageTheme,
    transformers: target.dialect ? [dialectTransformers[target.dialect]] : []
  })
}

// -- 4. Markdown: wire \(...\), \[...\] and fenced code into Marked ---------
/** Marked's custom tokens are ours alone, so give them a concrete shape. */
type MathToken = Tokens.Generic & { text: string }

const wrapTablesForScrolling = (html: string): string =>
  html.replace(/<table>[\s\S]*?<\/table>/g, table => `<div class="table-wrapper">${table}</div>`)

const markdown = new Marked({
  async: true,
  renderer: {
    code: ({ text, lang }: Tokens.Code) => highlightCode(text, lang)
  },
  extensions: [
    {
      name: 'mathBlock',
      level: 'block',
      tokenizer(source: string): MathToken | undefined {
        const match = /^ {0,3}\\\[([\s\S]+?)\\\]/.exec(source)
        return match ? { type: 'mathBlock', raw: match[0], text: match[1] ?? '' } : undefined
      },
      renderer: (token: Token): string =>
        renderDisplayMath((token as MathToken).text)
    },
    {
      name: 'mathInline',
      level: 'inline',
      start: (source: string) => source.indexOf('\\(') < 0 ? undefined : source.indexOf('\\('),
      tokenizer(source: string): MathToken | undefined {
        const match = /^\\\(([\s\S]+?)\\\)/.exec(source)
        return match ? { type: 'mathInline', raw: match[0], text: match[1] ?? '' } : undefined
      },
      renderer: (token: Token): string => renderMath((token as MathToken).text, false)
    }
  ]
})

const renderMarkdown = async (source: string): Promise<string> =>
  wrapTablesForScrolling(await markdown.parse(source))

// -- 5. Pages: one document shell plus two content components --------------
type DocumentProps = {
  pageTitle: string
  /** The NAME in the `NAME(7)` header. */
  manualName: string
  manualSection: number
  children: ComponentChildren
}

const Document = ({ pageTitle, manualName, manualSection, children }: DocumentProps) => (
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{`${pageTitle} — bLueriVer`}</title>
      <link rel="icon" href="data:," />
      <link rel="stylesheet" href="./style.css" />
      <link href="https://cn-font.claude-code-best.win/packages/maple-mono-cn/dist/MapleMono-CN-Regular/result.css" rel="stylesheet" />
    </head>
    <body>
      <header class="manual-header">
        <a href="./index.html" title={describeSection(manualSection)}>{`${manualName}(${manualSection})`}</a>
        <span>Personal Notes</span>
        <span aria-hidden="true" title={describeSection(manualSection)}>{`${manualName}(${manualSection})`}</span>
      </header>
      <main id="main">{children}</main>
      <footer>
        <a href="./index.html">index</a>
        <a href="https://github.com/bLueriVerLHR">GitHub</a>
      </footer>
    </body>
  </html>
)

/** A doctype cannot be expressed in JSX, so it stays a string and Preact does the rest. */
const renderPage = (props: DocumentProps): string =>
  '<!doctype html>\n' + renderToString(<Document {...props} />)

/** Drafts are marked with a leading exclamation mark; only visible under `dev`. */
const displayTitle = (post: Post): string => post.isDraft ? `!${post.title}` : post.title

const DateStamp = ({ value }: { value: string }) => (
  <time datetime={value}>{value.slice(0, 10)}</time>
)

const PostIndex = ({ posts }: { posts: Post[] }) => (
  <>
    <h1>TABLE OF CONTENTS</h1>
    <dl class="post-list">
      {posts.map(post => (
        <Fragment key={post.slug}>
          <dt><a href={`./${encodeURIComponent(post.slug)}.html`}>{displayTitle(post)}</a></dt>
          <dd>
            {(post.publishedOn || post.tagList.length > 0) && (
              <p class="meta">
                {post.publishedOn && <DateStamp value={post.publishedOn} />}
                {post.tagList.map(tag => <span class="tag">{`#${tag}`}</span>)}
              </p>
            )}
          </dd>
        </Fragment>
      ))}
    </dl>
  </>
)

const Article = ({ post, articleHtml }: { post: Post; articleHtml: string }) => (
  <article>
    <h1>{displayTitle(post)}</h1>
    {post.authorLine && <p class="intro meta">{`Authors: ${post.authorLine}`}</p>}
    {post.publishedOn && <p class="intro meta"><DateStamp value={post.publishedOn} /></p>}
    <div class="manual-body" dangerouslySetInnerHTML={{ __html: articleHtml }} />
  </article>
)

// -- 6. Data: read posts/, split front matter from body --------------------
const readPosts = async ({ includeDrafts }: { includeDrafts: boolean }): Promise<Post[]> => {
  const files = (await readdir(join(projectRoot, 'posts'))).filter(file => file.endsWith('.md'))
  const posts: Post[] = []

  for (const file of files) {
    const raw = (await readFile(join(projectRoot, 'posts', file), 'utf8'))
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')

    const frontMatter = raw.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)
    const meta = (frontMatter ? parseYaml(frontMatter[1] ?? '') ?? {} : {}) as FrontMatter
    const isDraft = meta.draft === true
    if (isDraft && !includeDrafts)
      continue

    const slug = file.slice(0, -3)
    if (slug === 'index')
      throw new Error('posts/index.md conflicts with index.html.')

    posts.push({
      slug,
      title: meta.title ?? slug,
      manualSection: meta.section ?? 7,
      authorLine: Array.isArray(meta.authors) ? meta.authors.join(', ') : meta.authors ?? '',
      tagList: Array.isArray(meta.tags) ? meta.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      publishedOn: String(meta.date ?? ''),
      isDraft,
      markdown: frontMatter ? raw.slice(frontMatter[0].length) : raw
    })
  }

  return posts.sort((a, b) =>
    b.publishedOn.localeCompare(a.publishedOn) || a.slug.localeCompare(b.slug))
}

// -- 7. Render the whole site: file name -> contents ----------------------
const renderSite = async ({ includeDrafts }: { includeDrafts: boolean }): Promise<Map<string, string>> => {
  const posts = await readPosts({ includeDrafts })
  const site = new Map<string, string>([
    ['style.css', await readFile(join(projectRoot, 'style.css'), 'utf8')],
    ['.nojekyll', '']
  ])

  site.set('index.html', renderPage({
    pageTitle: 'Index',
    manualName: 'bLueriVerLHR',
    manualSection: 7,
    children: <PostIndex posts={posts} />
  }))

  for (const post of posts) {
    currentArticle = post.slug
    currentEquations = collectEquationNumbers(post.markdown)
    site.set(`${post.slug}.html`, renderPage({
      pageTitle: displayTitle(post),
      manualName: post.slug.toUpperCase(),
      manualSection: post.manualSection,
      children: <Article post={post} articleHtml={await renderMarkdown(post.markdown)} />
    }))
  }

  return site
}

// -- 8. Command line: build (publish) and dev (render per request) ---------
const contentTypeByExtension: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
}

const reply = (response: ServerResponse, status: number, body = 'Not found') =>
  void response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }).end(body)

/** Dev server: re-render on every request, so refreshing the page picks up edits without a watcher. */
const serve = (port: number) => {
  createServer(async (request, response) => {
    try {
      const { pathname } = new URL(request.url ?? '/', 'http://localhost')
      const name = decodeURIComponent(pathname === '/' ? 'index.html' : pathname.slice(1))

      if (/[/\\]|^\.\.?$/.test(name))
        return reply(response, 404)

      const body = (await renderSite({ includeDrafts: true })).get(name)
      if (body === undefined)
        return reply(response, 404)

      response.writeHead(200, {
        'Content-Type': contentTypeByExtension[extname(name)] ?? 'application/octet-stream'
      })
      response.end(body)
    } catch (error) {
      const status = error instanceof URIError ? 400 : 500
      if (status === 500)
        console.error(error)
      reply(response, status, status === 500 ? 'Build failed; check the terminal.' : 'Not found')
    }
  }).listen(port, '127.0.0.1', () => console.log(`Server address: http://localhost:${port}`))
}

const command = process.argv[2] ?? 'build'

if (command === 'build') {
  const site = await renderSite({ includeDrafts: false })
  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })
  for (const [name, body] of site)
    await writeFile(join(outputDirectory, name), body)
  console.log(`Built ${site.size - 3} article(s) -> dist/`)
} else if (command === 'dev') {
  serve(5173)
} else {
  throw new Error(`Unknown command: ${command}`)
}
