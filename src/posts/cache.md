---
title: "Cache"
description: "Tips, techniques for caches."
authors: ["bLueriVerLHR"]
date: 2026-05-23T16:15:00+08:00
draft: false
tags: ["cache"]
toc: true
---

## General

All cache replacement policies can be represented by following operations:

1. **Insertion**: Where to insert a new cache line when it is **decided** to be kept. (How to decide also metters)
2. **Promotion**: How to update the `status` of cache line after a cache `hit`.
3. **Aging**: How to update the `status` of cache line after a cache `miss`.
4. **Eviction**: Which cache line should be removed to make space for a new one.

While implementing caches, I noticed that some state-of-the-art (SOTA) policies introduce additional operations related to global history or custom metrics.
Basically, the four basic operations are used for better understanding the policies.
When actual implementing a cache, the only two interfaces are required: `insert` and `fetch`.

Depending on the status recorded for each cache line — such as recency, frequency, historical state, and so on — many variants are possible.

|Name|Insertion|Promotion|Aging|Eviction|Status|
|---|---|---|---|---|---|
|Least Recent Used ([LRU](#least-recent-used))|MRU|MRU|Move 1 position towards LRU|LRU|Recency|
|Most Recent Used (MRU)|MRU|MRU|Move 1 position towards LRU|MRU[^MRU]|Recency|
|Early Eviction LRU (EELRU)|MRU|MRU|Move 1 position towards LRU|MRU or _e-th_ recently used line [^EELRU]|Recency|
|Segmented LRU (Seg-LRU/SLRU)[^SLRU]|MRU in _probationary_ segment|MRU in _protected_ segment|Move 1 position towards LRU|LRU from _probationary_ segment|Recency|
|Bimodal Insertion Policy (BIP)|MRU with probability $\epsilon$[^BIP]|MRU|Move 1 position towards LRU|LRU|Recency|
|Static Re-Reference Interval Prediction ([SRRIP](#static-re-reference-interval-prediction))|RRPV=2|RRPV=0|Increment all RRPVs (if no line with RRPV=3)|RRPV=3|RRPV|
|Bimodal re-reference interval prediction policy (BRRIP)|Default RRPV=3, RRPV=2 with probability $\epsilon$|RRPV=0|Increment all RRPVs (if no line with RRPV=3)|RRPV=3|RRPV|
|Protecting Distance-Based Policy (PDP)[^PDP]|RPD=PD|RPD=PD|Decrease RPD|RPD=0|RPD|
|Genetic Insertion and Promotion for PseudoLRU Replacement (GIPPR)[^GIPPR]|IPV[k]|IPV[i] for i-th state|i+1 for i-th state|k-1|IPV|
|Shepherd Cache (SC)[^SC]| | | | |Recency|
|Least Frequent Used (LFU)|Frequency=0|Increase Frequency|n/a|LFU|Frequency|
|Frequency-Based Replacement (FBR)|MRU, Frequency = 0|MRU, Frequency++ if not in new section|Move 1 position towards LRU|LFU line in old section|Recency, Frequency|
|Least Recently/Frequently Used (LRFU)[^LRFU]|$CRF(b)=F(0)$, $LAST(b)=t_c$|$CRF(b)=F(0)+F(t_c–LAST(b))*CRF_{last}(b)$, $LAST(b)=t_c$|$t_c=t_c+1$|Line with min  CRF value|CRF|

[^MRU]: The purpose of MRU is to solve the _thrashing_. So it keeps the LRU lines for further fetching.

[^EELRU]: The EELRU will make the decision via monitoring the distribution of hit.
If the distribution of hits is monotonically decreasing, evict LRU lines.
If the distribution of hits is higher in the near LRU region than the early region (e-th region) in a roughly cyclic pattern that is larger than main memory, evict e-th LRU lines.

[^SLRU]: The SLRU use two set of cache lines: _probationary_ and _protected_.
If a cache line in _protected_ segment is evicted, it will be moved to MRU in _probationary_ segment.
If a cache line in _probationary_ segment is evicted, it will be evicted from the cache. 

[^BIP]: Otherwise, insert new cache line in LRU.

[^PDP]: A generalization of RRIP.
The policy assign _protecting distance_ (PD) to new cache lines to protect them not being evicted within the remaining PD (RPD).
The PD is predicted via _reuse distance distribution_ (RDD) which can be computed offline for different workloads.
At runtime, the PD is recomputed infrequently using a small special-purpose processor.

[^GIPPR]: The policy use the concept of an _Insertion/Promotion Vector_ (IPV) for insertion and promotion.
In particular, the IPV will be a vector of k+1 length for a k-way set-associative cache.
All its values are within [0, k-1].
The IPV specifies a block's new position in the recency stack both when it is inserted into the cache and when it is promoted from a different position in the recency stack.

[^SC]: The policy try to emulate future lookahead in Belady's policy with the help of an auxiliary cache, called the Shepherd Cache.
In particular, the cache is logically divided into two components:
(1) the Main Cache (MC) which emulates optimal replacement, and (2) the SC which uses a simple FIFO replacement policy.
New lines are initially buffered in the SC, and the decision to replace a candidate from the MC is deferred until the new line leaves the SC.
While the new line is in the SC, information is gathered about the reuse order of replacement candidates in the MC.
For example, candidates that are reused earlier become less likely candidates for eviction since Belady’s policy evicts the lines that is reused furthest in the future.
When the new line is evicted from the SC (due to other insertions in the SC), a replacement candidate is chosen by either picking a candidate from the MC that hasn’t been reused within the lookahead window, or the candidate that was reused last; if all lines in the MC were reused before the SC line was reused, then the SC line replaces itself.

[^LRFU]: The policy use a new metric called _Combined Recency and Frequency_ (CRF).
It weighs the relative contribution of each reference by a weighing function.
In particular, LRFU computes for each block a CRF value, which is the sum of the weighing function $F(x)$ for each past reference, where $x$ is the distance of the past reference from the current time. The weight function is $F(x)=(\frac{1}{p})^{\lambda x}$, where $\lambda$ is an empirically chosen parameter.

## Least Recent Used

The policy evicts least recent used cache lines. It face two main challenges: _thrashing_ and _scanning_.

1. The _thrashing_ workloads refer to the size of working set exceeds the cache size. For example, loop on arr[N] again and again with cache[M] where N > M.
2. The _scanning_ workloads refer to a burst of references of data that is not reused. For example, loop on arr[N] only once.

The variants of Recency-Based policies can be realized by modifying the insertion policy, while keeping the eviction policy unchanged (evict the line in the LRU position).

## Static Re-Reference Interval Prediction

The policy models the cache replacement problem into a _Re-Reference Interval Prediction_ (RRIP) problem.
It uses _Re-Reference Prediction Value_ (RRPV) to predict the re-reference interval of each cache line.
Usually, the RRPV is implemented with a 2-bit value.
The update of RRPV can be written into a FSM with 4 states.

The initial state of each cache line at insertion can change the feature of the policy:

- 0 indicates Recency Friendly
- 2 indicates Scan Resistant
- 3 indicates Thrash Resistant

