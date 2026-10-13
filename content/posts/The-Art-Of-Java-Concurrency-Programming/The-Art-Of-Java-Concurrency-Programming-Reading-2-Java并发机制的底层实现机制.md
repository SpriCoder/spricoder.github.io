---
title: Java并发编程的艺术-Reading-2-Java并发机制的底层实现机制
description: Java并发编程的艺术-Reading-2-Java并发机制的底层实现机制
mathjax: false
date: 2022-02-26 17:40:56
tags:
- Java并发编程的艺术
categories: [Java并发编程的艺术]
---

Chapter2-Java并发机制的底层实现
---
Java所使用的并发机制依赖于JVM的实现和CPU的指令。

# 1. volatile的应用
1. volatile是轻量级的synchronized
   1. 用于保证共享变量的可见性。
   2. 使用恰当比synchronized的使用和执行成本更低，不引起线程上下文的切换和调度。

## 1.1. volatile的定义与实现原理

### 1.1.1. volatile的定义和术语
1. volatile的定义(Java语言规范第3版)：Java编程语言允许线程访问共享变量，为了确保共享变量能被准确和一致地更新，线程应该确保通过排他锁单独获得这个变量。
2. CPU术语

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/The-Art-Of-Java-Concurrency-Programming/Chapter2/7.png)

### 1.1.2. volatile的实现原理
1. Java代码如下

```java
instance = new Singleton(); // instance是volatile变量
```

2. 编译后的汇编代码是

```
0x01a3de1d: movb $0×0,0×1104800(%esi);0x01a3de24: lock addl $0×0,(%esp);
```

3. 发现写操作时会多两行汇编代码
4. lock前缀的指令在多核处理器下会发生两件事情
   1. 将当前处理器缓存行的数据写回系统内存
   2. 写回内存的操作会使得其他CPU里面缓存了该内存地址的数据无效：通过缓存一致性协议完成(每个处理器嗅探总线上的数据来检查自己缓存的数据是否过期)

## 1.2. volatile的实现原则
1. Lock前缀指令会引起处理器缓存写回内存：在多处理器环境中，LOCK#信号确保信号期间，处理器可以独占任何共享内存，不过不锁总线，而是锁缓存(锁定内存区域的缓存并回写到内存，并且使用缓存一致性机制来确保修改的原子性，被称为"缓存锁定")
2. 一个处理器的缓存回写到内存会导致其他处理器的缓存无效：
   1. IA-32处理器和Intel 64处理器使用MESI(修改、独占、共享、无效)协议来维护内部缓存和其他处理器缓存的一致性。
   2. 多核处理器操作时，上述处理器能嗅探其他处理器访问系统内存和他们的内部缓存，保证总线上的一致性。

# 2. volatile的使用优化
1. 在JDK 7的并发包中新增了一个队列集合Linked-TransferQueue，使用追加字节的方式来优化出队和入队的性能。
   1. 优化性能？内部类类型定义了队列的head和tail，这个内部类相对于父类只是将共享变量追加到了64字节，一个对象应用占用4字节，它追加了15个变量，再加上父类的value变量共计64个字节
   2. 为什么64字节可以提高效率？因为i7等处理器的告诉缓冲行都是64字节宽，不知道部分填充缓冲行，意味着如果头尾节点都不足64字节时，处理器会将其都读入一个告诉缓冲行，多处理器中每个处理都有同样的头和尾，当头或尾被修改时可能会导致整个缓存行锁定，从而严重影响队列的入队和出队效率。而填充满后可以保证头尾节点不在一个告诉缓冲行中。
   3. 不适用情况？
      1. 缓存行非64字节宽的处理器
      2. 共享变量不会被频繁地写
   4. 这种情况可能在Java 7中不生效，因为其会淘汰或重拍无用字段。

```java
/** 队列中的头部节点 **/
private transient final PaddedAtomicReference<QNode> head;
/** 队列中的尾部节点 **/
private transient final PaddedAtomicReference<QNode> tail;
static final class PaddedAtomicReference <T> extends AtomicReference T> {
   // 使用很多4个字节的引用追加到 64 个字节
   Object p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, pa, pb, pc, pd, pe;
   PaddedAtomicReference(T r) {
      super(r);
   }
}
public class AtomicReference <V> implements java.io.Serializable {
   private volatile V value;
   // 省略其他代码
｝
```

