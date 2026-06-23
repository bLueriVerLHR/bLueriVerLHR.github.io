---
title: "A Tour of Malloc Implementations"
description: "ptmalloc, tcmalloc, jemalloc, mimalloc — how they work, how they differ, and when to use each."
authors: ["bLueriVerLHR"]
date: 2024-11-22T21:26:42+08:00
draft: false
tags: ["malloc", "operating system", "memory management"]
toc: true
---

## Why Malloc Matters

`malloc` and `free` are among the most frequently called functions in any non-trivial C or C++ program.
A slow allocator drags down every dynamic allocation; a fragmentation-prone one bloats your RSS over time.
Yet for decades most developers simply linked whatever the platform shipped — `glibc`'s `ptmalloc` on Linux, or the system allocator elsewhere — and never thought twice.

The landscape changed as multi-core machines, large-scale services, and language runtimes pushed allocators to their limits.
Today there are at least four major general-purpose `malloc` implementations in wide use, each with a distinct design philosophy:

|Allocator|Origin|Primary design goal|
|---|---|---|
|**ptmalloc** (glibc)|Derived from Doug Lea's `dlmalloc`|POSIX compliance, compatibility|
|**tcmalloc**|Google (Sanjay Ghemawat)|Raw speed, low lock contention|
|**jemalloc**|Jason Evans (FreeBSD / Facebook)|Fragmentation avoidance, scalable concurrency|
|**mimalloc**|Microsoft Research (Daan Leijen)|Excellent performance, security, free-list sharding|

This post walks through how each of them works under the hood.

## ptmalloc

The `ptmalloc`, a.k.a `pthreads malloc`, is derived from `dlmalloc` (Doug Lea malloc) and is the allocator used by the GNU C Library[^ptmalloc-glibc].

### Two allocation paths

Depending on the requested size and tunable parameters, `ptmalloc` uses two different strategies:

1. **Heap-based allocation (common path)**: For most allocations, memory is carved from a large contiguous region called the **heap**.
   The allocator manages these regions as **chunks** — portions of memory with metadata headers.
   Chunks are coalesced when freed, reducing fragmentation without rounding sizes to powers of two.

2. **`mmap`-based allocation**: For very large blocks (much larger than a page), `ptmalloc` calls `mmap` directly.
   These blocks are returned to the OS immediately on `free`, so a large allocation can never become "locked" between smaller chunks.
   The threshold for using `mmap` is dynamic and can be tuned via `mallopt` with `M_MMAP_THRESHOLD` and `M_MMAP_MAX`.

### Arenas

To reduce lock contention in multi-threaded programs, `ptmalloc` maintains multiple independent heap regions called **arenas**.
When a thread calls `malloc`, it is assigned to an arena; multiple threads can allocate simultaneously from separate arenas without blocking each other.

The key limitation: **memory never moves between arenas**.
If thread A allocates 300 MB in arena 1 and then terminates, thread B assigned to arena 2 cannot reuse that freed memory.
This can cause significant memory blowup in applications that alternate between allocation-heavy phases in different threads[^tcmalloc-blowup].

### Chunk management

- Chunk sizes are **not** rounded up to powers of two, unlike some other allocators.
- Adjacent free chunks are coalesced regardless of size, reducing fragmentation.
- Each chunk carries a header recording its size and status (allocated/free).
- Free chunks are organized in **bins** (small bins, large bins, unsorted bin) and the **fastbins** for small, frequently-allocated sizes.

### Strengths and weaknesses

**Strengths**: Mature, battle-tested, ships with every glibc-based Linux system. Good memory density for mixed workloads.

**Weaknesses**: Arena-to-arena memory migration is impossible, which can cause excessive RSS. Locking within an arena still causes contention under heavy multi-threaded loads. Slower than modern alternatives for small-object allocation.

## tcmalloc

TCMalloc (Thread-Caching Malloc) was developed at Google by Sanjay Ghemawat and Paul Menage to address the performance limitations of `ptmalloc2`[^tcmalloc-doc].

### Design philosophy

TCMalloc is built around two ideas:
1. **Thread-local caches** eliminate locks for the common case.
2. **Size classes** map every allocation size to one of ~170 pre-defined buckets.

### Small object allocation (≤ 32 KB)

Each thread has a **thread-local cache** — a set of singly-linked free lists, one per size class.

