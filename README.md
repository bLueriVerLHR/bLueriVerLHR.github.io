# bLueriVer

纯静态站点：Markdown + TeX + 代码 → HTML，全部在构建期跑完，产物里没有一行 JavaScript。

## 本地查看

```sh
npm install
npm run dev      # http://localhost:5173，每次刷新都重新生成，草稿也会显示
```

## 发布

```sh
npm run build    # 只输出 dist/，草稿不参与
npm run check    # tsc 类型检查
```

`dist/` 是纯静态文件，随便什么静态服务器都能托管。

## 文件

| 文件 | 职责 |
| --- | --- |
| `build.tsx` | 站点生成器：读 `posts/`、跑 Markdown、渲染页面、起 dev 服务器 |
| `code-dialects.ts` | 代码方言映射表：语法不认识的标识符（如 CUDA 的 `__device__`）在这里登记语义 |
| `style.css` | 全部样式 |
| `tsconfig.json` | 类型检查配置（`tsx` 只删类型，检查靠 `npm run check`） |

## 写作约定

- front matter：`title`、`authors`、`date`、`tags`、`section`、`draft`。`draft: true` 的文章只在 dev 下出现，标题前会带一个 `!`。
- 数学：行内 `\( ... \)`，独立成行 `\[ ... \]`。构建时由 Temml 转成 MathML。
- 公式编号：`\[ ... \]` 里写 `\label{eq:name}` 就自动编号（相当于 LaTeX 的 `equation` 环境；不写 `\label` 就不编号），正文用 `\(\ref{eq:name}\)` 打印 `1`、`\(\eqref{eq:name}\)` 打印 `(1)`，两者都是指向公式的链接。编号按文章各自从 1 开始。不要手写 `\tag`：编号由 `\label` 统一管理，写了会得到一条 warning 且该式不编号。
- 代码：围栏标语言，例如 ```` ```cpp ````；行号由 CSS 计数器生成，正文里不用写任何标记。
- 新增 C++ 方言（HIP、SYCL…）：在 `code-dialects.ts` 的 `cppDialects` 里加一个条目，再在 `codeTargets` 里指过去。
