# 概述

<!-- TODO: 概述信息 -->

# 物理层

## 物理层的基本概念

物理层考虑的是怎样才能在连接各种计算机的传输媒体上传输数据比特流。（并不是指具体的传输媒体）

物理层的作用是要尽可能地屏蔽掉传输媒体和通信手段的差异，使得物理层上面的数据链路层感觉不到这些差异，这样就可以使得数据链路层只需要考虑如何完成本层的协议和服务。

用于物理层的协议也常称为物理层的 **规程（procedure）**。

> 其实物理层规程就是物理层协议。只是“协议”这个名词出现之前，人们就先使用了“规程”这一名词。

可以将物理层的主要任务描述为确定与传输媒体的接口有关的一些特性，也即：

1. 机械特性 - 指明接口所用接线器的形状和尺寸、引脚数目和排列、固定和锁定装置等。
2. 电气特性 - 指明在接口电缆的各条线上出现的电压的范围。
3. 功能特性 - 指明某条线上出现的某一电平的电压的意义。
4. 过程特性 - 指明对于不同功能的各种可能事件的出现顺序。

数据在通信线路（传输媒体）上的传输方式一般是 **串行传输**（出于经济上的考量），即逐个比特按照时间顺序传输。因此物理层还要完成传输方式的转换。

> 具体物理层协议种类较多。因为物理连接的方式很多（如点对点的、多点连接或广播连接），而传输媒体的种类也非常之多（如架空明线、双绞线、对称电缆、同轴电缆、光缆，以及各种波段的无线信道等。

## 数据通信的基础知识

### 数据通信系统的模型

一个数据通信系统可以划分成三大部分，即源系统（或发送端、发送方）、传输系统（或传输网络）和目的系统（或接收方、接收端）。

源系统一般包括一下两个部分：

- 源点（source） - 源点设备产生要传输的数据，例如从计算机的键盘输入文字，计算机产生输出的数字比特流。源点又称为 **源站**，或 **信源**。
- 发送器 - 通常源点生成的数字比特流要通过发送器编码后才能够在传输系统中进行传输。典型的发送器就是调制器。现在计算机使用内置的调制解调器（包括调制器和解调器），用户在计算机外部是看不到调制解调器的。

目前的系统一般也包括以下两个部分：

- 接收器 - 接收传输系统传过来的信号，并将其转换为能够被目的设备处理的信息。典型的接收器就是解调器，它把来自传输线路上的模拟信号进行解调，提取出在发送端置入的消息，还原出发送端产生的数字比特流。
- 终点（destination） - 终点设备从接收器获取传送来的数字比特流，然后把信息输出。终点又称为 **目的站**，或 **信宿**。

在源系统和目的系统之间的传输系统可以是简单的传输线，也可以是连接在源系统和目的系统之间的复杂网络系统。

接下来介绍一些常用术语：

通信的目的是传送 **消息**（message）。如话音、文字、图像、视频等都是消息。

