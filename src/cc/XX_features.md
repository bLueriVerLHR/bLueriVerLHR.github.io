# 零散的特性

## 常量折叠

观察一个现象。

``` cpp
const int a = 10;
int b[a];
int main() {
    return 0;
}
```

这是一段在C++内合法的的代码，但是在C语言里不合法。

实际情况是，这是一种外表像 `VLA`，但本质是一种常量折叠（也即常量合并）的东西。

`const` 关键字告诉编译器，这个只读变量在编译期间可以看作一个常量。所以在编译期间，`a` 就会用10替换并计算。

下面代码也是常量折叠现象的一个例子：

``` cpp
#include <iostream>

int main() {
    const int a = 10;
    int *b = (int*)&a;
    *b = 1;
    int c = *&a;
    std::cout << *&a << std::endl;
    printf("%d\n", *&a);
    std::cout << c << std::endl;
    return 0;
}
```

这里，输出为：

```
1
1
10
```

在编译期间，`c` 的初始化用到的是常量 `a`，所以是以10替换过。在运行时打印时候，`c` 的值就是10。但是在运行时，`a` 的值被修改了，所以运行时对 `a` 值进行打印时候，用的就是1了。可以看出打印行为是运行时的。

## VLA

很不推荐用。

原因查看本文：[The (too) many pitfalls of VLA in C](https://blog.joren.ga/programming/vla-bad)

例子：

``` c
int main() {
    int a = 10; // const int a = 10; 也可以
    int b[a];
}
```

这是C语言支持的，在栈上进行动态内存分配的技巧。但是会栈溢出，溢出后就会炸，不是返回 `NULL` 那样给个标志。

C++也可这么写，但是说法应该叫文件域内的一种动态初始化。具体名称不够了解。