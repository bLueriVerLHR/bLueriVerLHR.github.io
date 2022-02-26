# 在 NVIDIA 显卡下启动 Arch Linux 系统的亮度调节功能

`date: 2021-08-12`

---

**《关于我在 Arch Linux 上调节亮度用了 acpid，brightnessctl，xbacklight 也改变不了亮度，于是上网搜索了半天终于发现问题出现在闭源的 Nvidia 显卡和 Arch Linux 相性不好，修改了两个系统文件然后重启电脑才搞定问题这件事》**`XD`

<!--more-->

---

## 参考文章

[Backlight](https://wiki.archlinux.org/title/Backlight)

[Arch / Manjaro Linux 英伟达显卡闭源驱动 调节屏幕亮度失效问题解决方法](https://blog.csdn.net/m0_60212601/article/details/118866751)

[Debian 10 Buster | update-grub | command not found](https://unix.stackexchange.com/questions/482569/debian-10-buster-update-grub-command-not-found)

## 操作方法

### 1 添加10-nvidia.conf（可能不需要，没测试）

首先，打开到 `xorg.conf.d` 中：

``` bash
$ cd /usr/share/X11/xorg.conf.d
$ ls
```

查看输出有没有 `10-nvidia.conf`，如果没有，执行下面步骤：

``` bash
$ sudo vim 10-nvidia.conf
```

在里面输入如下内容：

``` plaintext
Section "Device"
        Identifier "Device0"
        Driver "nvidia"
        VendorName "NVIDIA Corporation"
        Option "RegistryDwords" "EnableBrightnessControl=1"
        Option "NoLogo" "True"
EndSection
```

保存后退出。

### 2 更新grub

打开 `grub` 文件：

``` bash
$ cd /etc/default/
$ sudo vim grub
```

修改 `GRUB_CMDLINE_LINUX=""` 为 `GRUB_CMDLINE_LINUX="acpi_backlight=vendor"`

然后在输入命令：

``` bash
$ sudo grub-mkconfig grub
$ reboot
```

当电脑重启以后就可以调节屏幕亮度了。

此时你可以在 `/sys/class/backlight/` 里看到原来的 `acpi_video0` 换成了 `nvidia_0`

``` bash
$ ls /sys/class/backlight/
nvidia_0
```

## 后记

难受，太难受了 TAT

原因竟然是显卡。。。
