---
title: "man Linux"
description: "Tips, techniques for Linux development."
authors: ["bLueriVerLHR"]
date: 2024-09-21T20:03:52+08:00
draft: false
tags: ["linux", "manuel"]
toc: true
---

The shell used in the article is `bash`.
Information about the Linux release used in this article:

```
blur@blur-personal: ~$ uname -a
Linux blur-personal 5.15.153.1-microsoft-standard-WSL2 #1 SMP Fri Mar 29 23:14:13 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux
```

## Linux Variables

### PATH

`PATH` refers to the places where will shell find programs.
The order of paths in `PATH` will define the priority that the shell will use when there is two programs with the same name.

```
blur@blur-personal: ~$ ls ~/Software/
make  gcc
blur@blur-personal: ~$ ls ~/Default/
gcc  g++
blur@blur-personal: ~$ export PATH=~/Software:~/Default
blur@blur-personal: ~$ which gcc
/home/user/Software/gcc
```

### uname

`uname` can print certain system information.
Usually, we use `uname -r` to see information about kernel release.

```
blur@blur-personal: ~$ uname -r
5.15.153.1-microsoft-standard-WSL2
```

## Linux Kernel Development on VSCode

VSCode extensions has some functions that will do no help and even disturb your development in Linux Kernel Development (LKD in abbr.).
If we set the global settings of VSCode to cater for LKD, it will break other develop environment.
On account of previous situation, we need local VSCode settings for LKD.

An example `c_cpp_properties.json` is shown as below:

``` json
{
    "configurations": [
        {
            "name": "Linux Kernel Development",
            // assuming the source code of Linux is under `${workspaceFolder}/linux-source`
            // can use soft link as a substitute
            "includePath": [
                "${workspaceFolder}",
                "${workspaceFolder}/linux-source/include",
                "${workspaceFolder}/linux-source/include/uapi",
                "${workspaceFolder}/linux-source/include/generated",
                "${workspaceFolder}/linux-source/arch/x86/include",
                "${workspaceFolder}/linux-source/arch/x86/include/uapi",
                "${workspaceFolder}/linux-source/arch/x86/include/generated"
            ],
            "browse": {
                "limitSymbolsToIncludedHeaders": true,
                "databaseFilename": "LKD",
                "path": [
                    "${workspaceFolder}",
                    "${workspaceFolder}/linux-source/include",
                    "${workspaceFolder}/linux-source/mm",
                    "${workspaceFolder}/linux-source/fs",
                    "${workspaceFolder}/linux-source/kernel"
                ]
            },
            "defines": [
                "__KERNEL__"
            ],
            "intelliSenseMode": "linux-gcc-x64",
            "compilerPath": "/usr/bin/gcc",
            "cStandard": "c11",
            "cppStandard": "c++17"
        }
    ],
    "version": 4
}
```

## ubuntu:noble Configuration

Use `PPA` first: (need `sudo`)

``` bash
# preparation
apt-get install -y lsb-release wget software-properties-common gnupg

# git
add-apt-repository ppa:git-core/ppa
apt-get update
apt-get install -y git

# llvm
wget https://apt.llvm.org/llvm.sh
bash llvm.sh all

# cmake
test -f /usr/share/doc/kitware-archive-keyring/copyright || wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | gpg --dearmor - | tee /usr/share/keyrings/kitware-archive-keyring.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/kitware-archive-keyring.gpg] https://apt.kitware.com/ubuntu/ noble main' | tee /etc/apt/sources.list.d/kitware.list >/dev/null
apt-get update
apt-get install -y kitware-archive-keyring
apt-get install -y cmake
```

