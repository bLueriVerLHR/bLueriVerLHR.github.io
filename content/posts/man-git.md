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

## clone with submodules

Use `--recurse-submodules` to clone submodules and `-j4` to clone then while cloning the main repo.

``` bash
git clone --recurse-submodules -j4 git@github.com:<repo-name>.git
```