---
title: 7-Spring Boot 松绑定
date: 2022-04-13 09:15:42
description: "Spring-Boot-Spring Boot 松绑定"
categories: [Spring-Boot]
mathjax: false
tags: ["Java","Spring Boot"]
content_type: practice
---

Spring 宽松绑定规则 relaxed binding
---
1. 根据Spring的绑定属性规则，以下所有的属性都是等价的
```yml
test.myTest=1
test.mytest=1
test.my_test=1
test.my-test=1
test.MY_TEST=1
```