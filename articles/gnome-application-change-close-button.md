# Arch Linux 下修改 gnome GUI 的关闭，最大，最小键的布局

`date: 2021-08-14`

---

在做 Gnome 桌面美化时候学习的方法。

<!--more-->

---

## 参考文章

[gnome 应用窗口 关闭、最小化、最大化 按钮的位置设置](https://blog.csdn.net/lengchu_org/article/details/81022724)

## 操作

``` bash
$ sudo pacman -S dconf-editor
$ dconf-editor
```

打开到设置路径为 `/org/gnome/desktop/wm/preferences/button-layout`

该设置即控制关闭，最大，最小键布局。

`Use default value` 就是最右侧只有一个关闭键

可以修改成如下样式：

``` bash
close,maximize,minimize,appmenu:
# 或者
appmenu:maximize,minimize,close
```
