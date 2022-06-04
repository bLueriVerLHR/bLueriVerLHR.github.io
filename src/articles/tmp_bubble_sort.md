# 冒泡排序


``` cpp
#include <cinttypes>
#include <type_traits>
#include <iostream>

namespace SORT
{
    template <int ... vals>
    struct Array;

    template <int front, int ... vals>
    struct Array<front, vals ...>
    {
        static inline void out()
        {
            std::cout << front << std::endl;
            Array<vals ...>::out();
        }
    };

    template <int front>
    struct Array<front>
    {
        static inline void out()
        {
            std::cout << front << std::endl;
        }
    };

    template <bool _Condition, typename _True, typename _False>
    struct _IF_type;

    template <typename _True, typename _False>
    struct _IF_type<true, _True, _False>
    {
        using type = _True;
    };

    template <typename _True, typename _False>
    struct _IF_type<false, _True, _False>
    {
        using type = _False;
    };

    template <bool _Condition, int _True, int _False>
    struct _IF_int;

    template <int _True, int _False>
    struct _IF_int<true, _True, _False>
    {
        const static int value = _True;
    };

    template <int _True, int _False>
    struct _IF_int<false, _True, _False>
    {
        const static int value = _False;
    };

    template <int val, typename T>
    struct push_back;

    template <int val, int ... vals>
    struct push_back<val, Array<vals ...>>
    {
        using type = Array<vals ..., val>;
    };

    template <int val, typename T>
    struct push_front;

    template <int val, int ... vals>
    struct push_front<val, Array<vals ...>>
    {
        using type = Array<val, vals ...>;
    };

    template <int index, typename T>
    struct at_index;

    template <int index, int front, int ... vals>
    struct at_index<index, Array<front, vals ...>>
    {
        const static int value = at_index<index-1, Array<vals ...>>::value;
    };

    template <int front, int ... vals>
    struct at_index<0, Array<front, vals ...>>
    {
        const static int value = front;
    };

    template <int index>
    struct at_index<index, Array<>> {};

    template <int index, int new_value, typename T>
    struct assign_value;

    template <int index, int new_value, int front, int ... vals>
    struct assign_value<index, new_value, Array<front, vals ...>>
    {
        using type = typename push_front<front, typename assign_value<index-1, new_value, Array<vals ...>>::type>::type;
    };

    template <int new_value, int front, int ... vals>
    struct assign_value<0, new_value, Array<front, vals ...>>
    {
        using type = Array<new_value, vals ...>;
    };

    template <int index, int new_value>
    struct assign_value<index, new_value, Array<>>
    {
        using type = Array<new_value>;
    };

    template <int A, int B, typename T>
    struct exchange_value;

    template <int A, int B, int ... vals>
    struct exchange_value<A, B, Array<vals ...>>
    {
        const static int tmp = at_index<A, Array<vals ...>>::value;
        using type = typename assign_value<B, tmp, typename assign_value<A, at_index<B, Array<vals ...>>::value, Array<vals ...>>::type>::type;
    };

    template <size_t start, size_t end, typename T>
    struct BUBBLE_SORT_SUBPROG;

    template <size_t start, size_t end, int ... vals>
    struct BUBBLE_SORT_SUBPROG<start, end, Array<vals ...>>
    {
        using type = typename BUBBLE_SORT_SUBPROG<start-1, end, typename _IF_type<
            (at_index<start, Array<vals ...>>::value > at_index<start-1, Array<vals ...>>::value),
                typename exchange_value<start, start-1, Array<vals ...>>::type,
                Array<vals ...>>::type>::type;
    };

    template <size_t end, int ... vals>
    struct BUBBLE_SORT_SUBPROG<end, end, Array<vals ...>>
    {
        using type = Array<vals ...>;
    };

    template <size_t len, size_t num, typename T>
    struct BUBBLE_SORT_MAINPROG;

    template <size_t len, size_t num, int ... vals>
    struct BUBBLE_SORT_MAINPROG<len, num, Array<vals ...>>
    {
        using type = typename BUBBLE_SORT_MAINPROG<len, num+1, typename BUBBLE_SORT_SUBPROG<len, num, Array<vals ...>>::type>::type;
    };

    template <size_t len, int ... vals>
    struct BUBBLE_SORT_MAINPROG<len, len, Array<vals ...>>
    {
        using type = Array<vals ...>;
    };

    template <typename T>
    struct BUBBLE_SORT;

    
    template <int ... vals>
    struct BUBBLE_SORT<Array<vals ...>>
    {
        using type = typename BUBBLE_SORT_MAINPROG<sizeof...(vals)-1, 0, Array<vals ...>>::type;
    };

    constexpr uint64_t seed = 127;
    
    template <int times, uint64_t seed, typename T>
    struct RandArray;

    template <int times, uint64_t seed, int ... vals>
    struct RandArray<times, seed, Array<vals ...>>
    {
        using type = typename RandArray<times-1, (25214903917 * seed % 903917) & ((1 << 30) - 1), Array<(25214903917 * seed % 903917) & ((1 << 30) - 1), vals ...>>::type;
    };

    template <uint64_t seed, int ... vals>
    struct RandArray<0, seed, Array<vals ...>>
    {
        using type = Array<(25214903917 * seed % 903917) & ((1 << 30) - 1), vals ...>;
    };
};
```