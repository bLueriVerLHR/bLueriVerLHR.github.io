# 用 Hexo 和 GitHub 创建个人 Blog

`date: 2021-07-30`

---

- 有一个 [GitHub](https://github.com/) 帐号；
- 安装了 [node.js](https://nodejs.org/en/) 、 [npm](https://www.npmjs.com/) ，并了解相关知识；
- 安装了 [git](https://git-scm.com/) 。

说明：

``` sh
# OS:       Arch Linux
# Shell:    fish
# Editor:   vs code

# Some Output will be omitted.
# The operation system does not matter.
# However the following Article is based on Arch Linux.
# Some operation may be different from other os.
```

<!--more-->

---

## 1.1 Hexo 简介

Hexo 是一个简单、快速、强大的基于 Github Pages 的博客发布工具，支持 Markdown 格式，有众多优秀插件和主题。

- Hexo 可以理解为是基于 node.js 制作的一个博客工具，不是我们理解的一个开源的博客系统；
- Hexo 正常来说，不需要部署到我们的服务器上，我们的服务器上保存的，其实是基于在 Hexo 通过 MarkDown 编写的文章，然后 Hexo 帮我们生成静态的 html 页面，然后，将生成的 html 上传到我们的服务器。

简而言之：Hexo 是个静态页面生成、上传的工具。

## 1.2 安装 Hexo

使用如下指令：

``` sh
~> sudo npm install -g hexo
```

## 1.3 初始化

选取一个文件夹，或者创建一个文件夹并打开至当前目录。这里以本人的文件夹为例

``` sh
~> cd Document
~/Document> mkdir myblog
~/document> cd myblog
~/D/myblog> hexo init
```

Hexo 会自动下载文件。目录如下：

``` sh
~/D/myblog> ls -l
total 208
-rw-r--r--   1 blur blur      0 Jul 30 13:26 _config.landscape.yml
-rw-r--r--   1 blur blur   2642 Jul 30 15:50 _config.yml
-rw-r--r--   1 blur blur  48608 Jul 30 15:50 db.json
drwxr-xr-x 275 blur blur  20480 Jul 30 15:34 node_modules
-rw-r--r--   1 blur blur    724 Jul 30 15:34 package.json
-rw-r--r--   1 blur blur 118417 Jul 30 14:15 package-lock.json
drwxr-xr-x  10 blur blur   4096 Jul 30 15:49 public
drwxr-xr-x   2 blur blur   4096 Jul 30 13:26 scaffolds
drwxr-xr-x   3 blur blur   4096 Jul 30 13:26 source
drwxr-xr-x   3 blur blur   4096 Jul 30 15:43 themes
```

blur 是我对 Blue_River 的简写。与 Hexo 的某一个主题无关哦

部分文件夹说明：

|文件/文件夹|说明|
|-|-|
|_config.yml|配置文件，修改博客的基础配置、模板等|
|public     |生成的静态文件，这个目录最终会发布到服务器|
|scaffolds  |一些通用的 markdown 模板|
|source     |编写的 markdown 文件，_drafts 草稿文件，_posts 发布的文章|
|themes     |博客的模板|

Hexo 下载办法使用的是 npm，所以对于速度慢的，可以将 npm 换源到淘宝源如：

``` sh
~/D/myblog> npm config set registry https://registry.npm.taobao.org
```

目前阶段 Hexo 不会使用 cnpm

## 1.4 生成html

``` sh
~/D/myblog> hexo g
~/D/myblog> hexo s
```

上面第一句用于生成页面，第二句用于在本地启动服务预览页面。

生成的内容保存在 public 里，而这些文件是将来提交到 GitHub 上去的。

hexo s 是开启本地预览服务，打开浏览器访问 `http://localhost:4000` 即可看到内容。

很多人会碰到浏览器一直在转圈但是就是加载不出来的问题，一般情况下是因为端占用的缘故。

先搜索占领4000端口的进程

``` sh
~/D/myblog> netstat -anp | grep 4000
```

获取 PID 然后关闭进程。

``` sh
~/D/myblog> kill -9 PID
```

这样之后再一次搜索4000端口上的进程。如果返回 grep 出错，即端口可以使用

第一次初始化的时候，Hexo 已经帮我们写好了一篇名为 Hello World 的文章。

## 1.5 修改主题

可以选择进入 [Hexo官网](https://hexo.io/) 寻找主题，主题都有 `README.md` 可以参考。

下载下来的主题应该保存在 themes 中。

然后修改 `_config.yml` 文件，使用 `ctrl+F` 寻找 `theme`，将 `theme: landscape` 修改为比如：`theme: light`。

再次生成页面的时候，页面主题就会改变。

## 2.1 上传到 GitHub

Github 可以免费搭建个人博客。

Github 有两种形式的 page：

- 个人或组织的 page：只能存在一个，master 分支，地址为 xxx.github.io
- 项目 page：每个项目可以生成一个，gh-pages 分支，地址为 xxx.github.io/projectname

这里笔者采用的是个人版本的 page，即仓库名需要命名为：github用户名.github.io。

生成的网址则为`https://github用户名.github.io`。

## 2.2 配置部署信息

配置 `_config.yml` 中有关 deploy 的部分，使用 `ctrl+F` 寻找 `deploy`。

这里展示的是使用 SSH，使用 SSH 在每次 deploy 的时候不需要输入密码：

``` yml
# Deployment
## Docs: https://hexo.io/docs/one-command-deployment
deploy:
  type: git
  repository: git@github.com:bLueriVerLHR/bLueriVerLHR.github.io.git
  branch: main
```

其中 repository 后边是 SSH，可以在指定的 repository 的下载处（下箭头+ Code）选择使用 SSH 获取 SSH。

这里需要个人提前获取好 SSH

方法：

``` sh
~/D/myblog> cd ~/.ssh
~/D/myblog> ls
```

如果没有后缀为 pub 文件的文件则创建一个 SSH key

``` sh
~/D/myblog> ssh-keygen -t rsa -C "your_email@example.com"
```
  
其中 `your_email@example.com` 是 GitHub 的邮箱。
  
接下来要求命名生成文件，如果为空，会默认生成生成 `id_rsa` 和 `id_rsa.pub` 两个秘钥文件。
  
接下来会要求设置密码，可以不输入，为空就是不需要密码。
  
之后还会有一些输出，看到后基本就是完成了。

接下来在 GitHub 上打开个人设置，选择含有 SSH 的那一个选项，选择 SSH keys 后面的选项后，title 自己命名，下面的内容填写上面操作生成的以 pub 结尾的文件里的内容。

注意，前后不能有空格或回车。
  
如果没有错误显示，则 SSH key 就算设置完成了。

## 2.3 安装 hexo 的 git 插件

直接执行 hexo d 的话一般会报如下错误：

``` sh
ERROR Deployer not found: git
```

原因是还需要安装一个插件：

``` sh
~/D/myblog> npm install hexo-deployer-git --save
```

## 2.4 部署

使用

``` sh
~/D/myblog> hexo d
```

就可以部署。

不过 `hexo d` 会将见到的 md 文件都渲染。如果希望一些md 文件不被渲染，先获取其对于 `_config.yml` 的相对位置，然后在 `_config.yml` 的文件中的 `skip_render` 后面添加内容。比如：

``` yml
skip_render: "public/README.md"
```

## 3.0 常用的 hexo 命令

常见命令

``` sh
hexo new "postName"         # 新建文章
hexo new page "pageName"    # 新建页面
hexo generate               # 生成静态页面至 public 目录
hexo server                 # 开启预览访问端口（默认端口4000，'ctrl + c'关闭server）
hexo deploy                 # 部署到 GitHub
hexo help                   # 查看帮助
hexo version                # 查看 Hexo 的版本
```

缩写：

``` sh
hexo n == hexo new
hexo g == hexo generate
hexo s == hexo server
hexo d == hexo deploy
```

组合命令：

``` sh
hexo s -g # 生成并本地预览
hexo d -g # 生成并上传
```

## 4.1 写博客

执行：

``` sh
~/D/myblog> hexo new 'my-first-blog'
```

生成名为 `my-first-blog.md` 的文件，开头是

``` md
---
title: my-first-blog
date: 2021-07-30 15:52:39
tags: 
---
```

### 4.1.1 自定义生成

相关生成修改应该改变文件夹 `scaffolds` 中对应文件的内容。

完整内容如下：

``` md
---
title: postName
date: 2013-12-02 15:30:16
categories: 默认分类
tags: [tag1,tag2,tag3]
description: 附加一段文章摘要，字数最好在140字以内，会出现在 meta 的 description 里面
---
 
以下是正文
```

默认情况下，生成的博文目录会显示全部的文章内容，如何设置文章摘要的长度呢？

答案是在合适的位置加上 `<!--more-->` 即可，例如：

``` md
# 前言
 
使用 github pages 服务搭建博客的好处有：
 
1. 全是静态文件，访问速度快；
2. 免费方便，不用花一分钱就可以搭建一个自由的个人博客，不需要服务器不需要后台；
3. 可以随意绑定自己的域名，不仔细看的话根本看不出来你的网站是基于github的；
 
<!--more-->
 
4. 数据绝对安全，基于 github 的版本管理，想恢复到哪个历史版本都行；
5. 博客内容可以轻松打包、转移、发布到其它平台；
6. 等等；
```

### 4.1.2 new与new page

那么hexo new page 'postName'命令和hexo new 'postName'有什么区别呢？

``` sh
~/D/myblog> hexo new page "my-second-blog"
```

生成页面，但是不会生成在博文目录中。

## 4.2 插件

评论等其他内容添加需要使用插件自己设置。评论插件需要对特定主题，使用特定设定。
