---
title: "man Windows"
description: "Tips, techniques for Windows development."
authors: ["bLueriVerLHR"]
date: 2024-10-06T19:34:23+08:00
draft: false
tags: ["windows", "manuel"]
toc: true
---

## DNS PROBE FINISHED NO INTERNET

Sometimes, when we suddenly close the connection with hotspot networks, the Windows will encounter this problem.
To solve the problem, follow the following steps:

``` sh
ipconfig /release
ipconfig /all
ipconfig /flushdns
ipconfig /renew
netsh winsock reset catalog
netsh int ip reset
```

The above instructions aim to reset Windows network caches totally.