# 3. synchronized的实现原理与应用
1. synchronized被很多人称为重量级锁，但是在Java SE 1.6的优化后，在某些情况下已经不是那么重了。
2. synchronized实现同步的情况
   1. 普通同步方法：锁当前实例对象。
   2. 静态同步方法：锁当前类的Class对象。
   3. 同步方法块：锁是括号中配置的对象。
3. synchronized的实现原理
   1. JVM基于进入和退出Monitor对象实现方法和代码块的同步。
   2. 代码块同步是minitorenter和monitorexit指令实现。
      1. minitorenter指令是在编译后插入到同步代码块的开始位置。
      2. minitorexit指令插入到方法结束处和异常处。
      3. JVM保证minitorenter和monitorexit两两配对。
      4. 每一个对象都有一个monitor与之关联，当一个monitor被持有后，它处于锁定状态。当
   3. 方法同步是另外一种方法实现的。

## 3.1. Java对象头
1. synchronized用的锁是存在Java对象头里面的。
   1. 数组类型：使用3字宽存储对象头
   2. 非数组类型：使用2字宽存储对象头
2. 对象头长度
   1. Mark Word：32/64 bit，存储对象的hashCode、分代年龄和锁标记位。
   2. Class Metadata Address：32/64 bit，存储到对象类型数据的指针。
   3. Array length：32/64 bit，数组的长度(如果对象是数组)。
3. 对象头存储结构(默认)
   1. 锁状态：有锁、无锁
   2. 25bit：对象hashCode
   3. 4bit：对象分代年龄
   4. 1bit是否是偏向锁
   5. 2bit锁标志位
4. 在运行过程中，Mark Word可能会如下进行变化

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/The-Art-Of-Java-Concurrency-Programming/Chapter2/1.png)

5. 64位虚拟机中，Mark Word是64bit大小的，存储结构如下所示

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/The-Art-Of-Java-Concurrency-Programming/Chapter2/2.png)

## 3.2. 锁的升级与对比
1. Java SE 1.6中，锁的状态，从低到高依次为
   1. 无锁状态
   2. 偏向锁状态
   3. 轻量级锁状态
   4. 重量级锁状态
2. 锁**可以升级但是不能降级**，为了提高**获得和释放**锁的效率

### 3.2.1. 偏向性锁
1. 经研究发现，大多是情况下锁不存在多线程竞争，而且总是由同一个线程多次获得，于是引入了偏向锁。
2. 线程访问同步块并获取锁，会在对象头和帧栈的锁记录里面存储锁偏向的线程ID，之后该线程进入和退出同步块时不需要CAS操作来加锁和解锁。
   1. 测试Mark Word里存储了指向当前线程的偏向锁，成功则表示已经获得锁。
   2. 测试失败：
      1. 测试Mark Word中偏向锁的标识是否设置为1(表示当前为偏向性锁)，如果设置0了则使用CAS将对象头的偏向锁指向当前线程。
      2. 否则使用CAS竞争锁。

#### 3.2.1.1. 偏向锁的撤销
1. 偏向锁只有等到出现竞争时才释放锁。
2. 偏向锁的撤销需要等待全局安全点(没有正在执行的字节码)
3. 步骤:
   1. 暂停拥有偏向锁的线程
   2. 检查持有偏向锁的线程是否活着
      1. 没有活着：将对象头设置为无锁状态
      2. 活着：持有偏向锁的栈被执行，遍历偏向对象的锁记录，栈中的锁记录和对象头的Mark Word要么重新偏向于其他线程，要么恢复到无锁或者标记对象不适合作为偏向锁。
   3. 唤醒暂停的线程。
4. 线程1展示了偏向锁初始化的流程，线程2演示了偏向锁撤销的流程。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/The-Art-Of-Java-Concurrency-Programming/Chapter2/3.png)

#### 3.2.1.2. 关闭偏向锁
1. Java 6和7中偏向锁是默认启用的，但是其在应用程序启动几秒钟之后才激活。
2. 可以使用JVM参数`-XX:BiasedLockingStartupDelay=0`来关闭延迟。
3. 如果确认应用程序中所有的锁通常处于竞争，使用JVM参数`-XX:-UseBiasedLocking=false`关闭偏向锁，程序进入轻量级锁状态。

### 3.2.2. 轻量级锁

