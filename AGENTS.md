# AGENTS.md

## Overview
GitHub Pages user-site blog — Vue 3 SPA built with Vite, deployed via Actions artifact from `dist/`.

## Commands
```bash
npm run dev          # dev server at localhost:5173 (HMR, no base path)
npm run build        # production build to dist/ (default base: /)
npm run preview      # preview production build at localhost:4173
```
No lint, typecheck, or test commands exist. `npm run build && npm run preview` is the local verification flow.

## Architecture
- **Entry**: `index.html` → `src/main.js` → `App.vue` + `router/index.js`
- **Routing**: Hash-mode (`createWebHashHistory`) — required for GitHub Pages SPA. No 404.html needed.
- **Posts**: `src/posts/*.md` — YAML frontmatter + markdown body. Draft posts (`draft: true`) filtered at runtime. Posts are client-rendered via `marked`, not statically generated.
- **Markdown**: Client-side render via `marked` + `marked-highlight` + `highlight.js` + `katex`. Footnotes (`[^label]`) handled by a custom preprocessor in `src/utils/posts.js`.
- **Themes**: CSS variables in `:root` / `[data-theme="dark"]`. Toggle cycles auto → light → dark. Default `auto` follows `prefers-color-scheme`. Persisted in `localStorage`.
- **ToC**: `IntersectionObserver` highlights the active heading. Sticky sidebar on ≥1100px, inline box on narrow screens.

## Key conventions
- `import.meta.glob('../posts/*.md', { query: '?raw', import: 'default' })` in `src/utils/posts.js` loads all markdown at runtime — Vite-only, will not work in plain Node.
- `src/utils/posts.js` is the central module: frontmatter parsing, footnote processing, markdown rendering, ToC extraction, and post metadata.
- `dist/` is gitignored. Deployment happens exclusively through the CI Actions artifact — never commit `dist/`.
- `public/` assets (`favicon.ico`, `.nojekyll`, `cover_imge/`) are copied verbatim to `dist/` on build.
- `chunkSizeWarningLimit: 1500` in `vite.config.js` — `highlight.js` + languages are large (~440KB gzipped main chunk).

## Post frontmatter schema
```yaml
---
title: "Post Title"           # required
description: "Summary"        # optional, shown in card
authors: ["author1"]          # optional, array or string
date: 2026-01-01T12:00:00+08:00  # required, ISO 8601
draft: false                  # false = published, true = hidden
tags: ["tag1", "tag2"]        # optional, array or string
toc: true                     # ignored at runtime (ToC auto-generated from h2-h4)
---
```

## CI deployment
- **Trigger**: push to `main` or manual `workflow_dispatch`
- **Flow**: `npm ci` → `npm run build -- --base "${{ steps.pages.outputs.base_url }}/"` → upload `dist/` artifact → deploy to Pages
- `configure-pages@v6` outputs `base_url` as a **full URL** (e.g., `https://bLueriVerLHR.github.io`). The trailing `/` is appended in the build command, so Vite uses absolute URLs for assets.
- Locally, `npm run build` uses default base `/` (relative-to-root), which also works correctly for the user-site URL.
- `.nojekyll` is in `public/` as a safety net — Actions-based deployment doesn't need it, but it prevents Jekyll interference if Pages ever falls back to branch deployment.

## Debugging blank pages
1. **Open browser DevTools Console** on the deployed site. If you see errors like `Failed to resolve module specifier "vue"` or `Expected a JavaScript module but received text/html`, GitHub Pages is serving the repo's source `index.html` directly instead of the Actions-built artifact. This means the Pages source is set to **"Deploy from a branch"** instead of **"GitHub Actions"**. Fix: go to repo Settings → Pages → Source → select "GitHub Actions".
2. **Verify the CI build succeeded** on GitHub Actions (check the Actions tab). A failed build means no artifact was uploaded, and Pages falls back to serving the branch root.
3. **Ensure `dist/` is not tracked** in git: `git ls-files dist/` must be empty. If `dist/` was accidentally committed, it may confuse Pages source detection.
4. **Asset 404s**: open Network tab, look for failed script/CSS loads. If the base path is wrong, assets will 404 with HTTP 404.
5. **The `crossorigin` attribute** on `<script type="module">` (added by Vite) requires the server to send CORS headers on cross-origin requests. GitHub Pages sends these for same-origin assets. Local `file://` protocol testing will fail due to this.