The fast path:
1. Map the requested size to a size class.
2. Pop a free object from the thread-local free list.
3. Return it. **No lock acquired.**

This takes roughly 50 ns on a 2.8 GHz P4, compared to ~300 ns for `ptmalloc2`[^tcmalloc-perf].

When the thread-local list is empty:
1. Fetch a batch of objects from the **central free list** (shared among all threads, requires a lock).
2. Refill the thread-local list.
3. Return one object to the application.

When the central free list is also empty:
1. Allocate a **run of pages** from the central page allocator.
2. Carve the run into same-sized objects.
3. Insert them into the central free list, then migrate some to the thread-local cache.

### Large object allocation (> 32 KB)

Large objects are handled directly by the **central page heap**, which manages runs of 4 KB pages.
The page heap is an array of free lists indexed by page count (1–255+, with the last entry for runs ≥ 256 pages).
Allocation searches from the requested size upward and may split larger runs.

### Spans and deallocation

The heap is divided into **spans** — contiguous runs of pages tracked by a `Span` object.
A central array (or 3-level radix tree on 64-bit) maps page number → span pointer.

On `free`:
1. Compute the page number, look up the span.
2. If small: push the object onto the thread-local free list. If the thread cache exceeds 2 MB, run a garbage collection that migrates unused objects back to central free lists.
3. If large: coalesce with adjacent free spans, insert into the page heap.

### Garbage collection of thread caches

When a thread's cache exceeds the threshold (2 MB by default, decreasing with more threads), TCMalloc walks all size-class lists and moves objects back to the central lists.
The number to move is determined by a per-list **low-water mark**: `L/2` objects are evicted, where `L` is the minimum list length since the last GC.
This heuristic ensures that if a thread stops using a particular size, objects of that size quickly become available to other threads.

### Strengths and weaknesses

**Strengths**: Extremely fast for small objects (~7× faster than `ptmalloc2` on benchmarks). Near-zero contention for thread-local allocations. Space-efficient representation — ~1% overhead for small objects vs `ptmalloc`'s 100% overhead (8-byte object uses 16 bytes in `ptmalloc2` but ~8.1 bytes in `tcmalloc`).

**Weaknesses**: Historically did not return memory to the OS. Tends to have higher baseline memory usage (~6 MB at startup). Cannot handle objects allocated by another allocator (e.g., `LD_PRELOAD` into a running binary).

## jemalloc

jemalloc was created by Jason Evans in 2005 as the memory allocator for a programming language runtime, then integrated into FreeBSD's libc. It was later adopted by Facebook for its server infrastructure, and is now used by Firefox, Redis, MariaDB, Cassandra, Android's Bionic libc, and many others[^jemalloc-history].

### Design philosophy

jemalloc emphasizes **fragmentation avoidance** and **scalable concurrency support**.
Its design is shaped by the demands of long-running server processes where memory bloat is unacceptable and allocation/deallocation patterns are unpredictable.

### Arenas and thread assignment

Like `ptmalloc`, jemalloc uses multiple independent **arenas** to reduce lock contention.
However, unlike `ptmalloc`, jemalloc:
- Assigns threads to arenas using a **round-robin** strategy (not random), with optional load-balancing.
- Supports explicit arena creation and destruction via its `mallocx`/`rallocx` API.
- Allows an entire arena to be destroyed in one operation, acting as a pool allocator.

### Size classes and slabs

jemalloc divides allocations into:
- **Small** (up to a few KB): allocated from **slabs** within arenas. Each size class maps to a slab of pages carved into equal-sized objects.
- **Large** (up to several MB): allocated as runs of pages from arena-level page heaps.
- **Huge** (> chunk size): allocated directly from the OS via `mmap`.

### Thread-local caches (tcache)

Each thread maintains a **tcache** — a set of free object lists per size class.
The fast path is lock-free: pop from the tcache, return.
When the tcache is exhausted, the thread refills from the arena's bins (with appropriate locking).

A key innovation: **decay-based dirty page purging**.
jemalloc tracks unused dirty pages and, over time, purges them back to the OS using `madvise(MADV_DONTNEED)`.
The purge rate follows a **decay curve** — pages are purged faster when memory pressure is high, slower when the application is likely to reallocate soon.
This was introduced in jemalloc 4.1.0 and is one of the reasons jemalloc excels at keeping RSS low in long-running processes[^jemalloc-decay].

