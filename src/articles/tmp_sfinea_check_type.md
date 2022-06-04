# 利用SFINAE判断类型是否包含子类型

## 原题

使用 `SFINAE` 构造一个元函数：输入一个类型 `T`，当 `T` 存在子类型 `type` 时该元函数返回 `true`，否则返回 `false`。

## 闲话

该题目来自《C++模板元编程实战：一个深度学习框架的初步实现》。

`SFINAE` 这个特性有点难捉摸诶，想了好久，一直卡在这道题目上。实际上该特性可以运用到很多数据类型上，但是，就例子以及网络上的一些资料来看，该特性使用在函数上更为常见。比如书中举得例子实际上就是以函数为载体的元函数。而个人最初在思考的时候一直卡在了使用 `constexpr bool` 上，没能构造出合理的元函数。

## 思路

利用函数参数中对 `T::type` 的使用来触发 `SFINAE` 特性。

目前，就我个人考虑上，我不使用返回值来触发，原因是之后判断需要使用到函数返回值作为标准，如果用函数返回值来触发，对后面的判断会造成影响。

回到参数类型上，考虑到 `T::type` 的类型是不确定的，可能是 `void`，`int` 或者 `double`。在使用的时候会很麻烦。于是仿照书中的例子，使用**指针**来解决这个问题。对于每一种类型，指针都有一个共同的值，在 `C++` 中是 `nullptr` 也可以是数值 `0`。

``` cpp
#include <iostream>

/*
    这里使用了函数参数作为sfinea的触发方式。
    首先编译器会走一遍，看看有没有 T::type 符合条件。
    如果有，那么就会构造出第一个返回值为 int 的函数；
    如果无，就会构造出第二个返回值为 void 的函数。
    其中，只要构造出了一个，另一个就会被隐去。
*/
template <typename T>
constexpr int func(typename T::type* = nullptr);

template <typename T>
constexpr void func(...);

// 测试

// 有 type 的结构体
struct MyStruct
{
    using type = MyStruct;
};

// 无 type 的结构体
struct AnotherStruct {};

// 元函数
template <typename T>
constexpr bool hasType = std::is_same_v<decltype(func<T>(0)), int>;

int main()
{
    if (hasType<MyStruct>)
    {
        std::cout << "MyStruct has attribute 'type'." << std::endl;
    }
    else
    {
        std::cout << "MyStruct does not have attribute 'type'." << std::endl;
    }
    if (hasType<AnotherStruct>)
    {
        std::cout << "AnotherStruct has attribute 'type'." << std::endl;
    }
    else
    {
        std::cout << "AnotherStruct does not have attribute 'type'." << std::endl;
    }
    return 0;
}
```