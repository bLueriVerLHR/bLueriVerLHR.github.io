# bLueriVer

一个 HTML 模板、一份 CSS、一篇 Markdown。构建后是普通静态网页，没有前端框架，也不需要浏览器运行 JavaScript。

```text
index.html   页面模板
style.css    man 手册式排版
posts/*.md   文章（目前只保留 greenhand-paper-writing.md）
build.js     Markdown → HTML
```

## 本地查看

需要 Node.js 24。

```sh
npm install
npm run dev
```

打开 <http://localhost:5173>。修改模板、样式或文章后，刷新页面即可；没有热更新。

## 写文章

在 `posts/` 新建 Markdown 文件，文件名就是页面名，例如 `hello.md` 会生成 `hello.html`。

```markdown
---
title: 一篇笔记
description: 一句话介绍，可省略。
date: 2026-01-01
draft: false
---

## 一个章节

直接写 Markdown。
```

只有 `title`、`description`、`date`、`draft` 会用到；都可省略。`draft: true` 不会发布。支持普通 Markdown 和表格，不做代码高亮、脚注扩展或数学公式渲染。

## 发布

```sh
npm run build
npm run preview
```

构建结果在 `dist/`，预览地址为 <http://localhost:4173>。链接使用相对路径，可以放在域名根目录或子目录。推送到 `main` 后，GitHub Actions 自动构建并部署；仓库 Settings → Pages → Source 需选 **GitHub Actions**。不要提交 `dist/`。
