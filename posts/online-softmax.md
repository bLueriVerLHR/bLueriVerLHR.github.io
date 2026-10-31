---
title: "Online Softmax"
authors: ["bLueriVerLHR"]
date: 2026-10-31T23:45:00+08:00
tags: ["Algorithm", "Machine Learning"]
section: 7
draft: false
---

From: <https://arxiv.org/abs/1805.02867>

Online Softmax 利用 Softmax 中 Reduce 算子的排序不变性，做的在线更新设计。
对于集合 \(X = \{x_1, x_2, ..., x_n\}\) 里的元素，对于这 \(n\) 个元素通过如下公式：

\[
m_n = \max\{x_1, x_2, ..., x_n\}  \label{reduce-max}
\]

\[
S_n = \sum_{i=1}^{n}e^{x_i - m_n} \label{reduce-sum}
\]

\[
y_i = Softmax(x_i) = e^{x_i - m_n} / S_n \label{softmax}
\]

我们可以计算出每个元素对应的 Softmax 值。
在计算过程中一共包含两次规约操作，求最大值和基于最大值求和。
规约操作的结果作用于集合里的每一个变量，也因此如果集合中的元素如果发生变化，就会需要重新计算全部结果，从而造成更新放大。

> NOTE: 使用减去最大值后的结果求和，可以减少大部分情况下的数值溢出，实际上并没有完全解决数值溢出问题。

Online Softmax 是解决了一类子问题，也就是 \(X\) 集合中元素个数增加以后该如何计算新的结果。
这使得问题变得相对简单，利用求最大值和求和的排序不变性我们可以得到对于集合 \(X\cup\{x_{n+1}\}\) 而言，它的 Softmax 由如下公式更新：

\[
m_{n+1} = \max\{m_n, x_{n+1}\}  \label{incremental-max}
\]

\[
\alpha =  e^{m_n - m_{n+1}} \label{fix-factor}
\]

\[
S_{n+1} = \alpha \cdot S_n + e^{x_{n+1} - m_{n+1}} \label{incremental-sum}
\]

\[
\hat{y}_i = \frac{\alpha \cdot y_i \cdot S_n }{S_{n+1}} \label{online-softmax}
\]

对于公式 \(\ref{incremental-sum}\) 和 \(\ref{online-softmax}\) 我们，可以做如下推导：

\[
\begin{aligned}
S_{n+1} &= \alpha \cdot S_n + e^{x_{n+1} - m_{n+1}} \\
&= e^{m_n - m_{n+1}} \sum_{i=1}^{n}e^{x_i - m_n} + e^{x_{n+1} - m_{n+1}} \\
&= \sum_{i=1}^{n} e^{m_n - m_{n+1}} e^{x_i - m_n} + e^{x_{n+1} - m_{n+1}} \\
&= \sum_{i=1}^{n} e^{x_i - m_{n+1}} + e^{x_{n+1} - m_{n+1}} \\
&= \sum_{i=1}^{n+1} e^{x_i - m_{n+1}}
\end{aligned}
\]

\[
\begin{aligned}
\hat{y}_i &= \frac{\alpha \cdot y_i \cdot S_n}{S_{n+1}} \\
&= \frac{\frac{e^{x_i - m_n}}{S_n} \cdot S_n \cdot e^{m_n - m_{n+1}}}{S_{n+1}} \\
&= \frac{e^{x_i - m_n} e^{m_n - m_{n+1}}}{S_{n+1}} \\
&= \frac{e^{x_i - m_{n+1}}}{S_{n+1}} \\
&= \frac{e^{x_i - m_{n+1}}}{\sum_{i=1}^{n+1} e^{x_i - m_{n+1}}}
\end{aligned}
\]

结果就是 n+1 个元素情况下的 Softmax，也就证明了 Online Softmax 的正确性。

## 局限

Online Softmax 针对的是新增元素的聚合操作，因此不适合元素删除、元素修改情况。
在 GNN 的 GAT 里，顶点和边的变化会对应不同的操作，增删改都会发生，因此大部分情况需要通过近似或重计算完成。