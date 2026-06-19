---
title: "Algorithm"
description: "Tips, techniques for algorithms."
authors: ["bLueriVerLHR"]
date: 2026-05-15T19:38:00+08:00
draft: false
tags: ["algorithm"]
toc: true
---

## Stable Sort

Definition: A sorting algorithm is said to be `stable` if two objects with equal keys appear in the same order in sorted output as they appear in the input data set.

**Stable**:
- Stable by nature
  - Bubble Sort
  - Insertion Sort
  - Merge Sort
  - Count Sort
- Non-comparison-based sorts
  - Counting Sort
    - the Sorted Array is filled in reverse order
- Sorts depend on another sort: the only requirement that the other sort should be stable
  - Radix Sort

**Unstable**:
- Selection Sort
- Quick Sort
- Heap Sort

The unstable sort algorithms could be stable by considering the order.
