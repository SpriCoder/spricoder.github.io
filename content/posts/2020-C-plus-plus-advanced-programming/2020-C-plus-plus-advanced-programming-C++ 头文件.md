---
title: 2020-C++高级程序设计-C++ 头文件
date: 2020-07-01 19:12:00
description: "2020-C++高级程序设计-C++ 头文件"
tags: 
- C++
- 课程笔记
- 头文件
categories: [2020-C++高级程序设计]
mathjax: false
---

C++ 头文件
---

# 1. 头文件
1. `#include`
2. iostream：输入输出流
3. cmath：数学函数
4. iomanip：I/O流控制符

# 2. 头文件主要内容
1. 头文件可以包含常量定义、变量/函数声明、编译预处理、类型定义、内联函数
```c++
//const.h
const double pi = 3.1415926;
```
```c++
//a.h
extern float salary;
extern void show();
```
2. 调用头文件:`#include "a.h"`