#### 3.2.2.1. 轻量级锁加锁
1. 线程在执行同步块之前，JVM会先在当前线程的栈帧中创建用于存储锁记录的空间，并将对象头的Mark Word复制到锁记录中，官方成为Displaced Mark Word。
2. 线程尝试使用CAS将对象头中的Mark Word替换为指向所记录的指针。
   1. 成功：当前线程获得锁。
   2. 失败：其他线程竞争锁，当前线程尝试自旋(消耗CPU，避免无用的自旋)来获取锁。

#### 3.2.2.2. 轻量级锁解锁
1. 轻量级解锁时，使用原子的CAS操作将Displaced Mark Word替换回到对象头
   1. 成功：没有竞争
   2. 失败：有竞争，锁膨胀成重量级锁(锁升级后无法降级，其他尝试获取锁的进程会被阻塞，直到释放后，再次竞争)。

#### 3.2.2.3. 具体示例
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/The-Art-Of-Java-Concurrency-Programming/Chapter2/4.png)

## 3.3. 锁的优缺点对比
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/The-Art-Of-Java-Concurrency-Programming/Chapter2/5.png)

# 4. 原子操作的实现原理

## 4.1. 术语
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/The-Art-Of-Java-Concurrency-Programming/Chapter2/6.png)

## 4.2. 处理器如何实现原子操作
1. Pentium 6和最新的处理器保证单处理器对同一个缓存行里进行16/32/64位的操作是原子的，但是复杂的内存操作处理器不能保证，比如跨总线宽度、跨多个缓存行和跨页表的访问。
2. 但是处理器提供**总线锁定和缓存锁定**两个机制保证复杂原子操作的原子性。

### 4.2.1. 总线锁
1. 多个处理器对共享变量读写操作(Eg. i++)，那么共享变量就会被多个处理器同时操作，可能开始(i = 1，2次写后，i = 2，处理器分别从缓存读取计算后写入系统内存)
2. 解决方法：总线锁(LOCK#信号)，该信号被输出时，其他处理器的请求会被阻塞。

### 4.2.2. 缓存锁
1. 产生原因：总线锁开销大，处理器在某些场合下使用缓存锁替代总线锁完成优化。
2. 缓存锁定是指内存区域如果被缓存在处理器的缓存行中，并且在Lock操作期间被锁定，那么当其执行锁操作写回内存时，处理器不声明LOCK#信号，而是修改内部的内存地址，并允许其使用缓存一致性来保证操作的原子性(当其他处理器写回锁定的缓存行数据时会使缓存行无效)。
3. 不适用场景：
   1. 当操作的数据不能被缓存在处理器内部
   2. 操作的数据横跨多个缓存行
   3. 部分处理器不支持缓存锁定

## 4.3. Java如何实现原子操作

### 4.3.1. 使用循环CAS实现原子操作
1. JVM的CAS操作利用了处理器提供的CMPXCHG指令实现。
2. 自旋CAS实现的基本思路是循环CAS操作指导成功为止。
3. 示例：/Charpter2/Counter实现了基于CAS线程安全的计数器方法safeCount和非线程安全的计数器count
4. Java 5以后JDK的并发包提供类来支持原子操作
   1. AtomicBoolean：原子方式更新的Boolean
   2. AtomicInteger：原子方式更新的Int
   3. AtomicLong：原子方式更新的Long

### 4.3.2. CAS实现原子操作的三大问题

#### 4.3.2.1. ABA问题
1. ABA问题：CAS操作值时需要检查值是否变化，但是可能出现A=>B=>A的更新，即ABA问题，检查时未发现变化，而实际变化了
2. 解决方法：使用版本号，在值上追加版本号，变为1A=>2B=>3A
3. Java 5以后JDK的Atomic包中提供AtomicStampedReference解决ABA问题，这个类的compareAndSet先检查引用是否为预期引用，检查标志是否是预期标志，如果全部相等，则以原子方式将该引用和值设置为新值。

#### 4.3.2.2. 循环时间开销大
1. 自旋CAS长时间不成功，给CPU带来非常大的执行开销。
2. 如果JVM能支持处理器提供的pause指令，则效率会有一定提升
   1. 延迟流水线执行命令
   2. 避免退出循环时因为内存顺序冲突引起CPU流水线被清空。

### 4.3.3. 只能保证一个共享变量的原子性
1. 多个共享变量可以使用锁。
2. 可以将多个共享变量合并成一个共享变量来操作。
3. JDK 5提供AtomicReference类来保证引用对象之间的原子性。

## 4.4. 使用锁实现原子操作
除了偏向锁，JVM实现锁的方式都用了循环CAS。