**数据**（data）是运送消息的实体。根据 [RFC 4949](https://www.rfc-editor.org/pdfrfc/rfc4949.txt.pdf) 给出的定义，数据是使用特定方式表示的信息，通常是有意义的符号序列。这种信息表示可用计算机或其他机器（或人）处理或产生。

> rfc 4949 [Page 93]
> 
> $ data
> 
> (I) Information in a specific representation, usually as a
> sequence of symbols that have meaning.
> 
> Usage: Refers to both (a) representations that can be recognized,
> processed, or produced by a computer or other type of machine, and
> (b) representations that can be handled by a human.

信号（signal）则是数据的电气和电磁的表现。

根据信号中代表消息的参数的取值方式不同，信号可分为以下两大类：

1. 模拟信号，或连续信号 - 代表消息的参数的取值是连续的。如用户家中的调制解调器到电话端局之间的用户线上传送的就是模拟信号。
2. 数字信号，或离散信号 - 代表消息的参数的取值是离散的。如用户家中的计算机到调制解调器之间，或电话网中继线上传送的就是数字信号。

在使用时间域（或简称时域）的波形表示数字信号时，代表不同离散数值的基本波形就称为 **码元**。

> 一个码元所携带的信息量是不固定的，而是由调制方式和编码方式决定的。在使用二进制编码时，只有两种不同的码元，一种代表 0 状态，而另一种代表 1 状态。

### 有关信道的几个基本概念

**信道**（channel）和电路并不等同。信道一般都是用来表示向某一个方向传送信息的媒体。因此。一条通信电路往往包含一条发送信道和一条接收信道。

从通信双方的信息方式来看，可以由以下三种基本方式：

1. 单向通信 - 又称为单工通信，即只有一个方向的通信而没有反方向的交互。无线电广播或有线电广播以及电视广播就属于这种类型。
2. 双向交替通信 - 又称为半双工通信，即通信的双方都可以发送消息，但不能双方同时发送（当然也就不能同时接收）。这种通信方式是一方发送另一方接收，过一段事件后可以再反过来。比如对讲机。
3. 双向同时通信 - 又称为全双工通信，即通信的双方都可以同时发送和接收信息。

单向通信只需要一条信道，而双向通信或双向同时通信则都需要两条信道。显然，双向同时通信的传输效率最高。

> 有时人们也常用“单工”这个名词表示“双向交替通信”。如常说的“单工电台”，并不是只能进行单向通信。

来自信源的信号常称为 **基带信号**（即基本频带信号）。像计算机输出的代表各种文字或图像文件的数据信号都属于基带信号。

基带信号往往包含有较多的低频成分，甚至有直流成分，而许多信道并不能传输这种低频分量或直流分量。为解决这一个问题，就必须对基带信号进行 **调制**（modulation）。

调制可分为两大类。

一类是仅仅对基带信号的波形进行变换，使它能够与信道特性相适应。变换后的信号仍然是基带信号。这类调制称为基带调制。由于这种基带调制是把数字信号转换为另一种形式的数字信号，因此该过程也叫 **编码**（coding）。

另一类调制则需要使用 **载波**（carrier）进行调制，把基带信号的频率范围搬移到较高频段，并转换为模拟信号，这样就能更好地在模拟信道中传输。经过载波调制后的信号称为 **带通信号**（即仅在一段频率范围内能够通过信道），而使用载波的调制称为 **带通调制**。

**（1）常用编码方式**

- 不归零制 - 正电平代表 1，负电平代表 0。
- 归零制 - 正脉冲代表 1，负电平代表 0。
- 曼彻斯特编码 - 位周期中心的向上跳变代表 0，位周期中心的向下跳变代表 1。但也可以反过来定义。
- 差分曼彻斯特编码 - 在每一位的中心处始终都有跳变。位开始边界有跳变代表 0，而位开始边界没有跳变代表 1。

若对比其生成的波形可以看出：

- 从信号波形中可以看出，曼彻斯特（Manchester）编码产生的信号频率比不归零制高。
- 从自同步能力可以看出，不归零制不能从信号波形本身中提取信号时钟频率（这叫做没有自同步能力），而曼彻斯特编码具有自同步能力。

资料：

- <https://en.wikipedia.org/wiki/Manchester_code>

**（2）基本的带同调制方法**

- 调幅（AM） - 即载波的振幅随基带数字信号而变化。例如，0 或 1 分别对应于无载波或有载波输出。
- 调频（FM） - 即载波的频率随基带数字信号而变化。例如，0 或 1 分别对应于频率 $f_1$ 或 $f_2$。
- 调相（PM） - 即载波的初始相位随基带数字信号而变化。例如，0 或 1 分别对应于相位 0 度或 180 度。

为了达到更高的信息传输速率，必须采用技术上更为复杂的多元制的振幅相位混合调制方法。例如，**正交振幅调制QAM**（Quadrature Amplitude Modulation）。

### 信道的极限容量

数字通信的优点：虽然信号在信道上传输时候会不可避免地产生失真，但在接收端只要能从失真的波形中能够识别出原来的信号，那么这种失真对通信质量就没有影响。

码元传输的速率越高，或信号传输的距离越远，或噪声干扰越大，或传输媒体质量越差，在接收端的波形失真就越严重。

从概念上讲，限制码元在信道上的传输速率的因素有以下两个：

**（1）信道能够通过的频率范围**

具体的信道所能通过的频率范围总是有限的。信号中的许多高频分量往往不能通过信道。

一种典型的受干扰现象是 [码间串扰](https://en.wikipedia.org/wiki/Intersymbol_interference)。

在 1924 年，奈奎斯特（Nyquist）推导出了著名的 [奈氏准则](https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem)。他给出了在假定的理想条件下，为了避免码间串扰，码元的传输速率的上限值：在任何信道中，码元传输的速率是有上限的，传输速率超过此上限，就会出现严重的码间串扰的问题，使接收端对码元的判决（即识别）成为不可能。

如果信道的频带越宽，也就是能够通过的信号高频分量越多，那么就可以用更高的速率传送码元而不出现码间串扰。

**（2）信噪比**

噪声存在于所有的电子设备和通信信道中。由于噪声是随机产生的，它的瞬时值有时会很大，因此噪声会使接收端对码元的判决产生错误。

噪声的影响是相对的。如果信号相对较强，那么噪声的影响就相对较小。因此，信噪比就很重要。

信噪比就是信号的平均功率和噪声的平均功率之比，常记为 $S/N$，并用分贝（dB）作为度量单位。即：

$$
ratio \space (dB) = 10 \log_{10}{(S/N)} (dB)
$$

在 1948 年，信息论创始人香农（Shannon）推导出了著名的 **香农公式**。香农公式指出：

信道的极限信息传输速率 C 是

$$
C = W \log_{2}{(1+S/N)} (bit/s)
$$

式中，$W$ 为信道的带宽（以 Hz 为单位）；$S$ 为信道内所传信号的平均功率；$N$ 为信道内部的高斯噪声功率。