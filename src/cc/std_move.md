# std::move

```
os              == arch linux
gcc     version == 12.1.0-2
glibc   version == 2.35-5
```

参考：

- [std::move](https://en.cppreference.com/w/cpp/utility/move)
- [C++右值引用（std::move）](https://zhuanlan.zhihu.com/p/94588204)

## 简单例子

有如下代码：

``` cpp
// main.cpp
int main() {
    int i = 0;
    int &&a = ++i; // 报错
    int &&b = i++;
    int &c  = ++i;
    int &d  = i++; // 报错
}
```

编译报错如下：

``` bash
main.cpp: In function ‘int main()’:
main.cpp:4:15: error: cannot bind rvalue reference of type ‘int&&’ to lvalue of type ‘int’
    3 |     int &&a = ++i;
      |               ^~~
main.cpp:7:16: error: cannot bind non-const lvalue reference of type ‘int&’ to an rvalue of type ‘int’
    6 |     int &d  = i++;
      |               ~^~
```

接下来我们进行一定的修改：

``` cpp
// main.cpp
#include <utility>

int main() {
    int i = 0;
    int &&a = std::move(++i);
    int &&b = i++;
    int &c  = ++i;
    int &d  = i++; // 报错
}
```

编译报错如下：

``` bash
main.cpp: In function ‘int main()’:
main.cpp:9:16: error: cannot bind non-const lvalue reference of type ‘int&’ to an rvalue of type ‘int’
    9 |     int &d  = i++;
      |    
```

上面的例子对 `std::move()` 的一个用法做了一些简单的展示。

他可以将左值转换成右值，但是这并非 `std::move()` 的全部，我们可以考虑一些更有趣的内容。

## std::move() 造成额外开销

接下来我们设计一个类，如下：

``` cpp
// Base.hpp
#pragma once

#include <iostream>
#include <utility>

struct Base {
    std::string m_data;

    Base(): m_data() { std::cout << "empty constructor called" << std::endl; }
    Base(const std::string &i): m_data(i) { std::cout << "param constructor called" << std::endl; }
    Base(const Base &b): m_data(b.m_data) { std::cout << "& constructor called" << std::endl; }
    Base(const Base &&b): m_data(b.m_data) { std::cout << "&& constructor called" << std::endl; }

    const Base &operator = (const Base &b) {
        this->m_data = b.m_data;
        std::cout << "& assign called" << std::endl;
        return *this;
    }

    const Base &operator = (const Base &&b) {
        this->m_data = std::move(b.m_data);
        std::cout << "&& assign called" << std::endl;
        return *this;
    }
};
```

``` cpp
// main.cpp
#include <utility>
#include <iostream>

#include "Base.hpp"

Base get() {
    Base a;
    return a;
}

void put(Base) {

}

int main() {
    Base a = get();
    std::cout << "------" << std::endl;
    put(Base());
    return 0;
}
```

编译后输出结果如下：

``` bash
[blur@arch ccpp]$ g++ main.cpp -O0 -std=c++11 -fno-elide-constructors -o main && ./main
empty constructor called
&& constructor called
&& constructor called
------
empty constructor called
&& constructor called
```

其中 `-O0` 和 `-fno-elide-constructors` 用于关闭编译器的优化。我们可以看到调用分别为

- 一次空参数构造函数，两次移动构造函数
- 一次空参数构造函数，一次移动构造函数

我们将 `get()` 函数修改一下

``` cpp
// main.cpp
#include <utility>
#include <iostream>

#include "Base.hpp"

Base get() {
    Base a;
    return std::move(a);
}

void put(Base) {

}

int main() {
    Base a = get();
    std::cout << "------" << std::endl;
    put(Base());
    return 0;
}
```

看一下输出：

``` bash
[blur@arch ccpp]$ g++ main.cpp -O0 -std=c++11 -fno-elide-constructors -o main && ./main
empty constructor called
&& constructor called
&& constructor called
------
empty constructor called
&& constructor called
```

与之前一样。不过我们将编译器优化关掉，再看看输出

修改前

``` bash
[blur@arch ccpp]$ g++ main.cpp -std=c++11 -o main && ./main
empty constructor called
------
empty constructor called
```

修改后

``` bash
[blur@arch ccpp]$ g++ main.cpp -std=c++11 -o main && ./main
empty constructor called
&& constructor called
------
empty constructor called
```

可以看到，后者会多一个对移动构造函数的调用。

这意味着是在某些地方使用 `std::move()` 会造成意想不到的调用消耗。增加不必要的拷贝。

## std::move() 定义

``` cpp
/**
*  @brief  Convert a value to an rvalue.
*  @param  __t  A thing of arbitrary type.
*  @return The parameter cast to an rvalue-reference to allow moving it.
*/
template<typename _Tp>
    _GLIBCXX_NODISCARD
    constexpr typename std::remove_reference<_Tp>::type&&
    move(_Tp&& __t) noexcept
    { return static_cast<typename std::remove_reference<_Tp>::type&&>(__t); }
```

简化一下

``` cpp
template<typename T>
constexpr typename std::remove_reference<T>::type && move(T &&t) noexcept
{
    return static_cast<typename std::remove_reference<T>::type &&>(t);
}
```

实际上是一个强制类型转换。

## 对于 string 的测试

``` cpp
// main.cpp
#include <iostream>
#include <string>

int main() {
    std::string a = "abcdefg";
    std::string b = a;
    std::cout << a << std::endl;
    std::cout << b << std::endl;
    std::string c = std::move(a);
    std::cout << a << std::endl;
    std::cout << c << std::endl;
    return 0;
}
```

输出如下：

```
abcdefg
abcdefg

abcdefg
```

可以看出，被 `std::move()` 后，`a` 内的数据都被转移到了 `c` 中。