---
title: "Compiler"
description: "Tips, techniques for compiler."
authors: ["bLueriVerLHR"]
date: 2024-11-05T13:35:30+08:00
draft: true
tags: ["compiler"]
toc: true
---

## Compiler Structure

1. frontend: from `source` to `ir`
2. backend: from `ir` to `target`

The above two parts are the basis of compilers.
The frontend usually uses lexer and parser generator such as `flex & bison (or yacc)`, `antlr`.
Using the generator could reduce many trouble when the syntax of the source changed unexpectedly.
The backend is relatively simple if only translate the ir with stack machine.
The final output may be slower than expected, but it is a good baseline for future optimizations.

To achieve a high performance, compiler usually have many optimizations on the source, ir or even target.
For example, to keep the higher structure of source code when optimizing, the compiler usually uses simple ir which just translates the arrays or pointers.
This will give a good chance for memory management or give a good view on how pointers are used.
