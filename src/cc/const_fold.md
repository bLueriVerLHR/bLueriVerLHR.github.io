# 常量折叠

```
os              == arch linux
gcc     version == 12.1.0-2
glibc   version == 2.35-5
```

观察一个现象。

``` cpp
// main.cpp / main.c
const int a = 10;
int b[a];
int main() {
    return 0;
}
```

这是一段在C++内合法的的代码，但是在C语言里不合法。

``` bash
# gcc 报错

main.c:3:5: error: variably modified ‘b’ at file scope
    2 | int b[a];
      |     ^

# 如果是 clang 编译，他会使用常量折叠进行优化
```

实际情况是，这是一种外表像 `VLA`，但本质是一种常量折叠（也即常量合并）的东西。

`const` 关键字告诉编译器，这个只读变量在编译期间可以看作一个常量。所以在编译期间，`a` 就会用10替换并计算。

下面代码也是常量折叠现象的一个例子：

``` cpp
// main.cpp
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

常量折叠可以用于编译期运算。