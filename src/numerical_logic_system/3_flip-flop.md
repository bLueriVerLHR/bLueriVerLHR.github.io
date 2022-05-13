# 触发器

触发器是具有记忆功能的基本逻辑单元。它能接收、保存和输出数码0，1。各类触发器都可以由门电路组成。

## 基本触发器

基本触发器应具有下述特点：

1. 有两个稳定状态和两个互补的输出。
2. 在输入信号驱动下，能可靠地确定其中任意一种状态。

### 闩锁电路

> [!ATTENTION]
> 闩锁的闩（shuan）

![闩锁电路](../../_media/pics/numerical_logic_system/3-1.png)

闩锁电路由两个非门按照如上图方式连接而成。$Q$，$\overline{Q}$ 两端电压，高低对应，设 $Q$（或 $\overline{Q}$）端为高电平时，$\overline{Q}$（或 $Q$）端必然是低电平。

究竟电路稳定在哪一种状态，尚无法确定，往往由偶然因素决定。因为两个门输入、输出连接成正反馈环，两个门电路的电气参数有一点差异，正反馈的结果，必定导致一个门处于导通状态，另一个门处在截止状态。

$Q$，$\overline{Q}$ 端状态相反，如果没有外来信号驱动，闩锁电路随机地处于两种可能状态中的一种，规定 $Q=1,\overline{Q}=0$ 为**1状态**；$Q=0,\overline{Q}=1$ 为**0状态**。

1状态相当于二进制数码1被锁存；0状态相当于数码0被锁存。（看Q的状态）

该闩锁电路是构成触发器的基础，只有引入外来信号时，才能控制它的状态。

### 基本RS触发器

在闩锁电路中，取两个输入端。一个是 $\overline{S}$ 端，称为置位（Set）端。一个是 $\overline{R}$ 端，称为复位（Reset）端。

![基本RS触发器](../../_media/pics/numerical_logic_system/3-2.png)

#### 逻辑功能

由与非门的逻辑功能决定。

> $\overline{S}$ 的 $\overline{}$ 表示低电平有效。

- 要建立1状态，可使 $\overline{S}=0,\overline{R}=1$，则 $Q=1,\overline{Q}=0$，触发器置位；
- 要建立0状态，可使 $\overline{S}=1,\overline{R}=0$，则 $Q=0,\overline{Q}=1$，触发器置位；
- 一旦建立起了1状态（或0状态），则 $\overline{S}$（或 $\overline{R}$）端从0变成1,触发器将保持1状态（或0状态）不变；
- 如果置位端和复位端同时为0,则有 $Q=\overline{Q}=1$，触发器输出端失去了互补的特性，触发器处于不正常状态。而若两端同时从0变成1,则触发器状态不稳定。

> 如果要触发器正常工作，需要是两端不能同时为0。

> 可以写出每个非门对应的逻辑函数来辅助判断。

![基本RS触发器特性表](../../_media/pics/numerical_logic_system/3-3.png)

这种触发器属于异步型，两端的状态直接对触发器起作用。这样的触发器也可以用或非门组成。

#### 应用

![无震颤开关](../../_media/pics/numerical_logic_system/3-4.png)

![故障声报警控制电路](../../_media/pics/numerical_logic_system/3-5.png)

### 同步RS触发器

基本RS触发器，输入端的触发信号直接控制触发器状态。但在实际应用中，还希望一个脉冲信号控制触发器的翻转时刻，这个信号称为时钟脉冲CP（Clock Pulse），有时也缩写成CK。

引入CP后，触发器状态不是在输入信号（R，S端）变化时候立刻转换，而是等待时钟信号到达时才转换。在多个这种触发器组成的电路中，各触发器受同一个时钟的控制，触发器翻转与同一个时钟信号同步，故得名同步RS触发器。

![同步RS触发器](../../_media/pics/numerical_logic_system/3-6.png)

![同步RS触发器逻辑功能](../../_media/pics/numerical_logic_system/3-7.png)

![同步RS触发器功能描述方法 1](../../_media/pics/numerical_logic_system/3-8.png)

![同步RS触发器功能描述方法 2](../../_media/pics/numerical_logic_system/3-9.png)

### 同步D触发器

![同步D触发器](../../_media/pics/numerical_logic_system/3-10.png)

### JK触发器

![JK触发器](../../_media/pics/numerical_logic_system/3-11.png)

### T触发器

![T触发器](../../_media/pics/numerical_logic_system/3-12.png)

### T'触发器

![T'触发器](../../_media/pics/numerical_logic_system/3-13.png)

### 触发器存在的问题

![触发器存在的问题](../../_media/pics/numerical_logic_system/3-14.png)

## TTL集成触发器

### 主从触发型JK触发器

主从JK触发器是由两个时钟控制的RS触发器组成。

![主从JK触发器](../../_media/pics/numerical_logic_system/3-15.png)

图中 $G_1,G_2$ 门和 $G_3,G_4$ 门组成的同步RS触发器是受 $G_5,G_6$ 门和 $G_7,G_8$ 门组成的另一个钟控RS触发器控制的。

为此，前者（受控触发器）称为“从触发器”；而后者（主控的触发器）称为“主触发器”。

时钟直接或经 $G_9$ 门倒相后分别馈送到主、从两个触发器。由输出端 $Q,\overline{Q}$反馈到输入的连线A和B，使这两个RS触发器构成了JK触发器。

触发器除了同步输入端J，K，CP外，还有直接置1、置0端 $\overline{S_d}$ 和 $\overline{R_d}$。可以根据需要，预先把触发器置成1或0，而不受时钟脉冲的同步控制。

![工作原理](../../_media/pics/numerical_logic_system/3-16.png)

![工作原理](../../_media/pics/numerical_logic_system/3-17.png)

![动态特性](../../_media/pics/numerical_logic_system/3-18.png)

![动态特性](../../_media/pics/numerical_logic_system/3-19.png)

### 边沿触发型JK触发器

前面提到，主从JK触发器在工作的时候，要求J，K输入信号在CP=1期间保持不变。这对输入信号要求太苛刻了，说明电路结构还不够好。

而如下的电路，负边沿（下降沿）触发型JK触发器，克服了主从JK触发器的缺点，结构比较合理。他对输入信号的要求极为宽容，只要求J，K端信号在CP的负边沿附近保持稳定即可。它的特点是只有负边沿瞬间，触发器才对输入信号进行采样，而输出信号的其他时刻对触发器不起作用。

因此，这样的触发器抗干扰能力很强。

![负边沿触发型JK触发器](../../_media/pics/numerical_logic_system/3-20.png)

![负边沿触发型JK触发器工作原理 1](../../_media/pics/numerical_logic_system/3-21.png)

![负边沿触发型JK触发器工作原理 2](../../_media/pics/numerical_logic_system/3-22.png)

![负边沿触发型JK触发器工作原理 3](../../_media/pics/numerical_logic_system/3-23.png)

### 集成D触发器

![维持阻塞D触发器](../../_media/pics/numerical_logic_system/3-24.png)

## MOS集成触发器

MOS集成触发器是由以MOS管为开关元件的MOS门组成的。就逻辑功能而言，它与上述的TTL型触发器是一致的。

![MOS集成触发器](../../_media/pics/numerical_logic_system/3-25.png)

## 触发器逻辑功能的转换

![触发器逻辑功能的转换](../../_media/pics/numerical_logic_system/3-26.png)
