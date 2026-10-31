# FlashAttention 个人实现思路

FlashAttention 结合 Online Softmax 和 Tiled Matrix Multiplication 做到了极高的墙钟加速同时，也减少了内存需求。接下来以自顶向下的方式，逐渐讲述一个 FlashAttention 是怎么设计出来的。

一个简单的 MHA，假设 QKV 布局为 `(batch_size, seq_len, n_heads, d_head)`，使用 PyTorch 实现可以以以下形式完成：

```python
def torch_attn(Q: torch.Tensor, K: torch.Tensor, V: torch.Tensor):
    Q = Q.transpose(-2, -3)
    K = K.transpose(-2, -3)
    V = V.transpose(-2, -3)

    KT = K.transpose(-1, -2)
    P = torch.softmax(Q @ KT / math.sqrt(Q.shape[-1]), dim=-1)
    O = P @ V
    return O.transpose(-2, -3)
```

在这段代码里，为了处理方便，先将布局转换为 `(batch_size, n_heads, seq_len, d_head)` 形式，然后完成 MHA 的基本操作。这里设 \(S=QK^T\)，布局为 `(batch_size, n_heads, seq_len, seq_len)`。接下来在 \(S\) 上先除以维度的平方根 \(\sqrt{d_{\text{head}}}\)（避免梯度消失），然后计算 softmax 得到 \(P\)，到这里布局基本没变。最后，\(O=PV\) 算完得到最终结果布局为 `(batch_size, n_heads, seq_len, d_head)`。

上述过程中，保守估计需要在全局内存里放下 \(Q\)、\(K\)、\(V\)、\(P\)、\(O\) 一共五个矩阵。其中，\(P\) 矩阵的空间复杂度为 \(O(\text{seq\_len}^2)\)。如果序列很长，或者显存紧张，这样的计算很容易发生 `torch.OutOfMemoryError: CUDA out of memory.`。其次，PyTorch 会调用 `matmul` 函数完成高效的矩阵乘法运算，这其中包含了矩阵分块、异步加载、利用张量核心完成 MMA 等分块矩阵乘法计算经典操作。

FlashAttention 的算法，利用 Online Softmax 提供的算法便利上，将其中的 \(P\) 矩阵进行了分块处理。也因此，有机会将整个 MHA 看作一个可以被分块处理的完整操作，而不是几个矩阵乘法的组合，以进一步减少了对 Global Memory 的存取。

## Online Softmax

这是一个比较容易理解的算法，softmax 目的是对于 \(\{x_1, x_2, \dots, x_n\}\) 中的每一个元素，求：

\[
p_i = \frac{e^{x_i-x_m}}{\sum_{j=1}^{n} e^{x_j-x_m}}, \quad \text{where}\quad x_m = \max(x_1, x_2, \dots, x_n)
\]

其中，包含两个有排序不变性的操作：一个是分母里的求和，一个是为了保证不会数值溢出而使用的最大值。排序不变性赋予这两个操作可以在线增量更新，而不需要使用保证全部数据同时参与运算。

总的来说，考虑这样的问题，当进来一个新元素 \(x_{n+1}\)，那么上一轮算出的结果该如何更新？先考虑两个有排序不变性的操作：

\[
S = \sum_{j=1}^{n} e^{x_j-x_m}, \quad x_m=\max(x_1, x_2, \dots, x_n)
\]

我们能够发现下一轮更新可以这么写：

\[
x'_m = \max(x_m, x_{n+1}), \quad S = S \cdot e^{x_m - x'_m} + e^{x_{n+1}-x'_m}
\]

