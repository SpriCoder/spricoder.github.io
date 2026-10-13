---
title: 2018-Linux系统基础-Shell编程
date: 2018-07-16 19:00:00
description: "2018-Linux系统基础-Shell编程"
categories: [2018-Linux系统基础]
mathjax: false
tags: ["Linux","系统管理","Shell"]
content_type: course
course: linux-basics-2018
course_group: supplement
course_order: 1
---

Shell编程
---

# 1. Bash中的空格
1. 在Shell编程过程中，空格容易会导致代码出错
><a href = "https://www.cnblogs.com/litifeng/p/6896248.html"></a>

## 1.1. 和空格有关的场景
1. 等号赋值两边不能有空格
2. 命令与选项之间需要空格
3. 管道两边空格可有可无
4. []之间的参数两侧也需要有空格

## 1.2. 注意事项
1. Bash中，最好给变量加上双引号，放置出现空格导致的错误
```bash
a="123 456"
echo "a"
```