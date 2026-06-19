# AGENTS.md

## Overview
GitHub Pages blog — Vue 3 SPA built with Vite, served from `dist/` on push to `main`.

## Commands
```bash
npm run dev          # dev server at localhost:5173
npm run build        # production build to dist/
npm run preview      # preview production build at localhost:4173
```

## Architecture
- **Entry**: `index.html` → `src/main.js` → `App.vue` + `router/index.js`
- **Routing**: Hash-mode (`createWebHashHistory`) — required for GitHub Pages SPA
- **Posts**: `src/posts/*.md` — YAML frontmatter + markdown body. Draft posts (`draft: true`) auto-filtered at runtime
- **Markdown**: Parsed client-side by `marked` with `highlight.js` and `katex`. Footnotes use `[^label]` syntax handled by a custom preprocessor in `src/utils/posts.js`
- **Themes**: CSS variables in `:root` / `[data-theme="dark"]`. Toggle cycles auto → light → dark. Default is `auto` (follows `prefers-color-scheme`)
- **ToC**: Sticky sidebar on wide screens (≥1100px), inline box on narrow; `IntersectionObserver` highlights the active heading

## Key conventions
- `import.meta.glob('../posts/*.md', { query: '?raw' })` loads markdown at runtime — this is Vite-only, doesn't work in plain Node
- `src/utils/posts.js` is the central module: frontmatter parsing, markdown rendering, footnote processing, and post metadata
- Build output is `dist/` (gitignored); static assets live in `public/` (tracked)
- CI injects `--base "${{ steps.pages.outputs.base_url }}/"` into the build command so asset paths work on GitHub Pages
- `chunkSizeWarningLimit: 1500` in vite.config — `highlight.js` + languages are large

## CI
- Trigger: push to `main` or manual `workflow_dispatch`
- `npm ci` → `npm run build -- --base <base_url>/` → upload `dist/` artifact → deploy to Pages
