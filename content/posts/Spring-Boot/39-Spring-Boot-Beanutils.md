---
title: 39-Beanutils
date: 2022-04-13 09:47:41
description: "Spring-Boot-Beanutils"
categories: [Spring-Boot]
mathjax: false
tags: ["Java","Spring Boot","Spring","BeanUtils"]
content_type: practice
---

Beanutils
---

# 1. BeanUtils的介绍
1. Beanuils提供了对Java的反射和自省API的包装。其主要目的是利用反射机制对JavaBean的属性进行处理

# 2. BeanUtils的用法

## 2.1. 拷贝属性
1. 对于有较多相同属性的JavaBean，我们可以通过拷贝方法来完成。
```java
UserActionForm uForm = (UserActionForm) form;
User user = new User();
BeanUtils.copyProperties(uForm,user);//将值拷贝给后面的
```

2. 对于不同属性的类则不会进行处理