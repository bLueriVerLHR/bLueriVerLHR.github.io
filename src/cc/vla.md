# VLA

`VLA` 也即 `variable-length array`，变长数组。一种在栈上动态分配数组的方式。

```
os              == arch linux
gcc     version == 12.1.0-2
glibc   version == 2.35-5
```

很不推荐用。

原因查看本文：[The (too) many pitfalls of VLA in C](https://blog.joren.ga/programming/vla-bad)

例子：

``` c
// main.c
int main() {
    int a = 10; // const int a = 10; 也可以
    int b[a];
}
```

这是C语言支持的，在栈上进行动态内存分配的技巧。但是会栈溢出，溢出后就会炸，不是返回 `NULL` 那样给个标志。

C++也可这么写，但是说法应该叫文件域内的一种动态初始化。具体名称不够了解。

参考：
- [Variable length arrays (VLA) in C and C++](https://stackoverflow.com/questions/14075194/variable-length-arrays-vla-in-c-and-c#:~:text=C%2B%2B%20doesn%27t%20have%20VLA%2C%20but%20it%20has%20dynamic,contain%20a%20const%20qualified%20object%2C%20which%20isn%27t%20allowed.)