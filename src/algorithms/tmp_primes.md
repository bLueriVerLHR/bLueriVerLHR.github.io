# 利用GCC报错信息打印100以内的素数

此处使用的素数判断方法依然是很古朴的从2到根号n，一个个判断是否是目标数字的因数。

```cpp
namespace TMP
{
    // 判断是否能被整除
    template <int l, int r>
    constexpr bool canDivided = !(l % r);

    // 0 要额外设置一下
    template <int l>
    constexpr bool canDivided<l, 0> = false;

    // 看一下是否还在根号 r 之内
    template <int l, int r>
    constexpr bool isDoubleBigger = (l * l >= r);

    // 判断元函数，这里使用了递归的方法。
    template <int l, int r, bool _canDivided, bool _isDoubleBigger>
    constexpr bool checkPrime = checkPrime<l, r-1, canDivided<l, r>, isDoubleBigger<r, l>>;

    // 成功终止条件
    template <int l, int r, bool _canDivided>
    constexpr bool checkPrime<l, r, _canDivided, false> = true;

    // 失败的终止条件
    template <int l, int r>
    constexpr bool checkPrime<l, r, true, true> = false;

    // 判断n是否为素数
    template <int n>
    constexpr bool isPrime = checkPrime<n, n-1, false, true>;

    // 该结构体用于在报错信息中打印
    // 使用 ++ 与元函数定义冲突，引发报错。
    struct op
    {
        int operator << (int n)
        {
            return n++;
        }
    }output;

    // 利用 if constexpr 来挑选出素数
    template <int n>
    constexpr int primes()
    {
        if constexpr (isPrime<n>)
        {
            output << n;
        }
        return 1;
    }

    // 递归触发
    template <int n>
    constexpr int primeNum = primes<n>() + primeNum<n-1>;

    // 终止条件
    template <>
    constexpr int primeNum<1> = 0;
}

int main()
{
    // 打印 100 以内的素数
    TMP::primeNum<100>;
    return 0;
}
```