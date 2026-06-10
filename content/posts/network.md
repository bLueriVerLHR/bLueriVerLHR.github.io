---
title: "Network"
description: "Tips, techniques for network programming."
authors: ["bLueriVerLHR"]
date: 2026-06-10T10:22:00+08:00
draft: false
tags: ["algorithm"]
toc: true
---

# Network Programming

Network programming is not that protable for naive C/C++.
How to write code for network communication largely depends on the operating system. 

## Linux

Common **server** side should do following calls:

- `socket()`: create socket for listening incoming connection requests
- `bind()`: try to bind IP and port
- `listen()`: start to listen on port for incoming connection requests
- `accept()`: accept the connection requests and return a socket for I/O operations
    - `recv()/send()`: perform I/O operations on sockets
- `close()`: close sockets and release resources

Common **client** side should do following calls:

- `socket()`: create socket for I/O operations
- `connect()`: try to connect to a server
- `recv()/send()`: perform I/O operations on socket
- `close()`: close socket and release resources

Helper functions are:

- `getaddrinfo()`: get needed information of specified address for connection
- `freeaddrinfo()`: release the information got by `getaddrinfo()`, since they ware organized in linked list.
- `gai_strerror()`: get the error message in C-style string by the error code return from `getaddrinfo()`