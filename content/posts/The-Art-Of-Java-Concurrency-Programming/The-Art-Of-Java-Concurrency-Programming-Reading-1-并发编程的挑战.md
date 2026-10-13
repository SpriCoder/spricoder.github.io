---
title: Java并发编程的艺术-Reading-1-并发编程的挑战
description: Java并发编程的艺术-Reading-1-并发编程的挑战
mathjax: false
date: 2022-02-26 17:39:41
categories: [Java并发编程的艺术]
tags: ["Java","并发编程","上下文切换","死锁"]
content_type: reading
---

Chapter1-并发编程的挑战
---
并发编程希望通过多线程执行任务让程序运行得更快，面临非常多的挑战，比如上下文切换的问题、死锁的问题，以及受限于硬件和软件的资源限制问题。

# 1. 上下文切换

## 1.1. 多线程一定快吗？
1. 上下文切换：任务从保存到再加载的过程。
2. 通过/chapter1/ConcurrencyTest类中修改不同的count值可以感知到上下文切换过程中存在的线程创建和上下文切换的开销。

## 1.2. 上下文切换次数和时长
1. 使用Lmbench3可以测量上下文切换的时长
2. 使用vmstat可以测量上下文切换的次数，Linux下

## 1.3. 如何减少上下文切换
1. 减少上下文切换的方法
   1. 无锁并发编程：将数据的ID根据Hash算法取模分段，不同线程处理不同段的数据
   2. CAS算法：Java的Atomic包使用CAS算法更新数据，而不需要加锁
   3. 最少线程数：避免创建不需要的线程，避免大量线程等待
   4. 使用协程：在单线程里实现多任务调度，并且在单线程中维持多个任务间的切换
2. 实战
   1. 使用jstack命令查看线程信息，并存储到dump文件中
   2. 查看所有进程处于什么状态
   3. 打开dump文件查看处于WAITING的线程在做什么
   4. 调整不合适的进程的工作线程数(maxThreads)
   5. 重启不合适的进程，再dump后查看，统计WAITING的线程

# 2. 死锁

## 2.1. 死锁实例
1. 线程互相持有资源会引起死锁
   1. windows查找进程号:`tasklist | findstr "java"`
   2. windows存储堆栈信息:`jstack [pid] > dump.txt`
2. 可以通过`jstack`来查看进行信息，示例死锁代码为/chapter1/DeadLockDemo，对应的信息如下：

```
"Thread-1" #13 prio=5 os_prio=0 tid=0x0000000027757800 nid=0x302c waiting for monitor entry [0x000000002872f000]
   java.lang.Thread.State: BLOCKED (on object monitor)
	at chapter1.DeadLockDemo$2.run(DeadLockDemo.java:46)
	- waiting to lock <0x00000007178db558> (a java.lang.String)
	- locked <0x00000007178db588> (a java.lang.String)
	at java.lang.Thread.run(Thread.java:748)

"Thread-0" #12 prio=5 os_prio=0 tid=0x0000000027755000 nid=0x337c waiting for monitor entry [0x000000002862f000]
   java.lang.Thread.State: BLOCKED (on object monitor)
	at chapter1.DeadLockDemo$1.run(DeadLockDemo.java:35)
	- waiting to lock <0x00000007178db588> (a java.lang.String)
	- locked <0x00000007178db558> (a java.lang.String)
	at java.lang.Thread.run(Thread.java:748)

...

Found one Java-level deadlock:
=============================
"Thread-1":
  waiting to lock monitor 0x0000000025762118 (object 0x00000007178db558, a java.lang.String),
  which is held by "Thread-0"
"Thread-0":
  waiting to lock monitor 0x0000000025763508 (object 0x00000007178db588, a java.lang.String),
  which is held by "Thread-1"
```

## 2.2. 死锁避免
1. 避免一个线程同时获取多个锁。
2. 避免一个线程在锁内同时占用多个资源，尽量保证每个锁只占用一个资源。
3. 尝试使用定时锁，使用lock.tryLock(timeout)来替代使用内部锁机制。
4. 对于数据库锁，加锁和解锁必须在同一个数据库连接内，否则可能解锁失败。

# 3. 资源限制的挑战
  
## 3.1. 什么是资源限制
1. 指并发编程时，程序的执行速度受限于计算机硬件资源或软件资源。
2. 比如并发编程时，硬件资源限制有带宽的上传/下载速度、磁盘读写速度和CPU的处理速度。

## 3.2. 资源限制引发的问题和解决
1. 如果并行的程序因为资源限制再次串行，会导致性能下降。
2. 问题解决
   1. 硬件资源限制：使用集群(ODPS、Hadoop)并行执行程序
   2. 软件资源限制：考虑使用资源池将资源复用(使用连接池将数据库和Socket复用)

## 3.3. 如何在资源限制情况下进行并发编程
1. 根据不同的资源限制调整程序的并发度，比如带宽和磁盘读写速度。
2. 有数据库操作时，涉及数据库连接数与线程的数量关系。

# 4. 总结与建议
建议多使用JDK并发包提供的并发容器和工具类来解决并发问题。