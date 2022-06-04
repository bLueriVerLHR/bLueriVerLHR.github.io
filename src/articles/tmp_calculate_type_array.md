# 计算类型数组对应的大小数组

``` cpp
#include <iostream>

namespace TMP
{
    // 使用 SizeArray 来存储类型的大小
    template <size_t ... Sizes>
    struct SizeArray;

    // 此处添加一个递归函数成员用于打印数组中的内容
    template <size_t FrontSize, size_t ... Sizes>
    struct SizeArray<FrontSize, Sizes ...>
    {
        static inline void out()
        {
            std::cout << FrontSize << std::endl;
            SizeArray<Sizes ...>::out();
        }
    };

    // 打印函数的终止条件
    template <size_t FrontSize>
    struct SizeArray<FrontSize>
    {
        static inline void out()
        {
            std::cout << FrontSize << std::endl;
        }
    };

    // 将数值从前压入大小数组中
    template <size_t Value, typename T>
    struct push_front;

    // 压入元函数
    template <size_t Value, size_t ... Values>
    struct push_front<Value, SizeArray<Values ...>>
    {
        using type = SizeArray<Value, Values ...>;
    };

    // 类型数组，该数组用于保存输入
    template <typename ... T>
    struct TypeArray;

    // 类型转换到对应的大小
    template <typename T>
    struct Type2Size;

    // 元函数
    template <typename T, typename ... TT>
    struct Type2Size<TypeArray<T, TT ...>>
    {
        using type = typename push_front<sizeof(T), typename Type2Size<TypeArray<TT ...>>::type>::type;
    };

    // 终止条件
    template <typename T>
    struct Type2Size<TypeArray<T>>
    {
        using type = typename push_front<sizeof(T), SizeArray<>>::type;
    };
}

int main()
{
    TMP::Type2Size<TMP::TypeArray<int, long, short>>::type::out();
    return 0;
}
```