这样子，可以清楚的看到，只需要额外保存两个数据，就可以不用重新全部再算一遍，也可以得到最新的求和和最大值。一般，\(e^{x_m - x'_m}\) 会被称为修正因子，用于修正分子分母。

## Tiled Matrix Multiplication

矩阵乘法的优化历史会比较悠久，在 GPU 上完成矩阵乘法的一般操作就是将矩阵分块。以 CPU 的视角来看，比较直观的理解就是可以利用 CPU 的多级缓存，重复利用一些矩阵块完成运算。GPU 上给出了和一级缓存在同一块 SRAM 上的 Shared Memory 的完全控制权，让程序员可以显式操纵以获取更好的性能。

而由于这种分块操作有时候并没有空间连续性，例如按行主序存储，但是按列切分了，这个时候会有下标不连续的可能。这个场景下，如果允许，可以使用 prefetch 暗示 CPU 如果愿意，可以先加载哪个数据块。

假设要处理矩阵乘法 \(A_{M\times K}\times B_{K\times N}\)，为了处理方便一般会做一些假设来保障处理的高效。这里，我们假设在行方向上，每 \(B_r\) 为一组处理，其中 \(B_r\) 整除 \(M\)；同理，列方向上，每 \(B_c\) 为一组处理，其中 \(B_c\) 整除 \(N\)。这样，我们先切分成 \(A_{B_r\times K}\times B_{K\times B_c}\)，对应我们进行网格划分的时候，可以设置为 `dim3 grid(M/Br, N/Bc)`。在这样的设计里，如果在流多处理器上启动多个 CTA 处理矩阵乘法，相同 `blockIdx.x` 的 CTA 在加载完对应的 \(A_{B_r\times K}\) 分块后，可以直接在共享的 L2 缓存上直接找到，以减少与 DRAM 的存取操作。

除此之外，在 PTX 层面上，Nvidia 提供了更多与 Shared Memory 有关的数据存取操作，以进一步加快数据的存取。目前主要需要关注的就是 `cp.async` 和 `ldmatrix`，前者负责异步加载数据，从 Global Memory 加载到 Shared Memory；后者负责加载数据，从 Shared Memory 加载到 Register Files。在不同架构上，这些操作的支持程度有所不同，还会有额外的操作支持更多的存取方向，可以参考手册深入了解。

结合上述两个内容，就可以比较完整的完成一个简单的分块矩阵乘法操作，以下伪代码中，假设矩阵存储格式均为行主序：

```python
row_start = blockIdx.x * Br
col_start = blockIdx.y * Bc

# 加载到 shared memory (shm)
Load A[row_block:row_block+Br, :] -> shm_A
Load B[:, col_block:col_block+Bc] -> shm_B 
__syncthreads

Fill Zero shm_C

i = threadIdx.x
j = threadIdx.y

for k in range(K):
  shm_C[i][j] += shm_A[i][k] * shm_B[k][j];

__syncthreads
Store shm_C -> C[row_block:row_block+Br, col_block:col_block+Bc]
```

以上的伪代码比较简单的描述了一个初级分块矩阵乘法思路。基于这个原型，我们可以结合 CUDA 的优化手册逐渐给出一个比较完善的分块矩阵乘法。

## Bank Conflict

Bank Conflict 是 CUDA 里最重要的问题，我们可以想象 Shared Memory 的构成是一组 32 个存储硬件。每个硬件一个时钟周期只能完成一个元素的存取，如果有若干的线程同时存取同一个元素，可以使用广播满足全部需求。但如果有若干程序需要存取同一个单元不同位置上的元素，就会因为能力有限，需要按顺序一个个满足。

这里的数字 32，默认和一个 Warp 中线程个数相等，在一些架构里也可以通过配置改变。一般，Shared Memory 中的元素，按照顺序被分配到 Bank 上。假设一组 8 个硬件，连续存储从 0 到 23 一共 24 个元素，就会按照如下编排：

```text
 0  1  2  3  4  5  6  7
 8  9 10 11 12 13 14 15
16 17 18 19 20 21 22 23
```

处于同一列的元素会被分配到同一个 Bank 上。可以看出，如果在同一个时钟周期里，Warp 里的线程同时进行存取操作，其此时使用同样的 k，那么对于矩阵 A 来说，同一个 Warp 的元素都会取到同一个 Bank 里的不同元素。相同在 k 所指定的同一个 Bank，不同在 `threadIdx.x` 所指定的 Bank 里的不同位置。解决这个问题办法也已经有不少探索。

增加 Padding。比较简单，也比较浪费 Shared Memory。也就是针对上述的 8 个一组的情况，分配一个 3x9 的数组，就会出现：

```text
 0  1  2  3  4  5  6  7
    8  9 10 11 12 13 14
15    16 17 18 19 20 21
22 23
```

这样的情况，我们用 x 表示数组里没有元素的位置，那么逻辑上有：

```text
 0  1  2  3  4  5  6  7  x
 8  9 10 11 12 13 14 15  x
16 17 18 19 20 21 22 23  x
```

放到 Bank 里有：

```text
 0  1  2  3  4  5  6  7
 x  8  9 10 11 12 13 14
15  x 16 17 18 19 20 21
22 23  x
```

这样就将逻辑上一列的数据，分到了不同 Bank 上，减少了 Bank Conflict。

Swizzling Column Index。可以发现，主要造成 Bank Conflict 的原因是，从 Shared Memory 同一个 Bank 里存取，而同一个 Bank 基本意味着 Warp 里的元素同时处理同一列数据。因此，可以通过对列下标做代数变换，以保证 Warp 里的线程分别存取不同列的数据。具体而言就是做 `col = col ^ row` 这样的代数变换。

```text
 0    0          0
 8 -> 9  bank -> 1
16   18          2
```

这样就解决了 Bank Conflict。相对于 Padding，理解上会有一定复杂，但是没有额外成本。

## 异步存取

在伪代码里，整个流程是先完成整个矩阵从 Global Memory 到 Shared Memroy 中的加载，然后再顺序计算出对应元素的矩阵乘结果。在这个设计里，伪代码没有隐藏任何数据存取延迟，使得访问会成为可能的瓶颈。

为了解决这个问题，可以引入双缓冲的技术，让程序一边加载到新的缓冲区，一边计算当前缓存区中的数据。两个缓冲以环形缓冲区方式组织，按照循环的奇偶性判断新旧。

不过当前的算法过于整体，没有明显可继续划分的部分，所以要做一定的人为划分。可以看到在沿着 K 轴做的求和运算属于具有排序不变性的规约操作，因此可以尝试沿着 K 轴方向上进一步切分矩阵。例如使用 \(B_k\)，其中 \(B_k\) 整除 \(K\)，将处理的矩阵进一步划分到更小的。然后，以一边加载，一边计算的思路，做如下的代码修改：

```python
row_block = blockIdx.x * Br
col_block = blockIdx.y * Bc

# 加载到 shared memory (shm)
Async Load A[row_block:row_block+Br, 0:Bk] -> shm_A[0]
Async Load B[0:Bk, col_block:col_block+Bc] -> shm_B[0]
Commit Async

Fill Zero shm_C

i = threadIdx.x
j = threadIdx.y

for k_blk_idx in range(K // Bk):
  cur = k_blk_idx % 2
  next = (k_blk_idx + 1) % 2
  Wait Async
  __syncthreads
  if k_blk_idx + 1 != K // Bk:
    Async Load A[row_block : row_block+Br, (k_blk_idx+1)*Bk : (k_blk_idx+2)*Bk] -> shm_A[next]
    Async Load B[(k_blk_idx+1)*Bk : (k_blk_idx+2)*Bk, col_block : col_block+Bc] -> shm_B[next]
    Commit Async
  for k in range(Bk):
    shm_C[i][j] += shm_A[cur][i][k] * shm_B[cur][k][j];

__syncthreads
Store shm_C -> C[row_block:row_block+Br, col_block:col_block+Bc]
```

这样就做到存储计算重叠，构成流水线，隐藏了一定的数据加载延迟。

## 张量操作

张量处理器的引入使得处理器能够一次性运算一个 4x4x4 的 f16xf16+f32 的混合精度矩阵乘累加运算。在 PTX 上，给出了许多预定义的矩阵乘累加操作，每种操作对应一种矩阵布局。张量处理器使用的数据来自于线程的寄存器，因此对于不同的矩阵布局，有不一样的寄存器安排。

矩阵乘累加操作一般发生在一个 Warp 里，在 Warp 内的每一个线程使用一定数量的寄存器存储矩阵元素，通过合作，完成一种布局的矩阵乘累加运算。具体拿 m16n8k16 布局来说，其对应的公式如下：

\[
D_{16\times 8}=A_{16\times 16}B_{16\times 8}+C_{16\times 8}
\]

其中，矩阵 \(A_{16\times16}\) 中有 256 个元素，分配到每个线程上需要保存 8 个元素，每个元素是一个 f16，每两个 f16 可以合并为一个 32 位数据保存到寄存器里。这样每个线程就只需要 4 个 32 位寄存器可以存储需要的数据。

具体如何对应到实际矩阵里的每一个元素，可以参考 `mma.m16n8k16` 操作的文档。详细来说：

对于矩阵 \(A_{16\times16}\)：一个 8x8 的 f16 元素组成的矩阵里，按行主序，连续的元素每两个一组分配给 Warp 里的线程，需要 32 个 32 位寄存器。然后以 4 个 8x8 行主序矩阵，按照列主序构成一个 16x16 的矩阵。

对于矩阵 \(B_{16\times8}\)：一个 8x8 的 f16 元素组成的矩阵里，按列主序，连续元素每两个一组分配到给 Warp 里的线程，需要 32 个 32 位寄存器。然后以 2 个 8x8 列主序矩阵，按照列主序构成一个 16x8 的矩阵。

对于矩阵 \(D_{16\times8}\) 和 \(C_{16\times8}\)：一个 8x8 的 f32 元素组成的矩阵里，按行主序，连续的元素每两个一组分配给 Warp 里的线程，需要 64 个 32 位寄存器。然后以 2 个 8x8 行主序矩阵，按照列主序构成一个 16x8 的矩阵。这两个矩阵可以是别名，因此对一个线程来说，最少需要 4 个 32 位寄存器。

最终这个指令对应的格式里：

```asm
asm volatile("mma.sync.aligned.m16n8k16.row.col.f32.f16.f16.f32 "
             " { d0, d1, d2, d3 }, "
             " { a0, a1, a2, a3 }, "
             " { b0, b1 }, "
             " { c0, c1, c2, c3 }; "
```

每个线程最少需要提供 10 个 32 位寄存器，以完成一个 MMA 操作。

在理解完张量操作的布局和构成后，可以看出每个寄存器需要加载的元素位置迥异。PTX 里提供了 `ldmatrix` 操作辅助完成矩阵的加载。该操作对于 f16 类型的数据只支持 8x8 布局的矩阵，对于 m16n8k16 布局的操作来说，相对友好。其可以选择一次性加载 1 个、2 个和 4 个矩阵。

具体如何对应元素可以参考文档 `ldmatrix` 里给出的图，具体来说，每个 8x8 矩阵需要 8 条地址指示从何处连续取出 8 个 f16 元素。如果加载 1 个、2 个和 4 个矩阵，就需要 8、16、32 个地址，由 Thread 0-7、Thread 0-15、Thread 0-31 给出。每个 8x8 矩阵以 f16 元素按行主序组成，连续的元素按每两个元素为一组分配给 Warp 里的寄存器。多个矩阵就按照列主序排列构成 8x8、16x8 和 16x16 矩阵。

可以使用后缀 `.trans` 选择行主序的矩阵，转置加载为列主序的 8x8 矩阵，但依然按照列主序排列 8x8 矩阵。因此，对于加载 4 个的情况，需要做一定的代数运算让地址第 2 个和第 3 个矩阵的 Shared Memory 对应地址做一定的转换以完成整体的转置。

最终，这里保证 Br、Bc 和 Bk 分别为 16、8 和 16 的倍数，就可以方便地拆解为更小的矩阵乘累加运算处理。

```cpp
row_block = blockIdx.x * Br
col_block = blockIdx.y * Bc

warp_id = threadIdx.x / 32
lane    = threadIdx.x % 32

# Br × Bc 的输出被拆成 num_tile_m × num_tile_n 个 16×8 tile
# 每个 warp 通过循环处理其中一部分
num_tile_m    = Br / 16
num_tile_n    = Bc / 8
num_warp      = blockDim.x / 32
tile_per_warp = (num_tile_m * num_tile_n + num_warp - 1) / num_warp

# lane 在 warp 内的分组
#   group_id      = lane / 4  -> 0..7，对应输出 tile 的行基准
#   lane_in_group = lane % 4  -> 0..3，决定本线程负责的两列
group_id      = lane / 4
lane_in_group = lane % 4

float acc[4] = {0, 0, 0, 0}

Async Load A[row_block : row_block+Br, 0:Bk] -> shm_A[0]
Async Load B[0:Bk, col_block : col_block+Bc] -> shm_B[0]
Commit Async

for k_blk_idx in range(K / Bk):
  cur  = k_blk_idx % 2
  next = (k_blk_idx + 1) % 2
  Wait Async
  __syncthreads()

  # 提前发起下一块异步加载
  if k_blk_idx + 1 != K / Bk:
    Async Load A[row_block : row_block+Br,
                 (k_blk_idx+1)*Bk : (k_blk_idx+2)*Bk] -> shm_A[next]
    Async Load B[(k_blk_idx+1)*Bk : (k_blk_idx+2)*Bk,
                 col_block : col_block+Bc]            -> shm_B[next]
    Commit Async

  # 遍历本 warp 负责的所有 16×8 tile
  # Br × Bc 的覆盖就发生在这一层循环
  for tile in range(tile_per_warp):

    tile_id = warp_id + tile * num_warp
    if tile_id >= num_tile_m * num_tile_n:
      break

    tile_m = tile_id / num_tile_n          # 0 .. num_tile_m-1
    tile_n = tile_id % num_tile_n          # 0 .. num_tile_n-1

    # Bk 可能包含多条 mma，每条消耗 16 个 K
    for k_mma in range(Bk / 16):

      # 1) ldmatrix 把 A 片段从 shm 装到寄存器
      #    A 片段：16 x 16，使用 ldmatrix.x4
      #    - lanes  0.. 7 -> 矩阵 0 (A[0: 8][0: 8])
      #    - lanes  8..15 -> 矩阵 1 (A[8:16][0: 8])
      #    - lanes 16..23 -> 矩阵 2 (A[0: 8][8:16])
      #    - lanes 24..31 -> 矩阵 3 (A[8:16][8:16])
      #    统一写法：行 = lane % 16，列 = (lane / 16) * 8

      # 4 个 .f16x2 寄存器 = 8 个 fp16
      uint32_t a[4]
      addr_a = &shm_A[cur][tile_m*16 + (lane % 16)][k_mma*16 + (lane / 16) * 8]

      ldmatrix.sync.aligned.m8n8.x4.shared.b16 {a0,a1,a2,a3}, [addr_a]
      # 此时每个线程拿到：
      #   a0 = A[group_id    ][2*lane_in_group    ], A[group_id    ][2*lane_in_group + 1]
      #   a1 = A[group_id + 8][2*lane_in_group    ], A[group_id + 8][2*lane_in_group + 1]
      #   a2 = A[group_id    ][2*lane_in_group + 8], A[group_id    ][2*lane_in_group + 9]
      #   a3 = A[group_id + 8][2*lane_in_group + 8], A[group_id + 8][2*lane_in_group + 9]
      # 2) ldmatrix 把 B 片段从 shm 装到寄存器
      #    B 片段：16 x 8，使用 ldmatrix.x2.trans
      #    - lanes 0..7  -> 矩阵 0 (B[0:8][0:8])
      #    - lanes 8..15 -> 矩阵 1 (B[8:16][0:8])
      #    其余 lane 不提供地址

      # 2 个 .f16x2 寄存器 = 4 个 fp16
      uint32_t b[2]
      addr_b = &shm_B[cur][k_mma*16 + lane][tile_n*8] if lane < 16 else 0

      ldmatrix.sync.aligned.m8n8.x2.trans.shared.b16 {b0,b1}, [addr_b]
      # 此时每个线程拿到：
      #   b0 = B[2*lane_in_group    ][group_id], B[2*lane_in_group + 1][group_id]
      #   b1 = B[2*lane_in_group + 8][group_id], B[2*lane_in_group + 9][group_id]

      # 3) mma.m16n8k16
      mma.sync.aligned.m16n8k16.row.col.f32.f16.f16.f32
          {acc0, acc1, acc2, acc3},
          {a0, a1, a2, a3},
          {b0, b1},
          {acc0, acc1, acc2, acc3}

    # 4) 写回本 tile
    # 每个线程的 4 个 fp32 对应 C 中位置：
    #   acc0 -> C[tile_m*16 + group_id    ][tile_n*8 + 2*lane_in_group    ]
    #   acc1 -> C[tile_m*16 + group_id    ][tile_n*8 + 2*lane_in_group + 1]
    #   acc2 -> C[tile_m*16 + group_id + 8][tile_n*8 + 2*lane_in_group    ]
    #   acc3 -> C[tile_m*16 + group_id + 8][tile_n*8 + 2*lane_in_group + 1]
    C[row_block + tile_m*16 + group_id    ][col_block + tile_n*8 + 2*lane_in_group    ] = acc0
    C[row_block + tile_m*16 + group_id    ][col_block + tile_n*8 + 2*lane_in_group + 1] = acc1
    C[row_block + tile_m*16 + group_id + 8][col_block + tile_n*8 + 2*lane_in_group    ] = acc2
    C[row_block + tile_m*16 + group_id + 8][col_block + tile_n*8 + 2*lane_in_group + 1] = acc3

    # 本 tile 算完，清零累加器准备下一个 tile
    acc0 = acc1 = acc2 = acc3 = 0
```

# FlashAttention

对于 FlashAttention（FA）来说，上述的两个主要原理构成了整个主体。

- 分块
- 异步加载
- 张量运算
- 增量运算

除了有关 softmax 的细节还未讲述，有了以上的基础，接下来对于 FA 的内容也会相对轻松。FlashAttention 经历过一定的优化，接下来以 FA2 也即 FlashAttention-2 为实现目标。

先从 MHA 开始考虑，一个 MHA 涉及 QKV 三个矩阵的操作，FlashAttention 的目的是使用矩阵分块，完成读 QKV 写输出矩阵 O 的操作。这个过程里，由于 QKVO 四个矩阵都相对较大，而 Shared Memory 大小有限。因此，有的矩阵可以放到 Shared Memory 里，或者让硬件驻留到 L2 里，有的还需要放在 Global Memory 中。

这就涉及到谁在外，谁在内的问题了。对于 FlashAttention 1，设计的时候是 K 和 V 驻留在近计算侧，而 Q 和 O 每次都需要与 Global Memory 交互读写。不过，通过对与 MHA 的了解，可以知道 QKV 三个矩阵是只读数据，而 O 矩阵是写回到 Global Memory。因此，Flash Attention 2 交换了角色，让 KV 在 Global Memory 里供读取计算，QO 矩阵放在近计算侧读写。由于整个流程里，O 只有最后写进 Global Memory 里，因此减少了对 Global Memory 的写操作。FA2 还有其他优秀的优化，这里先不细节描述。

确定了 KV 在 Global Memory，QO 常驻 Shared Memory 和 Register Files 以后，就可以开始设计实际流程。仓库地址：https://github.com/bLueriVerLHR/flash-attn-demo

## 验证与测试

我们先设计 Profile 和 Verification 过程，这个过程我们使用 Python 和 pybind11 完成。

```python
if __name__ == "__main__":
    for B, L, D, H in config:
        q, k, v = build_qkv(B, L, D)
        q: torch.Tensor = q.reshape(B, L, H, -1)
        k: torch.Tensor = k.reshape(B, L, H, -1)
        v: torch.Tensor = v.reshape(B, L, H, -1)

        a = torch_attn(q, k, v)
        b = flash_attn(q, k, v)
        c = flash_attn_demo_wrapper(q, k, v)

        torch.testing.assert_close(c, b, atol=1e-2, rtol=1e-2)
```

由于 torch 版本的 MHA 可能超出显存空间，因此并不是首选的基准。做 Profiling 基本使用 ncu 完成，观察其中的性能指标满足情况。对于使用 Python 做端到端时间的测量，可以写装饰器修饰函数。

## 全局常量

为了能够让编译器尽可能地为特定配置的数据做更激进的优化，我关注的教程基本都会使用很多的宏、常量表达式和模板，将大部分任务推到编译期运算。这使得在代码编写的时候，很难观察出错误，LSP 也可能无法给出实时的提示，需要多加注意。

首先是几个基本常量：

```cpp
// common
constexpr int kBr = 64;
constexpr int kBc = 64;
constexpr int kHeadDim = 128;
constexpr size_t kSharedMemorySize = (kBr + 2 * kBc) * kHeadDim * sizeof(half);

// arch
constexpr int kMmaM = 16;
constexpr int kMmaN = 8;
constexpr int kMmaK = 16;

constexpr int kLdMatrixRow = 8;
constexpr int kLdMatrixCol = 8;
constexpr int kCpAsyncLen = 16;
constexpr int kElemPerCpAsync = kCpAsyncLen / sizeof(half);

constexpr int kWarpSize = 32;
constexpr int kNumberOfWarps = 4;
constexpr int kNumberOfThreads = kWarpSize * kNumberOfWarps;
```

这里解释一下，这些配置工程设计上应该通过一些模板编程技巧变得可操控可选，这里为了方便，用全局常量确定。

首先，是用户自定义的分块 Br、Bc 和 HeadDim。分别是行分块、列分块和 MHA 的头的维度，也即 d_head。这里选择 128 维，在 Shared Memory 大小的控制上比较优秀，QKV 三个矩阵放到 Shared Memory 里可以计算出 SharedMemorySize 是 48KB，对于我使用的 Ampere 架构 GPU 来说很契合，可以放下更多 CTA 同时运算。

其次，MMA 矩阵乘累加操作选择 m16n8k16 操作为基础；`ldmatrix` 操作的行列均为 8 个元素；`cp.async` 一次搬运 16 个字节，一共 8 个 f16 元素。

最后，使用 4 组 Warp 一共 128 个线程。

## PTX 操作封装

这一步比较枯燥，就是按照手册，将元素一一对应，写成可调用的函数。一些常数可以用模板参数传入做到自定义，然后用宏定义统一的函数前缀：

```cpp
#define DEVICE_FUNC __device__ __forceinline__

template <int Len, typename value_t>
DEVICE_FUNC void CpAsync(value_t* sdst, const value_t* gsrc) {
    uint32_t p = __cvta_generic_to_shared(sdst);
    asm volatile (
        "cp.async.cg.shared.global [%0], [%1], %2;"
        :: "r"(p), "l"(gsrc), "n"(Len)
    );
}

DEVICE_FUNC void CpAsyncCommit() {
    asm volatile ("cp.async.commit_group;");
}

template <int ngroups>
DEVICE_FUNC void CpAsyncWait() {
    asm volatile (
        "cp.async.wait_group %0;"
        :: "n"(ngroups)
    );
}

template <bool IsTranspose = false, typename value_t = void>
DEVICE_FUNC void LdMatrixX4(
    value_t* ssrc,
    uint32_t &a1,
    uint32_t &a2,
    uint32_t &a3,
    uint32_t &a4
) {
    uint32_t p = __cvta_generic_to_shared(ssrc);
    if constexpr (IsTranspose) {
        asm volatile (
            "ldmatrix.sync.aligned.m8n8.x4.shared.b16.trans"
            "{%0,%1,%2,%3}, [%4];"
            : "=r"(a1), "=r"(a2), "=r"(a3), "=r"(a4)
            : "r"(p)
        );
    } else {
        asm volatile (
            "ldmatrix.sync.aligned.m8n8.x4.shared.b16"
            "{%0,%1,%2,%3}, [%4];"
            : "=r"(a1), "=r"(a2), "=r"(a3), "=r"(a4)
            : "r"(p)
        );
    }
}

template <bool IsTranspose = false, typename value_t = void>
DEVICE_FUNC void LdMatrixX2(
    value_t* ssrc,
    uint32_t &a1,
    uint32_t &a2
) {
    uint32_t p = __cvta_generic_to_shared(ssrc);
    if constexpr (IsTranspose) {
        asm volatile (
            "ldmatrix.sync.aligned.m8n8.x2.shared.b16.trans"
            "{%0,%1}, [%2];"
            : "=r"(a1), "=r"(a2)
            : "r"(p)
        );
    } else {
        asm volatile (
            "ldmatrix.sync.aligned.m8n8.x2.shared.b16"
            "{%0,%1}, [%2];"
            : "=r"(a1), "=r"(a2)
            : "r"(p)
        );
    }
}

template <typename value_t>
DEVICE_FUNC void MmaM16N8K16F32Accm(
    float &d1, float &d2, float &d3, float &d4,
 
    uint32_t const &a1, uint32_t const &a2,
    uint32_t const &a3, uint32_t const &a4,
 
    uint32_t const &b1, uint32_t const &b2,
 
    float const &c1, float const &c2,
    float const &c3, float const &c4
) {
    if constexpr (std::is_same_v<value_t, nv_bfloat16>) {
        asm volatile("mma.sync.aligned.m16n8k16.row.col.f32.bf16.bf16.f32 "
                     " { %0, %1, %2, %3 }, "
                     " { %4, %5, %6, %7 }, "
                     " { %8, %9 }, "
                     " { %10, %11, %12, %13 }; "
                     : "=f"(d1), "=f"(d2), "=f"(d3), "=f"(d4)
                     : "r"(a1), "r"(a2), "r"(a3), "r"(a4), "r"(b1), "r"(b2),
                       "f"(c1), "f"(c2), "f"(c3), "f"(c4));
    } else {
        asm volatile("mma.sync.aligned.m16n8k16.row.col.f32.f16.f16.f32 "
                     " { %0, %1, %2, %3 }, "
                     " { %4, %5, %6, %7 }, "
                     " { %8, %9 }, "
                     " { %10, %11, %12, %13 }; "
                     : "=f"(d1), "=f"(d2), "=f"(d3), "=f"(d4)
                     : "r"(a1), "r"(a2), "r"(a3), "r"(a4), "r"(b1), "r"(b2),
                       "f"(c1), "f"(c2), "f"(c3), "f"(c4));
    }
}
```

其中，函数 `__cvta_generic_to_shared` 可以将指针转换成 32 位，将一个指针映射到对应设备上的局部地址空间里，Shared Memory 空间很小 32 位指针足够且计算速度更快，也减少索引时的指针转换开销，可以参考 CUDA 手册。`cp.async` 的后缀有不同的效果，这里使用的 `.cg` 是指 Cache at global level，会跳过 L1 缓存，从 L2 缓存直接加载到 Shared Memory 里以减少对缓存的污染；后缀 `.ca` 指 Cache at all levels 则是不会跳过 L1 缓存。

`cp.async.cg` 操作一次固定处理 16 个字节的数据，也就是 8 个 f16 元素。

## 粗划分和索引参数设置

编写核函数重点是划分好要处理的矩阵到底是什么样的，从一个巨大的矩阵，一步一步走到需要处理的小矩阵。

先从如何安排维度入手，我们可以从 MHA 了解到，如果确定了处在 Batch 里的位置、处在哪一个注意力头上，这上面的所有 Q 和 O 操作就共享同一套 K 和 V。甚至对于 GQA 和 MQA 而言，这种共享更多。因此，我们会按照 PyTorch 示例里的那样，在逻辑上将 `batch_idx` 和 `head_idx` 先固定。

```cpp
dim3 grid(q_seq_len / kBr, q_n_heads, batch_size);
...
const int batch_idx = blockIdx.z;
const int head_idx  = blockIdx.y;
const int q_seq_blk = blockIdx.x;
```

在这里，我们对 Q 在特定 `batch_idx` 和 `head_idx` 下的 `seq_len` 按照 Bc 进行分块，这样在连续分配 CTA 的时候，相邻 CTA 处理同一个 `batch_idx` 和 `head_idx` 下的不同 Q 的分块。进入核函数后，Q 分块的布局就确定了，也就是 `(Br, HeadDim)`。

接下来，确定一下其余参数，这里我设计的时候考虑到支持 GQA 因此会有如下的参数设置：

```cpp
torch::Tensor FlashAttnDemoWrapper(
    torch::Tensor Q, torch::Tensor K, torch::Tensor V
) {
    Q = Q.contiguous();
    K = K.contiguous();
    V = V.contiguous();
    torch::Tensor O = torch::zeros_like(Q); // output tensor
    ...

    args.q = Q.data_ptr();
    args.k = K.data_ptr();
    args.v = V.data_ptr();
    args.o = O.data_ptr();

    args.q_batch_stride  = Q.stride(-4);
    args.q_seq_stride    = Q.stride(-3);
    args.q_head_stride   = Q.stride(-2);
    args.q_seq_len       = Q.size(-3);
    args.q_n_heads       = Q.size(-2);

    args.kv_batch_stride = K.stride(-4);
    args.kv_seq_stride   = K.stride(-3);
    args.kv_head_stride  = K.stride(-2);
    args.kv_seq_len      = K.size(-3);
    args.kv_n_heads      = K.size(-2);
    ...
}
```

基本布局和最初的 PyTorch 示例是一样的，在这里没有做任何维度交换，而是在接下来的计算里，使用 Stride 计算偏移量以做到维度交换。`args` 不做特别的要求，这里是一个结构体存储所有的参数，然后整体传递给最后的核函数使用。

然后，当前述数据设置完后，设置 `dim3 block(kNumberOfThreads)` 为启动参数，每个 CTA 按照之前的常量计算有 4 组 Warp。终于，我们可以进入核函数的整体以逐步解决剩下的计算了。

## 确定核函数的局部常数

进入核函数后，首先确定当前线程的位置，结合之前所描述的对 CTA 的分配，可以用如下方式计算：

```cpp
const int batch_idx = blockIdx.z;
const int head_idx  = blockIdx.y;
const int q_seq_blk = blockIdx.x;

const int tid = threadIdx.x;
const int lid = tid % 32;
const int wid = tid / 32;
```

上述的 `tid`、`lid`、`wid` 分别为线程标识、lane 标识、warp 标识，用于区别在 CTA 中的位置、在 Warp 中的位置、Warp 在 CTA 中的位置。使用的求模和除法运算，在需要的情况下可以用无符号数和位操作进一步削减指令数量，一般编译器优化能力也可以完成一定的强度削减。

无符号数，适用于正整数，可以减少很多有符号数带来的额外指令开销。在强度削减里，由于有符号的语义包含负数情况，乘法、除法和求模运算能做的指令削减有限。例如如下两个函数：

```cpp
unsigned fn_unsigned(unsigned a, unsigned b) {
    const unsigned c = a % 32;
    const unsigned d = b / 32;
    return c + d;
}

int fn_signed(int a, int b) {
    const int c = a % 32;
    const int d = b / 32;
    return c + d;
}
```

GCC 在 O3 优化下，强度削减结果如下：

```asm
"fn_unsigned(unsigned int, unsigned int)":
        and     edi, 31
        shr     esi, 5
        lea     eax, [rdi+rsi]
        ret

"fn_signed(int, int)":
        mov     eax, edi
        sar     eax, 31
        shr     eax, 27
        add     edi, eax
        and     edi, 31
        sub     edi, eax
        test    esi, esi
        lea     eax, [rsi+31]
        cmovns  eax, esi
        sar     eax, 5
        add     eax, edi
        ret
```

可以直观地看出两个函数的指令数量有明显的不同，这是有符号数语义带来的不可优化开销。因此追求极致优化的情况下，手动写强度削减或者使用无符号数都是可以使用更少指令的办法。

在确定好当前线程处在 CTA 的何处后，就可以开始选择处理哪些数据块了。这里我们要求出比较多的数值：

```cpp
const int qheads_per_kv = args.q_n_heads / args.kv_n_heads;
const int kv_head_idx = head_idx / qheads_per_kv;

const int batch_head_q_offset = batch_idx * args.q_batch_stride + head_idx * args.q_head_stride;
const int batch_head_kv_offset = batch_idx * args.kv_batch_stride + kv_head_idx * args.kv_head_stride;

const int qo_gmem_block_offset = batch_head_q_offset + q_seq_blk * kBr * args.q_seq_stride;
const int kv_gmem_block_offset = batch_head_kv_offset;

const int num_kv_blk = args.kv_seq_len / kBc;
```

为了解释这里的计算，我们需要先做一定的假设。这里没有对不规则形状的数据做兼容，因此要求部分除法不会产生余数。

先计算每个 KV 对应多少个 Q 头，一般是多个 Q 头对应一个 KV 头，所以 `q_n_heads` 是 `kv_n_heads` 的倍数。按照前面所述，`head_idx` 是 Q 头的索引，因此 `kv_head_idx` 就能算出对应的 KV 头的索引。

接下来计算偏移量，先计算批次内的偏移和头偏移，头偏移需要使用对应的头索引。然后和对应的 Stride 相乘，就可以定位总偏移。这里我们确定了该线程处理的 QKV 头在全局内存里的偏移。

基于上述的偏移，我们进一步索引到该线程需要处理的 QKV 分块的偏移。因为 QO 分块的处理需要所有对应 KV 分块的参与，所以 QO 需要用 `q_seq_blk * kBr * args.q_seq_stride` 进一步索引到按照 Br 进行分块后需要处理的开头位置，而 KV 不需要继续计算偏移量。

最后，我们计算使用 Bc 对 KV 分块后，需要处理多少对 KV 分块，也即 `num_kv_blk`。

## 模板和地址

我们要确定处理的数据的类型和地址，地址需要按照类型计算偏移量。因此，这两个部分放一起说明。对于类型，使用模板适配 `template <typename value_t, typename accum_t = float>` 推导。由于使用的张量核心操作进行的是混合精度运算，所以这里使用两个类型，后者默认是 float。

其次是记录地址：

```cpp
struct {
    value_t* const q;
    value_t* const k;
    value_t* const v;
    value_t* const o;
} gmem {
    reinterpret_cast<value_t*>(args.q) + qo_gmem_block_offset,
    reinterpret_cast<value_t*>(args.k) + kv_gmem_block_offset,
    reinterpret_cast<value_t*>(args.v) + kv_gmem_block_offset,
    reinterpret_cast<value_t*>(args.o) + qo_gmem_block_offset
};

extern __shared__ __align__(16) char shm[];
struct {
    value_t* const q;
    value_t* const k;
    value_t* const v;
    value_t* const o;
} smem {
    reinterpret_cast<value_t*>(shm),
    reinterpret_cast<value_t*>(shm + kBr * kHeadDim * sizeof(value_t)),
    reinterpret_cast<value_t*>(shm + (kBr + kBc) * kHeadDim * sizeof(value_t)),
    reinterpret_cast<value_t*>(shm)
};
```

Global Memory 里的地址就是前述计算出的索引和传入参数的求和，再用 `reinterpret_cast` 重新解释地址上的数据格式。Shared Memory 则是进行一定的划分，需要一点知识。

回到 PyTorch 实现里，我们发现 K 和 V 计算时刻不一样，先算 QK 得到 S，经过 softmax 结果 P 后计算 PV。这个过程里，KV 没有同时被使用过。这意味着我们可以异步加载另一个数据，以互相隐藏加载延迟。

其次，Q 和 O 的位置之所以设定一致，是因为这两个元素也不会发生同时使用的情况。我们读取 Q，完成多轮与 KV 的运算，最后写进 O。写进 O 的时候，Q 就已经没用了，因此可以写进 Shared Memory 里给 Q 预留的位置，然后通过不同架构里，可能给出的高效 Shared Memory 到 Global Memory 操作做进一步的数据传输优化。

总的来说，Shared Memory 里，Q 分配 `(Br, HeadDim)` 大小区域，K 和 V 分别分配和 `(Bc, HeadDim)` 一样大小的区域，索引方式会有区别。

## 预加载第一组数据

到这一步，我们已经确定了 Global Memory 里数据的位置和 Shared Memory 里怎么安排数据。接下来就可以开始异步加载第一个操作需要的数据，并在正式开始 MMA 之前做其他工作以掩盖存取延迟。

首先，我们预取 Q 块，这一个块在整个循环中都会被使用，它的形状为 `(Br, HeadDim)`，从 Global Memory 到 Shared Memory 使用 `CyAsync<16>` 搬运数据，每轮搬运 8 个元素，我们让同一个 CTA 里的 4 个 Warp 同时进行搬运，可以搬运 8x4x32=1024 个元素。因此，循环为：

```cpp
do /* prefetch Q block */ {
    #pragma unroll
    for (int i = 0; i < kBr * kHeadDim / (kElemPerCpAsync * kNumberOfThreads); ++i) {
        ...
    }
    CpAsyncCommit();
} while (0);
```

我这里用 `do {} while (0)` 包裹以使用 i 这种脚标，避免污染全局。继续深入到循环内部，每轮循环中，CTA 里的所有线程都会搬运一次，然后再搬运下一组。因此：

每个线程对应的逻辑线程索引是 `tid + i * kNumberOfThreads`。

每轮循环里，在 HeadDim 维度上，搬运完数据需要 `kHeadDim / kElemPerCpAsync` 个线程。

通过上述两个运算，我们可以摸清，在 `(Br, HeadDim)` 形状里，每个线程所对应的逻辑线程索引和每一行数据需要的线程数量。解释一下逻辑线程索引，在一个 CTA 里，不会只处理一组数据。我们将这个 CTA 处理不同数据时候的总线程数给出，例如每行需要 3 个线程处理，一共处理 4 组数据会有：

```text
0  1  2
3  4  5
6  7  8
9 10 11
```

一共需要 12 个线程。这里只分配 3 个线程处理的话，这些逻辑上需要的 12 个线程就需要分配给 3 个物理线程完成。每行处理不同数据，将第一列的元素映射到第一个线程上，第二列第二个，以此类推。最后这一组数据串行四次被完成，总共使用了 3 个物理线程。

我们按照这个逻辑，将 `(Br, HeadDim)`，分配到 `kNumberOfThreads` 上处理时，就会用逻辑线程索引 `idx` 和每行需要 `kThreadPerRow` 个线程做运算计算出 `(row, col)`。

```cpp
const int idx = tid + i * kNumberOfThreads;
constexpr int kThreadPerRow = kHeadDim / kElemPerCpAsync;
const int row = idx / kThreadPerRow;
const int col = idx % kThreadPerRow * kElemPerCpAsync;
```

这样就确定了，每轮复制里，当前线程对应的逻辑线程，然后用这个逻辑线程索引，我们计算出元素所在的位置：

```cpp
CpAsync<kBytePerVec4Access>(
    smem.q + row * kHeadDim + col,
    gmem.q + row * args.q_seq_stride + col
);
```

可以看出，Shared Memory 使用的 Stride 是 `kHeadDim`，而 Global Memory 使用的 Stride 是传入的参数。这是因为在 Shared Memory 里布局是 `(Br, HeadDim)`，而 Global Memory 是 `(batch_size, seq_len, n_heads, d_head)`，Br 是对 seq_len 的切分，HeadDim 就是 d_head。因此，使用的 Stride 步长本质不同。

为了解决前述的 Bank Conflict，这里我们会做一点 Swizzling，最后得到：

```cpp
do /* prefetch Q block */ {
    #pragma unroll
    for (int i = 0; i < kBr * kHeadDim / (kElemPerCpAsync * kNumberOfThreads); ++i) {
        const int idx = tid + i * kNumberOfThreads;
        constexpr int kThreadPerRow = kHeadDim / kElemPerCpAsync;
        const int row = idx / kThreadPerRow;
        const int col = idx % kThreadPerRow * kElemPerCpAsync;
        const int smem_col = SwizzledCol(row, col);
        CpAsync<kCpAsyncLen>(
            smem.q + row * kHeadDim + smem_col,
            gmem.q + row * args.q_seq_stride + col
        );
    }
    CpAsyncCommit();
} while (0);
```

K 的分块也以类似的方式完成，不过我们目前不做转置，还是 `(Bc, HeadDIm)` 布局：

```cpp
do /* prefetch first K block */ {
    #pragma unroll
    for (int i = 0; i < kBc * kHeadDim / (kElemPerCpAsync * kNumberOfThreads); ++i) {
        const int idx = tid + i * kNumberOfThreads;
        constexpr int kThreadPerRow = kHeadDim / kElemPerCpAsync;
        const int row = idx / kThreadPerRow;
        const int col = idx % kThreadPerRow * kElemPerCpAsync;
        const int smem_col = SwizzledCol(row, col);
        CpAsync<kCpAsyncLen>(
            smem.k + row * kHeadDim + smem_col,
            gmem.k + row * args.kv_seq_stride + col
        );
    }
    CpAsyncCommit();
} while (0);
```

## Swizzling

预取的时候，我们使用了 Swizzling 函数，这个函数的设计源于 Sonny's Blog，如下：

```cpp
// Map a logical element column to a physical shared-memory element column.
// Specialized for the current 16-bit, 16-byte-vector shared-memory layout.
DEVICE_CONSTEXPR index_t
SwizzledCol(index_t row, index_t col) {
    // Each vector contains 8 FP16 elements and occupies 16 bytes.
    constexpr index_t kSwizzleVectorElems = kElemsPerCpAsync;

    // The vector permutation repeats every 8 rows.
    constexpr index_t kSwizzleRowPeriod = kLdMatrixSize;

    // Each column region contains 8 vectors:
    // 64 FP16 elements, or 128 bytes.
    constexpr index_t kSwizzleVectorsPerRegion = kSwizzleRowPeriod;
    constexpr index_t kSwizzleRegionElems = kSwizzleVectorsPerRegion * kSwizzleVectorElems;

    // Guard the assumptions of this specialized layout.
    static_assert(kSwizzleVectorElems == 8);
    static_assert(kSwizzleRowPeriod == 8);
    static_assert(kHeadDim % kSwizzleRegionElems == 0);

    // Locate the column region.
    const index_t region_idx = col / kSwizzleRegionElems;
    const index_t col_in_region = col % kSwizzleRegionElems;

    // Locate the vector and preserve the element offset within it.
    const index_t vector_idx = col_in_region / kSwizzleVectorElems;
    const index_t elem_in_vector = col_in_region % kSwizzleVectorElems;

    // Permute vectors within the region according to the row.
    const index_t row_xor_mask = row % kSwizzleRowPeriod;
    const index_t swizzled_vector_idx = vector_idx ^ row_xor_mask;

    // Reconstruct the physical shared-memory column.
    const index_t region_start_col = region_idx * kSwizzleRegionElems;
    const index_t swizzled_col_in_region = swizzled_vector_idx * kSwizzleVectorElems + elem_in_vector;

    return region_start_col + swizzled_col_in_region;
}
```

解决 Bank Conflict 能带来极大的访存提升。

## Online Softmax 初始化

接下来，我们做一点 Online Softmax 的初始化，按照前述内容，我们要保存一个求和和一个最大值，这里：

```cpp
accum_t o_acc[kHeadDim / kMmaN][4];
FillZeros2D(o_acc);

accum_t m_row[2] = {-INFINITY, -INFINITY};
accum_t l_row[2] = {0.f, 0.f};
```

首先是最终结果 O，其布局为 `(Br, HeadDim)`，不过因为其为 MMA 的结果，因此这个矩阵被分配到 Warp 中的不同线程里的寄存器里。使用张量核心的 MMA 操作最终结果是 f32 类型，也就是 `accum_t`。按照前述内容，每个 m16n8k16 算出一个 16x8 的 f32 矩阵结果。Warp 内的每一个线程存储 4 个 f32 元素，也就是这里的 4。笼统点，就是 `kMmaM * kMmaN / kWarpSize`。

然后，一个 CTA 一共 4 个 Warp，处理一个 Q 分块 `(Br, HeadDim)`。每个 Warp 写入 `(Br, HeadDim)` 的四分之一。因为是行主序，我们处理连续的元素布局会是 `(Br/4, HeadDim)`。然后将这个矩阵继续切分成 m16n8k16 的格式，其中行方向上每 16 行一组，列方向上，每 8 列一组。总共，每个线程存 `(kBr/kNumberOfWarps/kMmaM, kHeadDim/kMmaN)` 布局个 4 元素。我们在做到划分到这一步的时候，`kBr/kNumberOfWarps/kMmaM` 值是 1，因此这里忽略掉。如果不为 1，我们放后面加一笔描述。

其次，维护最大值使用 `m_row`，维护求和使用 `l_row`。由于，在每个线程中，使用的 4 个 O 元素里，每两个元素一组，属于同一行，组之间属于不同行。由于上述计算得到 `kBr/kNumberOfWarps/kMmaM` 值是 1，意味着在这行的 MMA 里，两组元素分别对应的行不变。只需要维护 2 个最大值和求和值，就能对应这 4 个元素的需求。

详细算法，到 Online Softmax 执行的时候讲述。

如果 `kBr/kNumberOfWarps/kMmaM` 不是 1。那么就需要一个线程组对应多行的 MMA 操作，我们设 `kBr/kNumberOfWarps/kMmaM` 为 `kOFragments`，需要的 `o_acc`、`m_row` 和 `l_row` 布局就是 `(kOFragments, kHeadDim/kMmaN, 4)` 和 `(kOFragments, 2)`。

## 进入循环和循环开始阶段

接下来对于循环里的每一个 KV 分块做运算，我们先收集预取元素，或者对应的收集上一轮循环还在执行的异步读取的 K 块。开头大概如下：

```cpp
for (int ikv = 0; ikv < num_kv_blk; ++ikv) {
    CpAsyncWait<0>();
    __syncthreads();
    ...
}
```

这个时候，我们计算 QK 的需要的数据就满足了，可以开始预取 V 块，隐藏其存取延迟：

```cpp
do /* fetch current V */ {
    #pragma unroll
    for (int i = 0; i < (kBc * kHeadDim) / (kElemPerCpAsync * kNumberOfThreads); ++i) {
        const int idx = tid + i * kNumberOfThreads;
        constexpr int kThreadPerRow = kHeadDim / kElemPerCpAsync;
        const int row = idx / kThreadPerRow;
        const int col = idx % kThreadPerRow * kElemPerCpAsync;
        const int smem_col = SwizzledCol(row, col);
        CpAsync<16>(
            smem.v + row * kHeadDim + smem_col,
            gmem.v + (ikv * kBc + row) * args.kv_seq_stride + col
        );
    }
    CpAsyncCommit();
} while (0);
```

然后初始化 S 矩阵的数值：

```cpp
// score = Q @ K
float s_acc[kHeadDim / kMmaN][4];
FillZeros2D(s_acc);
```

## MMA 操作 S = Q @ K

我们先划分职责：

```cpp
#pragma unroll
for (int i = 0; i < kHeadDim / kMmaK; ++i) {
    uint32_t a[4];
    do /* load matrix Q */ {
        ...
    } while (0);
    #pragma unroll
    for (int j = 0; j < kBc / kMmaN; ++j) {
        uint32_t b[2];
        do /* load matrix K */ {
            ...
        } while (0);
        MmaM16N8K16F32Accm<value_t>(
            s_acc[j][0], s_acc[j][1], s_acc[j][2], s_acc[j][3],
            a[0], a[1], a[2], a[3],
            b[0], b[1],
            s_acc[j][0], s_acc[j][1], s_acc[j][2], s_acc[j][3]
        );
    }
}
```

接下来，Q 分块每次存取一个 16x16 矩阵，也就是 `ldmatrix.m8n8.x4`，做如下读取：

```cpp
uint32_t a[4];
do /* load matrix Q */ {
    const int row = lid % 16 + wid * 16;
    const int col = i * 16 + lid / 16 * 8;
    const int smem_col = SwizzledCol(row, col);
    LdMatrixX4(smem.q + row * kHeadDim + smem_col, a[0], a[1], a[2], a[3]);
} while (0);
```

每个子矩阵的地址，按照列主序，分配给 Thread 0-31。

一个 Warp 内，row 以 16 为循环，结果就是 `lid % 16`，其中 `lid` 在这里指 `lane_id`。不同 Warp 处理不同的分块，我们一开始将 Br 个行分成 `kNumberOfWarps` 分，每份分给不同的 Warp，这里用 `wid * 16` 跳到下一个 Warp 对应的 row。

一个 Warp 内，col 以 16 为一组，每组 8 个元素。以 `lid / 16 * 8` 得到对应的列组起始地址。每个线程组处理自己这一行，因此列随着 i 按 16 个元素为步递增前进。

最后增加 Swizzling，做地址计算，完成 Shared Memory 到 Register Files 的加载。

下一层循环内，需要加载 K 块：

```cpp
uint32_t b[2];
do /* load matrix K */ {
    const int h   = lid % 16;
    const int row = j * 8  + h % 8;
    const int col = i * 16 + h / 8 * 8;
    const int smem_col = SwizzledCol(row, col);
    LdMatrixX2(smem.k + row * kHeadDim + smem_col, b[0], b[1]);
} while (0);
```

K 块的布局是 `(Bc, HeadDim)`，我们在进行张量操作的时候，设置了 `.row.col`，也就是第一个矩阵按照行主序、第二个矩阵按照列主序。我们做的这个加载的时候，K 的分块还是行主序，也就是 K^T 的列主序，也就不需要再让 `ldmatrix` 转置了。按照 `ldmatrix.m8n8.x2` 的布局，前 16 个 Warp 内线程给出地址，然后全部 32 个线程参与完成数据加载。

完成全部的 S = Q @ K 以后，就可以加载完当前使用的 V 矩阵，开始加载下一组使用的 K 矩阵。

```cpp
CpAsyncWait<0>();
__syncthreads();
if (ikv + 1 < num_kv_blk) /* prefetch overlapped by computation */ {
    #pragma unroll
    for (int i = 0; i < (kBc * kHeadDim) / (kElemPerCpAsync * kNumberOfThreads); ++i) {
        const int idx = tid + i * kNumberOfThreads;
        constexpr int kThreadPerRow = kHeadDim / kElemPerCpAsync;
        const int row = idx / kThreadPerRow;
        const int col = idx % kThreadPerRow * kElemPerCpAsync;
        const int smem_col = SwizzledCol(row, col);
        CpAsync<16>(
            smem.k + row * kHeadDim + smem_col,
            gmem.k + ((ikv + 1) * kBc + row)* args.kv_seq_stride + col
        );
    }
    CpAsyncCommit();
}
```

## Scale 和 Online Softmax

为了防止梯度消失，需要做一点 Scale：

```cpp
// 可以放在多层循环外侧
const accum_t softmax_scale = rsqrt(static_cast<accum_t>(kHeadDim));
...
#pragma unroll
for (int i = 0; i < kBc / kMmaN; i++) {
    s_acc[i][0] *= softmax_scale;
    s_acc[i][1] *= softmax_scale;
    s_acc[i][2] *= softmax_scale;
    s_acc[i][3] *= softmax_scale;
}
```

然后进行 Online Softmax

```cpp
do /* softmax */ {
    // update row max
    float row_max0 = -INFINITY, row_max1 = -INFINITY;
    #pragma unroll
    for (int i = 0; i < kBc / kMmaN; i++) {
        row_max0 = fmaxf(row_max0, fmaxf(s_acc[i][0], s_acc[i][1]));
        row_max1 = fmaxf(row_max1, fmaxf(s_acc[i][2], s_acc[i][3]));
    }
    row_max0 = WarpMax4(row_max0);
    row_max1 = WarpMax4(row_max1);
    const float m_new0 = fmaxf(m_row[0], row_max0);
    const float m_new1 = fmaxf(m_row[1], row_max1);
    // alpha factor
    const float alpha0 = __expf(m_row[0] - m_new0);
    const float alpha1 = __expf(m_row[1] - m_new1);
    m_row[0] = m_new0;
    m_row[1] = m_new1;
    // P = exp(S - m_new)
    float p_sum0 = 0.f, p_sum1 = 0.f;
    #pragma unroll
    for (int i = 0; i < kBc / kMmaN; i++) {
        s_acc[i][0] = __expf(s_acc[i][0] - m_new0);
        s_acc[i][1] = __expf(s_acc[i][1] - m_new0);
        s_acc[i][2] = __expf(s_acc[i][2] - m_new1);
        s_acc[i][3] = __expf(s_acc[i][3] - m_new1);
        p_sum0 += s_acc[i][0] + s_acc[i][1];
        p_sum1 += s_acc[i][2] + s_acc[i][3];
    }
    p_sum0 = WarpSum4(p_sum0);
    p_sum1 = WarpSum4(p_sum1);
    // update l by alpha and P
    l_row[0] = l_row[0] * alpha0 + p_sum0;
    l_row[1] = l_row[1] * alpha1 + p_sum1;
    // update o by alpha
    #pragma unroll
    for (int i = 0; i < kHeadDim / kMmaN; i++) {
        o_acc[i][0] *= alpha0;
        o_acc[i][1] *= alpha0;
        o_acc[i][2] *= alpha1;
        o_acc[i][3] *= alpha1;
    }
} while (0);
```

参照公式，流程为：

- 算出两个局部最大值
- 计算出修正因子 alpha
- 更新全局最大值

在所有的数据被处理完之前，全局最大值都不是全局的。我们知道一个矩阵整体按照张量核心的排布分配到了不同的线程中。所以，一组里的行局部最大值需要参考多个线程的结果才能确定。为了能够做到这种，Warp 内的线程间的消息传递，CUDA 提供了寄存器 Shuffle Sync 操作进行通信。

我们正在处理的数据是，16x8 的矩阵乘法结果，每行有 8 个元素，每个线程会自己拥有两个，可以本地完成一次比较，剩下 4 个值；每个线程可以和相邻线程配对交换，完成一次比较剩下两个值；每个配对之间再进行一次比较，最后得出最大值。这种 Pairwise 的操作可以大幅减少配对次数。这里我们使用两次 Shuffle 完成，具体代码如下：

```cpp
DEVICE_FUNC float
WarpMax4(float v) {
    v = fmaxf(v, __shfl_xor_sync(0xffffffffu, v, 1));
    v = fmaxf(v, __shfl_xor_sync(0xffffffffu, v, 2));
    return v;
}
```

这样的行为和 AllReduce 很像，接下来这样的 Pairwise 操作也会用到更新求和上：

```cpp
DEVICE_FUNC float
WarpSum4(float v) {
    v += __shfl_xor_sync(0xffffffffu, v, 1);
    v += __shfl_xor_sync(0xffffffffu, v, 2);
    return v;
}
```

最新的求和完成后，就可以通过修正因子和局部和，更新全局和，修正 O 的结果。

## 最终结果 O = P @ V

P 的包含的都是 f32 元素，将其打包以后，我们做剩下操作：

```cpp
#pragma unroll
for (int i = 0; i < kBc / kMmaK; i++) {
    uint32_t p_acc[4];
    p_acc[0] = PackHalf2(s_acc[2*i+0][0], s_acc[2*i+0][1]);
    p_acc[1] = PackHalf2(s_acc[2*i+0][2], s_acc[2*i+0][3]);
    p_acc[2] = PackHalf2(s_acc[2*i+1][0], s_acc[2*i+1][1]);
    p_acc[3] = PackHalf2(s_acc[2*i+1][2], s_acc[2*i+1][3]);
    
    #pragma unroll
    for (int j = 0; j < kHeadDim / kMmaN; ++j) {
        uint32_t b[2];
        do /* load matrix V */ {
            const int h   = lid & 15;
            const int row = i * 16 + h;
            const int col = j * 8;
            const int smem_col = SwizzledCol(row, col);
            LdMatrixX2<true>(smem.v + row * kHeadDim + smem_col, b[0], b[1]);
        } while (0);
        MmaM16N8K16F32Accm<value_t>(
            o_acc[j][0], o_acc[j][1], o_acc[j][2], o_acc[j][3],
            p_acc[0], p_acc[1], p_acc[2], p_acc[3],
            b[0], b[1],
            o_acc[j][0], o_acc[j][1], o_acc[j][2], o_acc[j][3]
        );
    }
}
```

在 `PackHalf2` 内部就是一个类型转换加位移操作：

```cpp
DEVICE_FUNC uint32_t
PackHalf2(float f1, float f2) {
    return __half_as_ushort(__float2half_rn(f1)) | (__half_as_ushort(__float2half_rn(f2)) << 16);
}
```

加载 V 分块的时候，此时分块是 `(Bc, HeadDim)`，我们需要这个形状的转置。`ldmatrix` 在这个时候就需要能够在加载的时候做转置了。

此时，循环走完后，求出来的 `o_acc` 是分子上的值。循环结束后，将 `o_acc` 累积的结果写入 O 中，我们需要和分母的求和做除法得到最后的结果值：

```cpp
// O = o_acc / l
const int o_row0 = wid * 16 + (lid >> 2);
const int o_row1 = o_row0 + 8;
#pragma unroll
for (int i = 0; i < kHeadDim / 8; i++) {
    const int col = i * 8 + (lid & 3) * 2;
    gmem.o[o_row0 * args.q_seq_stride + col + 0] = __float2half_rn(o_acc[i][0] / l_row[0]);
    gmem.o[o_row0 * args.q_seq_stride + col + 1] = __float2half_rn(o_acc[i][1] / l_row[0]);
    gmem.o[o_row1 * args.q_seq_stride + col + 0] = __float2half_rn(o_acc[i][2] / l_row[1]);
    gmem.o[o_row1 * args.q_seq_stride + col + 1] = __float2half_rn(o_acc[i][3] / l_row[1]);
}
```

## 后续优化

- 数据的写入不算高效，使用的是 RF -> GMEM 直接传输
- SMEM -> RF 的加载也可以分块
- 减少寄存器压力
- 模板化参数，使方便配置

## 总结

目前的实现，在 A5000 上仅做到了 Flash Attention 标准实现的 80% 的性能，还有更多的优化步骤需要进一步处理。不过对于 Softmax + Tile Matrix Multiplication 直接组合而言，已经相对完善。
