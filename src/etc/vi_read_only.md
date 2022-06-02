# 解决用vi修改文件、保存文件时，提示 "readonly option is set"

原文链接：<https://www.cnblogs.com/theWinter/p/10640670.html>

---

当在终端执行sudo命令时，系统提示 `hadoop is not in the sudoers file`：

其实就是没有权限进行sudo，解决方法如下（这里假设用户名是cuser）：

1. 切换到超级用户：`$ su`
2. 打开 `/etc/sudoers` 文件：`$ vim /etc/sudoers`
3. 修改文件内容：
    - 找到 `root ALL=(ALL)  ALL` 一行，在下面插入新的一行，内容是 `hadoop ALL=(ALL)  ALL`，然后在 `vim` 键入命令 `:wq!` 保存并退出。
> 注：这个文件是只读的，不加 `!` 保存会失败。
4. 退出超级用户：`$ exit`