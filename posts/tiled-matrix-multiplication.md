---
title: "Tiled Matrix Multiplication"
authors: ["bLueriVerLHR"]
date: 2026-11-01T20:46:00+08:00
tags: ["CUDA", "Algorithm", "Machine Learning", "Linear Algebra"]
section: 7
draft: true
---

通用矩阵相乘（GEneral Matrix-Matrix multiply，GEMM）是三级基本线性代数子程序（Level 3 
Basic Linear Algebra Subprogram，Level 3 BLAS）里的常用算子，其用于计算两个矩阵相乘。在 BLAS 里，Level 3 是时间复杂度在 \(O(n^3)\) 的算子，也就是常见的遍历两个矩阵的行和列的元素相乘，在累加矩阵上求和得到最终结果，公式为：

\[
C = \alpha \cdot A \cdot B + \beta \cdot C \label{gemm}
\]

> 在算法领域 GEMM 有更低的时间复杂度的 [Strassen 算法](https://doi.org/10.1007%2FBF02165411)，不过在工程实践上不是很实用。

如果用 triton 来描述的话，就是：

```python
# GEMM(A, B, C)
for m in range(0, M):
  for n in range(0, N):
    for k in range(0, K):
      C[m, n] += dot(A[m, k], B[k, n])
```

## Tensor Core

张量核心（Tensor Core）是 CUDA 专门设计用于矩阵乘累加（Matrix Multiply-Accumulate，MMA）的硬件计算单元，在 V100 中介绍的张量核心里，每个矩阵乘累加操作的格式定义如下：

\(
D_{4 \times 4}^{f32} = A_{4 \times 4}^{f16} \times B_{4 \times 4}^{f16} + C_{4 \times 4}^{f32}
\)

每个时钟周期里，张量核心都能执行一个混合精度的矩阵乘累加操作。
4x4 矩阵乘法包含 64 个 FP16 乘法，48 个 FP16 加法，累加操作包含 16 个可能混合精度的浮点数加法。
因此，一个乘累加操作包含 128 个浮点数操作，每个流多处理器配备 8 个张量核心，一个时钟周期里最多能完成 1024 个混合精度浮点数操作。

我们使用 \(A_{m \times k}\)，\(B_{k \times n}\)，\(C_{m \times n}\) 和 \(D_{m \times n}\) 来描述 MMA 的各个矩阵名称和默认维度使用的符号，我们使用 `m16n8k4` 这样的格式来称呼 `m=16, n=8, k=4` 的布局。

在 CUDA 里，每种精度支持的布局都有所不同，需要查阅手册了解；不同的布局里，元素在寄存器里的默认排布也不一样。但基本上，MMA 操作以 Warp 为单位执行，操作数按照定义分散在 Warp 中不同线程的寄存器里。在手册里会使用 `lane id` 来描述线程在 Warp 里的顺序，存储对应的元素。

> 张量核心硬件架构是一个 2D 脉动阵列（Systolic Array）。

## Shared Memory

