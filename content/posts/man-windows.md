---
title: "man Windows"
description: "Tips, techniques for Windows development."
authors: ["bLueriVerLHR"]
date: 2024-10-06T19:34:23+08:00
draft: false
tags: ["windows", "manuel"]
toc: true
---

## DNS_PROBE_FINISHED_NO_INTERNET

Sometimes, when we suddenly close the connection with hotspot networks, the Windows will encounter this problem.
To solve the problem, follow the following steps:

``` sh
ipconfig /release *
ipconfig /flushdns
ipconfig /renew
netsh winsock reset
netsh int ip reset
```

The above instructions aim to reset Windows network caches totally.

## Set detailed menu as default in Windows 11

To Enable the feature:

``` cmd
reg add HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32 /ve /d "" /f
```

To disable the feature:

``` cmd
reg delete HKCU\SOFTWARE\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2} /f
```
