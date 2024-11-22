---
title: "Malloc"
description: "About malloc."
authors: ["bLueriVerLHR"]
date: 2024-11-05T13:35:30+08:00
draft: true
tags: ["malloc", "operating system", "memory management"]
toc: true
---

## malloc implementations

There are some malloc implementations used in real environment, such as `ptmalloc`, `tcmalloc`, `jemalloc` and `mimalloc`.

## ptmalloc

<!--
from <https://www.gnu.org/software/libc/manual/html_node/The-GNU-Allocator.html>

The malloc implementation in the GNU C Library is derived from ptmalloc (pthreads malloc), which in turn is derived from dlmalloc (Doug Lea malloc). This malloc may allocate memory in two different ways depending on their size and certain parameters that may be controlled by users. The most common way is to allocate portions of memory (called chunks) from a large contiguous area of memory and manage these areas to optimize their use and reduce wastage in the form of unusable chunks. Traditionally the system heap was set up to be the one large memory area but the GNU C Library malloc implementation maintains multiple such areas to optimize their use in multi-threaded applications. Each such area is internally referred to as an arena.

As opposed to other versions, the malloc in the GNU C Library does not round up chunk sizes to powers of two, neither for large nor for small sizes. Neighboring chunks can be coalesced on a free no matter what their size is. This makes the implementation suitable for all kinds of allocation patterns without generally incurring high memory waste through fragmentation. The presence of multiple arenas allows multiple threads to allocate memory simultaneously in separate arenas, thus improving performance.

The other way of memory allocation is for very large blocks, i.e. much larger than a page. These requests are allocated with mmap (anonymous or via /dev/zero; see [Memory-mapped I/O](https://www.gnu.org/software/libc/manual/html_node/Memory_002dmapped-I_002fO.html)). This has the great advantage that these chunks are returned to the system immediately when they are freed. Therefore, it cannot happen that a large chunk becomes “locked” in between smaller ones and even after calling free wastes memory. The size threshold for mmap to be used is dynamic and gets adjusted according to allocation patterns of the program. mallopt can be used to statically adjust the threshold using M_MMAP_THRESHOLD and the use of mmap can be disabled completely with M_MMAP_MAX; see [Malloc Tunable Parameters](https://www.gnu.org/software/libc/manual/html_node/Malloc-Tunable-Parameters.html).

A more detailed technical description of the GNU Allocator is maintained in the GNU C Library wiki. See <https://sourceware.org/glibc/wiki/MallocInternals>.
-->

The `ptmalloc`, a.k.a `pthreads malloc`, is derived from `dlmalloc`, which is a.k.a `Doug Lea malloc`.
Meanwhile, it is the allocator used by GNU C Library.

According to the allocated size and certain parameters, the `ptmalloc` will use two different methods of memory allocation.
One of the method, which is most commonly used, is to allocate portions of memory (called **chunks**) from a large contiguous area of memory.
The allocated memory areas will be managed to optimize their utilization and reduce wastage in the form of unusable chunks.
The system heap was set up to be the one large memory area, but the `ptmalloc` maintains multiple such areas to optimize their utilization in multi-threaded applications.
Each such area is internally referred to as an **arena**.

Different from other implementations, `ptmalloc` does not round up chunk sizes to powers of two, neither for large nor for small sizes.
Neighbouring chunks can be combined into a single chunk on a free no matter what their size is.
This mechanism makes `ptmalloc` suitable for all kinds of allocation patterns while avoiding high memory waste through fragmentation.
The presence of multiple arenas allows multiple threads to allocate memory simultaneously in separate arenas, thus improving performance.

The other way of memory allocation is for very large blocks, i.e. much larger than a page.
These requests are allocated with `mmap` (anonymous or via `/dev/zero`).
This has the great advantage that these chunks are returned to the system immediately when they are freed.
Therefore, it cannot happen that a large chunk becomes "locked" in between smaller ones and even after calling free wastes memory.
The size threshold for `mmap` to be used is dynamic and gets adjusted according to allocation patterns of the program.
`mallopt` can be used to statically adjust the threshold using `M_MMAP_THRESHOLD` and the use of `mmap` can be disabled completely with `M_MMAP_MAX`.

## tcmalloc

## jemalloc

## mimalloc


