# 最大子数组

> 给出一个由 `n` 个带符号整数组成的数组，请求出和最大的连续子数组。

## 暴力

历遍所有可能的子数组。

C++例子

``` cpp
class Solution {
public:
    ::std::int64_t method(const ::std::vector<int> &arr) {
        ::std::int64_t max = INT64_MIN;
        auto len = arr.size();
        ::std::int64_t sum = 0;
        for (auto i = 0ul; i < len; i++) {
            sum = 0;
            for (auto j = i; j < len; j++) {
                sum += arr[j];
                if (sum > max) {
                    max = sum;
                }
            }
        }
        return max;
    }
};
```

## 分治

<!-- TODO: 分治法 -->