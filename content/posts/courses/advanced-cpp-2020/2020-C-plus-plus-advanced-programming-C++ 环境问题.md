---
title: 2020-C++高级程序设计-C++ 环境问题
date: 2020-07-01 19:07:00
description: "2020-C++高级程序设计-C++ 环境问题"
categories: [2020-C++高级程序设计]
mathjax: false
tags: ["C++"]
content_type: course
course: advanced-cpp-2020
course_group: lectures
course_order: 8
---

C++ 出现的部分问题
---

# 1. x86和x64的不同
1. x86是32位系统
2. x64是64位系统
3. 在配置dll文件的时候务必注意两者区别

# 2. xc00000007应用无法启动的问题
1. 我遇到的是链接库的ddl文件和调试模式不同，32位和64位混淆

# 3. 缺少ddl文件
1. 首先务必确认是32位操作系统还是64位操作系统
2. 去网上找到网站下载并且配置到提示的对应路径