### Arenas, bins, and runs

Each arena contains:
- **Bins**: per-size-class structures that hold a list of **runs** (partial or empty slabs).
- **Runs**: contiguous page ranges carved into same-sized objects. A run tracks its free objects via a bitmap.
- **Page map**: a global radix tree mapping page addresses to the arena, bin, and run that owns them.

On `free`, jemalloc can return the object to the tcache (fast path), the arena bin (slow path), or directly to the OS (for huge allocations).

### Introspection and profiling

jemalloc provides a rich introspection API via `mallctl*()` functions:
- Query per-arena statistics (allocated, active, mapped, retained).
- Dump heap profiles.
- Enable leak checking.
- Trigger manual decay or purging.

This tooling is a major reason for jemalloc's adoption in production services that need to debug memory issues at scale.

### Strengths and weaknesses

**Strengths**: Excellent fragmentation control. Predictable, low RSS over long periods via decay-based purging. Rich introspection and profiling tooling. Battle-tested at Facebook scale and in FreeBSD. Multiple arenas don't suffer from `ptmalloc`-style memory blowup because arenas can be destroyed and their memory reclaimed.

**Weaknesses**: More complex API surface (mallocx, mallctl, etc.). Slightly slower than `tcmalloc` for very small, thread-local allocations. Configuration requires understanding of tuning parameters for optimal performance.

## mimalloc

mimalloc (pronounced "me-malloc") was developed by Daan Leijen and Ben Zorn at Microsoft Research, initially as the runtime allocator for the Koka and Lean programming languages. It is the newest of the four, with its first public release in 2019[^mimalloc-paper].

### Design philosophy

mimalloc's core insight is **free-list sharding**:
Instead of one big free list per size class, mimalloc uses many small free lists — one per memory page — which naturally reduces fragmentation and increases locality (objects allocated close in time are placed close in memory).
Going further, each page has **multiple free lists**: one for thread-local `free` operations and one for concurrent `free` operations from other threads.

### Architecture

mimalloc manages memory in a hierarchy:

- **Pages** (64 KiB on 64-bit): the basic unit, carved into blocks of a single size class.
- **Segments**: groups of pages (typically 256). In v2, segments are thread-local to reduce fragmentation.
- **Heaps**: contain segments and provide thread-local allocation.
- **Arenas**: OS-level memory regions.

### Free-list sharding

This is the big idea. For each page, mimalloc maintains:

1. **Thread-local free list**: used for `free` operations by the owning thread. Fast, no atomics needed.
2. **Concurrent free list**: used for `free` operations from other threads. A single CAS (compare-and-swap) suffices to push/pop, without sophisticated lock-free coordination.

Since there are thousands of separate free lists across the heap, contention is naturally distributed — the chance of two threads contending on the same list is low, similar to how randomized skip lists reduce contention without complex locking.

### Eager page purging

When a page becomes completely empty (which happens more often thanks to free-list sharding), mimalloc immediately returns the memory to the OS by resetting or decommitting the page. This keeps real memory pressure low, especially in long-running programs, without needing the decay timers that jemalloc uses.

### Security features

mimalloc can be built in **secure mode**, enabling:
- Guard pages around allocations to detect buffer overflows.
- Randomized allocation addresses.
- Encrypted free-list pointers to mitigate heap corruption exploits.
- Heap metadata protection.

The performance penalty is typically around 10%[^mimalloc-secure].

### First-class heaps

Since v3.2, mimalloc supports **first-class heaps** — independent heap instances that can be allocated from any thread and destroyed atomically. This is useful for garbage-collected language runtimes (e.g., CPython has explored using mimalloc heaps for its GC) and for arena-style allocation where an entire heap can be freed at once.

### Strengths and weaknesses

**Strengths**: Consistently outperforms `jemalloc` and `tcmalloc` across a wide range of benchmarks — 7% faster than `tcmalloc` and 14% faster than `jemalloc` on Redis workloads[^mimalloc-bench]. Very small codebase (~10K LOC for the core). Excellent worst-case latency characteristics. Strong security posture when built in secure mode. Portable across many platforms (Windows, macOS, Linux, WASM, various BSDs, Haiku, MUSL).

