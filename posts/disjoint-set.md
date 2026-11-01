---
title: "Disjoint Set"
authors: ["bLueriVerLHR"]
date: 2026-10-31T23:45:00+08:00
tags: ["Data Structure", "Algorithm"]
section: 7
draft: false
---

并查集，适合集合并操作的数据结构。

```cpp
template <typename value_t>
    requires std::unsigned_integral<value_t>
class disjoint_set {

public:
    disjoint_set(size_t capacity)
    : father_(capacity), rank_(capacity, 0)
    {
        assert(capacity > 0
            && capacity - 1 <= std::numeric_limits<value_t>::max());
        // set all members belongs to themselves
        std::iota(father_.begin(), father_.end(), value_t{0});
    }

    auto
    find(value_t x)
    -> value_t {
        assert(x < father_.size());

        value_t root = x;
        while (father_[root] != root) {
            root = father_[root];
        }

        while (father_[x] != root) {
            value_t next = father_[x];
            father_[x] = root;
            x = next;
        }
        return root;
    }

    auto
    merge(value_t x, value_t y)
    -> bool {
        assert(x < father_.size());
        assert(y < father_.size());

        x = find(x);
        y = find(y);

        if (x == y) return false;
        if (rank_[x] < rank_[y]) std::swap(x, y);
        else if (rank_[x] == rank_[y]) rank_[x] += 1;

        father_[y] = x;
        return true;
    }

    auto
    size()
    -> size_t {
        return father_.size();
    }

private:
    std::vector<value_t> father_;
    std::vector<value_t> rank_;
};
```
