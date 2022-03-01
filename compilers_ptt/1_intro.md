# 简介

## 两个实例

逆波兰式，也称为后缀表达式

例子：`a+b*3 -> ab3*+`

统计符号串里某种符号的个数，统计符号的串中括号的深度。

## 关于

名称：编译原理、编译方法、编译技术……

地位：操作系统、编译系统和数据库系统作为计算机中三大系统软件。

特点：

- 知识性
    - 形式语言与自动机
- 系统性
    - 语言翻译
- 趣味性
    - 软件设计方法的乐趣
- 应用性
    - 广泛应用于各个领域

## 基本概念

一个编译程序就是一个语言翻译程序，**语言翻译程序**把一种语言（称作源语言）书写的程序翻译成另一种语言（称作目标语言）的等价程序。

如果源语言是高级语言，目标语言是像汇编语言那样的低级语言，则这种翻译程序称作**编译程序**。

一个源程序有时可能分成几个模块存放在不同文件中，将这些源程序汇集在一起的任务，由一个叫**预处理程序**的程序来完成，有些预处理程序也负责宏展开。

![编译程序基本过程](/_media/pics/compilers_ptt_1.png)

解释程序，也是一种翻译程序，将某高级语言，翻译成具体计算机上的低级语言程序设计语言。

![解释程序概括](/_media/pics/compilers_ptt_2.png)

1. 前者有目标程序，后者无目标程序。
2. 前者运行效率高，后者便于人机对话。

## 编译程序结构

基本步骤：

1. 词法分析
    - 将字符流转换成单词符号流，即`单词串（Token）`
2. 语法分析
    - 将单词符号流分解成各类语法短语
    - 语法短语也可以称为语法单位，可以表示成`语法树`
3. 语义分析
    - 审查源程序是否有语义错误，为代码生成阶段收集类型信息
    - 结果为`语义树`
4. 优化处理
    - 得到`优化语义树`
5. 目标代码生成

> 清华大学教材里，后面几步为
> 4. 中间代码生成
> 5. 代码优化
> 6. 目标代码生成

错误处理在每个阶段都有。

机器翻译：将一种自然语言翻译成另一种自然语言。

## 实现机制

有时候把编译过程分成前端（`front end`）和后端（`back end`）。前端的工作主要依赖于源语言而与目标机无关，

根据语言和环境的不同，编译器实现时是把编译过程各个阶段划分成若干**遍**。

**遍**，也称为**趟**，是对源程序或其等价的中间语言程序从头到扫描并完成规定任务的过程。