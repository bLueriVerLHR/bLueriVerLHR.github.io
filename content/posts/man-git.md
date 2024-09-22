---
title: "man Git"
description: "Tips, techniques for Git."
authors: ["bLueriVerLHR"]
date: 2024-09-22T13:11:48+08:00
draft: false
tags: ["git", "manuel"]
toc: true
---

## clear local cache

Sometimes we need to clear local cache to activate `.gitignore` or `.gitmodules` rules.

``` bash
git rm -r --cached .
```