# 拓朴排序

设有一个偏序关系 `<`，以及集合 `S`。

假设 `|S|=n`，且集合 `S` 中有 `m` 对偏序关系，`(u, v)` 表示 `u<v`。

我们可以将 `S` 中元素看成一个一个点，并对其标号。将偏序关系看成一个有向边，那么结果可以得到一张有向无环图（DAG）。

对其进行排序，使得如果 `u<v` 那么 `u` 就会排在 `v` 前面。

该问题被称为拓朴排序（topological sort）

``` cpp
// 按照问题规模设置
constexpr unsigned MAXN = 100;

// 是否被访问过的三个状态，以后可以修改成_ing, _ed, _no等等简写风格。
// 正在访问
constexpr int Visiting  = -1;
// 已经访问过
constexpr int Visited   = 1;
// 未访问
constexpr int noVisit   = 0;

// 访问情况
int visit[MAXN] = {0};

// 拓扑排序结果
int topo[MAXN], t;

// DAG图
int G[MAXN][MAXN] = {0};

// n是集合中元素的个数，m是偏序关系个数，m基本没用
int n, m;

// 用于读取输入，并初始化。
void Read();

bool dfs(int u)
{
    visit[u] = Visiting;
    for (int v = 0; v < n; v++) if (G[u][v])
    {
        if (visit[v] == Visiting) return false; // 存在有向环，失败退出。
        else if (visit[v] == noVisit && !dfs(v)) return false;
    }
    visit[u] = Visited; topo[t--] = u;
    return true;
}

bool toposort()
{
    t = n;
    for (int u = 0; u < n; u++) if (visit[u] == noVisit)
    {
        if (!dfs(u)) return false;
    }
    return true;
}
```