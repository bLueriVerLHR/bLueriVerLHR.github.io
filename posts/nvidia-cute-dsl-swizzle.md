# NVIDIA CuTe Swizzle

NVIDIA CUTLASS Python DSL 提供了一个函数 `make_swizzle(b, m, s)`，用于构造 `Swizzle` 对象。`b`、`m`、`s` 三个参数分别对应 `BBits`、`MBase`、`SShift` 三个元素，是底层 MLIR 构造 `!cute.swizzle<"S<{b},{m},{s}>">` 的三个参数。

在 `Swizzle` 对象注释里，是这么解释三个参数的：

> Swizzle is a transformation that permutes the elements of a layout.
>
> Swizzles are used to rearrange data elements to improve memory access patterns and computational efficiency.
>
> Swizzle is defined by three parameters:
>
> - **MBase**: The number of least-significant bits to keep constant
> - **BBits**: The number of bits in the mask
> - **SShift**: The distance to shift the mask
>
> The mask is applied to the least-significant bits of the layout.

注释中的位示意图如下：

```text
0bxxxxxxxxxxxxxxxYYYxxxxxxxZZZxxxx
                              ^--^ MBase is the number of least-sig bits to keep constant
                 ^-^       ^-^     BBits is the number of bits in the mask
                   ^---------^     SShift is the distance to shift the YYY mask
                                      (pos shifts YYY to the right, neg shifts YYY to the left)
```

例如：

```text
e.g. Given
0bxxxxxxxxxxxxxxxxYYxxxxxxxxxZZxxx

the result is
0bxxxxxxxxxxxxxxxxYYxxxxxxxxxAAxxx where AA = ZZ xor YY
```

Bank Conflict 发生于读取 Shared Memory 数据时，Warp 内线程同时存取一个 Bank 上的不同数据，也就是不同行、同一列的数据。因此 Swizzle 尝试通过对列做新的映射，将这样的读取分散到不同的 Bank 上。

对于一个矩阵运算而言，除了 `cp.async` 还需要 `ldmatrix`。`ldmatrix` 的特性是：线程提供行地址，从中存取一个 `8x8` 的元素，这些元素在不做优化的时候，容易取同一列的 8 个地址，然后从 Shared Memory 里加载一个 `8x8` 的矩阵。可以理解的是，如果矩阵在 Shared Memory 里是按照行主序存储，为了正确加载对应的矩阵分片，就不得不用同一列的 8 个地址加载数据。因此，从 Global Memory 加载到 Shared Memory 这一步开始就需要 Swizzle，然后 `ldmatrix` 是为了正确加载而引用 Swizzle。

为此，CuTe 提供预制的 Swizzle 操作，并要求 3 个参数。

对于 `m`、`MBase` 参数，经典的 `cp.async.cg` 一次获取 16 个字节元素，每次前进元素个数是 `16 / sizeof(value_t)`，具体到 `f16` 类型就是 8 个元素。由于向量获取不关心内部元素地址，因此这里设置 `MBase` 为 3，也就是 `000-111` 对应的二进制位被忽略。

Shared Memory 的组织形式是 32 个 Bank 对应 32 个线程，每个 Bank 可以存储 32 位的数据，也就是 4 个字节。除了在特定架构上这个数值可配置以外，其他架构一般以这个假设为主。对应到这里，32 个 Bank 意味着一行最多有 `32 * 4 / 2 = 64` 个 `f16` 元素。

对于 `b`、`BBits` 参数，如果以行主序存储元素，对于 `f16` 元素而言，在 Bank 上的排列可以视为 `reshape(-1, 64)`。如果我们一开始是取不同行的同一个 Bank 上的数据，在 Swizzle 之后，这些元素可以映射到 64 个不同列的元素上。如果一次操作存取 64 个不同列的元素，可以一次操作完成；如果超出 64 个元素，或者引发了 Bank Conflict，就会需要分成更多步骤完成。因此，工程上可以以 64 为顶设计，这样 Swizzle 列可能范围为 0-64，也就是 6 位。去掉前述末尾 3 位，可以设置 `BBits` 为 3。

> 一个合理的困惑是：32 位的 Bank 每 2 个 `f16` 元素会被放在同一个位置上，如果两个线程请求同一个 Bank 上的两个不同元素会不会 Bank Conflict？其实这个时候不同线程同时读取，会被广播，而不会 Bank Conflict。在同一个 Bank 里，一个元素是 32 位，并以 32 位数据进行广播，以将对一个元素的读取复制到多个线程里。两个 `f16` 元素是 32 位数据，因此是可以广播的。

对于 `s`、`SShift` 参数，当最终矩阵的一行元素个数为 128 的时候，一个 Warp 的 `cp.async.cg` 会加载 256 个元素，一共两行数据。每行数据按照 `(-1, 64)` 排列就是占据两行 Bank。`ldmatrix` 加载矩阵最大是 `16x16` 大小，每行只需要加载 16 个元素，不会超出 Bank 宽度，但是换到下一行的时候，步长是 128，这就是 `SShift` 参数需要的信息，对应 7 个二进制位，去掉尾部 3 位 `SShift` 就是 4。对于简单负载，可以故意设计成 `(-1, 64)` 这种匹配 Bank 的形状。此时就是 64 个元素为步长，对应就是 6 个二进制位。去掉前述末尾 3 位，`SShift` 为 3。

对于 `(-1, 64)` 布局的经典配置就是：

```python
make_swizzle(3, 3, 3)
```

> 一个补充说明：一次 `ldmatrix.m8n8.x4` 操作加载一个 `16x16` 大小的矩阵，而这个矩阵包含 256 个元素，意味着必须分成 4 次 Warp 读取才能完成这个操作，这是 Bank Conflict 吗？其实这并不是一个问题，而是一个操作完成需要的最小步骤。Bank Conflict 是指这次 4 次 Warp 读取操作里的每一个操作内，是否有冲突，导致被划分成更小的数据加载步骤。
