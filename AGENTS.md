# AGENTS.md

## 项目

极简静态笔记站，呈现类似 man 手册。保持小而直接，不引入前端框架、组件体系或不必要的功能。

## 文件

- `index.html`：共用 HTML 模板，`{{title}}`、`{{description}}`、`{{name}}`、`{{content}}` 为构建占位符。
- `style.css`：黑白、等宽、单列样式。
- `posts/*.md`：目前仅保留 `greenhand-paper-writing.md`。可选 YAML frontmatter 为 `title`、`description`、`date`、`draft`；旧文章中的其他字段忽略。
- `build.js`：使用 marked、yaml 在 Node.js 中生成 HTML；同时提供简单的本地开发/预览服务。浏览器端无 JavaScript。

## 命令

```sh
npm install
npm run dev      # localhost:5173，每次请求读取源文件，改动后手动刷新
npm run build    # 生成 dist/
npm run preview  # localhost:4173，只预览现有 dist/
```

使用 Node.js 24。没有测试、lint 或类型检查框架；改动后运行构建，并检查索引、文章和移动端布局。

## 约定

- 保留文章内容和 `draft: true` 状态。草稿不出现在构建结果中。
- 输出普通的 `index.html` 和 `<slug>.html`，使用相对链接；不需要 SPA 路由或 base URL 配置。
- Markdown 仅来自仓库维护者，按可信内容渲染，不是面向不可信输入的服务。
- 支持普通 Markdown 和表格；不包含代码配色、数学排版、主题切换、标签页或目录侧栏。
- `dist/`、`node_modules/` 被 gitignore 排除，禁止提交构建产物。
- GitHub Actions 执行 `npm ci` → `npm run build` → 上传并部署 `dist/`。Pages Source 应设置为 GitHub Actions。
