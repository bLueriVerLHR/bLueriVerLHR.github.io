# 博客介绍

该博客仅仅作为个人学习生活过程中的小记录，大部分内容不是线性的。

请个人选择内容则取观看。

> 封面来自b站void新神殿下
> 2022/4/29使用

## 小动态
### April 24, 2022
对于 `C++23` 的一个功能。

新加的 `really` 简直就是一个谐星，编程的时候不自觉的会想对自己问一下 `Really?`。

###  March 1, 2022
对于 `C++17` 的一个功能。

```cpp
struct MyStruct {
    int a{1};
    int b{0};
}ms;

auto &[v, u] = ms;
```

中，`v` 和 `u` 的类型竟然不是引用，而是简单的 `int`。

好气啊，明明和引用一样，为啥类型不太一样 `TAT` 呜呜。