**Weaknesses**: Relatively young — fewer years of production battle-testing compared to `jemalloc`. The multi-version story (v1, v2, v3) can be confusing for new adopters. Less introspection tooling than `jemalloc`.

## Comparison

|Feature|ptmalloc|tcmalloc|jemalloc|mimalloc|
|---|---|---|---|---|
|**Thread model**|Per-thread arenas|Thread-local caches|Per-thread caches + round-robin arenas|Thread-local free lists + page sharding|
|**Lock strategy**|Mutex per arena|Lock-free fast path, spinlocks for central alloc|Lock-free tcache, mutex per arena bin|Lock-free (CAS), sharded per page|
|**Small-object speed**|Slow (~300 ns)|Very fast (~50 ns)|Fast|Very fast|
|**Fragmentation control**|Moderate (coalescing)|Good|Excellent (decay-based)|Excellent (eager page purging)|
|**Memory reclamation**|`mmap` blocks only|Historically poor, improved|Decay-based `madvise`|Eager immediate purging|
|**Arena memory sharing**|None between arenas|Shared central pool|Shared arenas via round-robin|Shared via concurrent free lists|
|**Introspection tools**|`mallinfo`|Heap profiler/checker|Extensive `mallctl` API|Basic (`mi_stats_print`)|
|**Security hardening**|None|None|None|Built-in secure mode|
|**Codebase size**|Large (in glibc)|Medium|Large|Small (~10K LOC)|
|**Primary users**|Linux ecosystem|Google internal, Chrome|FreeBSD, Firefox, Redis, Facebook|Koka, Lean, .NET (optional)|

## Which one should you use?

- **For desktop Linux applications**: stick with the default `ptmalloc` in glibc. It is well-tested, compatible, and adequate for most desktop workloads.

- **For multi-threaded server applications** on Linux: `jemalloc` is the safe bet. Its decay-based purging keeps RSS predictable over months of uptime, and its introspection tools are invaluable for debugging production memory issues.

- **For allocation-heavy C++ applications** (game engines, databases, trading systems): `mimalloc` offers the best raw performance on most benchmarks, with excellent multi-threaded scaling and the smallest codebase to audit.

- **For Google-scale services** or when using Google infrastructure: `tcmalloc` is the natural choice, deeply integrated with Google's profiling and monitoring ecosystem.

- **If security is paramount**: `mimalloc` in secure mode provides heap hardening that no other general-purpose allocator offers out of the box.

In practice, all four are excellent allocators. The best choice depends more on your operational requirements (introspection, RSS predictability, security) than on raw micro-benchmark numbers.

## References

[^ptmalloc-glibc]: [The GNU Allocator — GNU C Library Manual](https://www.gnu.org/software/libc/manual/html_node/The-GNU-Allocator.html)

[^tcmalloc-blowup]: The TCMalloc documentation describes this exact problem: "In ptmalloc2 memory can never move from one arena to another. This can lead to huge amounts of wasted space." — [TCMalloc Overview](https://goog-perftools.sourceforge.net/doc/tcmalloc.html)

[^tcmalloc-doc]: [TCMalloc: Thread-Caching Malloc](https://goog-perftools.sourceforge.net/doc/tcmalloc.html)

[^tcmalloc-perf]: TCMalloc documentation: "ptmalloc2 takes approximately 300 nanoseconds to execute a malloc/free pair on a 2.8 GHz P4. The TCMalloc implementation takes approximately 50 nanoseconds for the same operation pair."

[^jemalloc-history]: [jemalloc Background — GitHub Wiki](https://github.com/jemalloc/jemalloc/wiki/Background)

[^jemalloc-decay]: Jason Evans, "Decay-based unused dirty page purging", Applicative 2015. First available in jemalloc 4.1.0.

[^mimalloc-paper]: Daan Leijen, Ben Zorn, Leonardo de Moura, "Mimalloc: Free List Sharding in Action", MSR-TR-2019-18, June 2019. [PDF](https://www.microsoft.com/en-us/research/publication/mimalloc-free-list-sharding-in-action/)

[^mimalloc-secure]: [mimalloc Documentation — Build Modes](https://microsoft.github.io/mimalloc/)

[^mimalloc-bench]: mimalloc documentation reports 7% improvement over tcmalloc and 14% over jemalloc on Redis benchmarks. See [Performance](https://microsoft.github.io/mimalloc/).
