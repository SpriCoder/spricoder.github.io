---
title: 2019-计算机组织与结构-lecture08
date: 2020-01-16 19:08:00
description: "2019-计算机组织与结构-lecture08"
categories: [2019-计算机组成与结构]
mathjax: false
tags: ["计算机组成","存储系统","缓存"]
content_type: course
course: computer-organization-2019
course_group: lectures
course_order: 9
---

Cache
---
1. 在存储层次中位于主存之上

# 1. 为什么使用Cache
1. 内存墙的存在

## 1.1. 解决内存墙的方法

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-1.png)

1. Use a smaller, faster cache memory block together with a relatively large and slow main block(同时使用更小，更快的cache存储块和相对比较大，比较慢的存储块)
2. The cache contains a copy of portions of main memory(cache是主存中数据的**部分拷贝**)
3. Located between CPU and memory, and may be integrated inside CPU or as a module on motherboard(位于CPU和内存之间，可以集成在CPU内部或作为主板上的模块)
4. 前提:如何保证fast和Slow是平衡的?
    + 在Fast的路段上快速重复进行访问来寻找需要的相应数据。
5. Cache是Main memory之中的拷贝，而不是崭新的。而且只包含了一部分。

## 1.2. Cache的运行流程

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-2.png)

1. check: 当处理器尝试读取数据的时候，CPU首先确认数据是否在Cache中。when the processor attempts to **read a word** of memory, a check is made to determine if the word is in the cache
    + Hit:找到数据，即命中，将数据传送到Cache中去。if so, the word is delivered to the processor
    + Miss:没找到，首先从主存中将块加载到Cache中，然后从Cache中传递给处理器。if not, **a block** of main memory, consisting of some fixed number of words, is **read into the cache** and then the word is **delivered to the processor**
2. 特殊的是:在Miss的时候，从主存中取出来包含CPU需要的字在内的一个数据块来给Cache，之后从Cache中读取相应目标字。(**注意不是直接取出来的**)
3. 如何判断是否找到?
    + 也就是将cache中的每一行的tag和目标地址的tag进行比较，如果有相同的即为命中。

## 1.3. 关于上述过程的一些问题

### 1.3.1. 如何确定一个东西是否在Cache里面呢?
1.  The von Neumann machine design(冯诺依曼机器结构)
    + The contents of this memory are addressable by **location**, without regard to the type of data contained there 无论什么数据都是以相同的方式被寻址
2. Cache includes **tags** to identify its content’s corresponding **locations** in main memory(Cache包含一个Tag来确认这一行内容对应主存的哪一部分)
3. 因为内存中的数据是由标签来进行指向的，而不是按照数据的类型进行访问。

### 1.3.2. 为什么不直接把字搬过去，而是搬一个块?
1. 因为Principle of Locality(局部性原理)
2. locality of reference，**就是在程序执行的过程中，处理器更倾向于成簇(块)地访问存储器中的指令和数据**。a phenomenon describing the same value, or related storage locations, being frequently accessed (Wikipedia)
3. Types
    1. **Temporal locality(时间的局部性)**: the reuse of specific data, and/or resources, within a relatively small time duration(在相对较短的时间内重用特定的数据或资源)
    2. **Spatial locality(空间的局部性)**: the use of data elements within relatively close storage locations(在相对较短的空间内重读使用特定数据或者资源)
        + **Sequential locality**: a special case of spatial locality, occurs when data elements are arranged and accessed linearly, such as, traversing the elements in a one-dimensional array(空间局部性的一种特殊情况是，当数据元素以线性方式排列和访问时，例如遍历一维数组中的元素)
5. 一般是按照顺序进行存储，我们按照序列来存储。在时间上和空间上是附近稳定的。

一些例子
---
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-3.png)

空间的局部性
---
1.  Use "temporal locality"(使用局部性原理)
2. Typical cache organization(常规的cache组织)

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-4.png)

移动块状结构
---
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-5.png)

1. 按照块来进行表示，在Cache中用Tag记录每一个块的快号，而并不是具体的地址。


### 1.3.3. 为什么cache能节省时间?
1. 搬一个块的时间，要比一次一次搬块内每个单元的时间要快。
    + 找一个地址的时间为t<sub>0</sub>，那么计算易得会少。
    + 程序访问的局部性原理决定了我们命中的概率很高。

**平均访问时间**
---
1. Assume 𝑝 is hit rate, 𝑇<sub>𝐶</sub> is access time of cache, 𝑇<sub>𝑀</sub> is access time of main memory, the average access time when using cache is
    + 𝑇<sub>𝐴</sub> = 𝑝 × 𝑇<sub>𝐶</sub> +(1 − 𝑝)× (𝑇<sub>𝐶</sub> + 𝑇<sub>𝑀</sub>) = 𝑇<sub>𝐶</sub> + (1 − 𝑝) × 𝑇<sub>𝑀</sub> 
    + 𝑇<sub>𝑀</sub> 是从主存中读取的时间，𝑇<sub>𝐶</sub>是从Cache中读取的时间。
2. 那么我们想要p变大或者𝑇<sub>𝐶</sub>更小。
3.  If we want 𝑇<sub>𝐴</sub> < 𝑇<sub>𝑀</sub>, it is required 𝑝 > 𝑇<sub>𝐶</sub> / 𝑇<sub>𝑀</sub>
    + 一步一步往上加，因为有的概率的计算时困难的。
    + 前提:程序访问不是随机的，是由局部性的。
3. 困难: the capacity of cache is much smaller than the capacity of memory(Cache的容量远远小于主存的容量)

# 2. 如何设计一个Cache

## 2.1. 影响因素
1. Cache size cache大小
2. Mapping function 映射函数
3. Replacement algorithm 替换策略
4. Write policy 写策略
5. Line size:块的大小
6. Number of caches 高速缓存器的个数

## 2.2. Cache Size
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-6.png)

1. Increasing cache size will:
    1. Increases hit rate 𝑝
    2. Increases cost and access time of cache 𝑇<sub>𝐶</sub>
        + 有可能会增加查找cache的时间，取决于你寻找的块的可能地址。
2. 为什么随着块的增大，p会放缓，因为过大就不满足**局部性原理**了。
    + 行数过大也没有相应的用处了。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-7.png)

## 2.3. 放置策略
1. An algorithm used to map main memory blocks into cache lines(一种用来把主存中的存储块映射到cache行的算法)
2. A method is needed for determining which main memory block currently occupies a cache line(一种决定覆盖哪一行cache的方法)
3. The choice of the mapping function dictates how the cache is organized(**映射策略**的选择决定了Cache是如何组织)
4. Types
    + Direct mapping 直接映射
    + Associative mapping 全相联映射
    + Set associative mapping 组相联映射
5. 解决的问题:把主存中的存储映射到cache中去。
6. 不同策略会影响什么:一个块进入cache的位置。

### 2.3.1. cache和主存的结构以及对应
1. cache
    + 一行:tag + 行 + 字
    + 一共有m个块，也就是m行
    + tag是主存储器中的一部分，用来识别当前储存的是哪一块。
2. 主存中:字长，每一块(K字)

### 2.3.2. Direct Mapping(直接映射)
1. Map each block of main memory into **only one possible** cache line
    + 前几个块放在一行。
    + 之后几个块放在一行。
    + 之后往下循环下去到底。
2. Assume 𝑖 is cache line number, 𝑗 is main memory block number, 𝐶 is number of lines in cache 𝑖 = 𝑗 𝑚𝑜𝑑 𝐶
    + 这个策略保证每一行的附近都是均衡的
    + 性能会比上一个好
3. 为什么第二个方法会比第一个方法好?
    + 因为第一个很有可能造成反复Miss:比如在两个块的边缘
    + 保证相邻的块可以被同时载入Cache中。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-8.png)
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-12.png)

4. Tag:标记，是主存储器地址中的一个。
    + Highest 𝑛 bits in address, 𝑛 = 𝑙𝑜𝑔<sub>2</sub>𝑀 − 𝑙𝑜𝑔<sub>2</sub>𝐶
    + ![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-9.png)
    + 为了成本，要用尽可能少的位置存储tag
    + 常见的形式:前面表示块号，后面表示块内地址(4个2位，2个1位)
5. 块越大，块内地址位数越多，块号地址越少，块越少。
    + 因为块号和块内地址的二进制长度一定
    + 那么 i = j mod c ,比如 c = 16，**块号的最后四位就决定了它的行(而这是不需要存的)**。根据块号的最后四位来寻找哪些行，我们只要比对块号其余部分中的 tag 和 Cache 中即可，如果相同，则Hit，如果不同，我们根据块号到 Main memory 中寻找到相应的块，将其加载到 Cache 中，然后覆盖新的tag。
    + 取模决定哪一行(相当于分离出来line这些列)
6.  Example
    + Assume cache has 4 lines, each line contains 8 words, and main memory contains 128 words. To access main memory, the length of address is 7 bits. The lowest 3 bits determines which word in the block, the middle 2 bits determines which line is possible, and the highest 2 bits determines which block occupies the cache 假设cache有4行，每行有8个字，主存有128个字。为了访问内存，至少需要7位地址，第三位决定块内地址，中间两位确定cache中对应映射的行，最高位是Tag(标记位)
7. 好处:
    1. 比较方便查找
    2. 很快的查找，check。
8. 缺点:
    1. 两个块被重复使用的话有可能出现**抖动**的现象。(命中率低)
9. 比较适合大容量的cache
10. 直接映射在cache中只能对应一行，而不能对应多个。

## 2.4. 全关联映射
1. 直接映射就是固定一行，那么关联映射是主存中的可以放置在cache中的任意一行。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-10.png)
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-13.png)

2. 必须存储完成的块号而不能进行相应的修正。
3. Eg. Assume cache has 4 lines, each line contains 8 words, and main memory contains 128 words. To access main memory, the length of address is 7 bits. The lowest 3 bits determines which word in the block, and the highest 4 bits determines which block occupies the cache
    + cache行数不可能被任意一个东西决定，而是省下来的所有的信息来进行决定。

### 2.4.1. 全关联映射的 cache
1. 此时的cache的tag是由 tag + word组成

### 2.4.2. 全关联映射的特点
1. 优点:
    1. 避免了抖动现象:Avoid thrashing
2. 缺点:
    1. 需要一块小硬件来遍历 cache 的每一个块号。
    2. Complicated implementation(复杂的实现)
    3. Cache search is expensive, i.e. require to access each line of cache in checking(Cache的查找是高消耗的，需要检查Cache的每一行) 
3. 比较适合小容量的Cache
    + 小容量的Cache的遍历比较快
    + 在小容量的时候使用直接映射的抖动问题明显

## 2.5. 组相联映射

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-14.png)

1. 首先分组(类似直接映射)，然后把每一个块映射到哪一组内确定哪一行(类似关联映射)
2. Cache is divided into a number of sets, each set contains a number of lines, and a given block maps to any line in a given set(Cache被划分一组组，每一组包含一定数量的行，并且每一个块被映射到指定的一组中)
3. Assume 𝑠 is set number, 𝑗 is main memory block number, 𝑆 is number of sets in cache 𝑠 = 𝑗 𝑚𝑜𝑑 𝑆
    + 用块号对**组数**取模，组数是比较大的。
4. K-way set
    + 𝐾 = C/S
    + K路:每一组中**行**的个数，一般是比较小的数字。
    + Eg.八行分为四组，是二路组
5. 组内策略是未必是随机的。

### 2.5.1. Cache结构

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt8/cpt8-11.png)

1. Eg.Assume cache has 4 lines which are divided into 2-way set, each line contains 8 words, and main memory contains 128 words. To access main memory, the length of address is 7 bits. The lowest 3 bits determines which word in the block, the middle 1 bit determines which set in the cache, and the highest 3 bits determines which block occupies the cache

2. 因为是4组，2路组，所以我们使用log<sub>2</sub>(组数)来，我们根据组数来确定。

### 2.5.2. 特点
1. 组相联映射兼具直接映射和关联映射的特点。
2. Advantages
    + Combine the advantages of direct mapping and associate mapping(结合直接映射和全相联映射的优点)
3. Disadvantages
    + Combine the disadvantages of direct mapping and associate mapping(结合直接映射和全相联映射的缺点)
    + Make a good trade-off for arbitrary capacity cache(对任意容量缓存进行良好的折衷)
4. 在组关联映射和全关联映射中，替换策略不同的情况下可能导致时间不同

### 2.5.3. 和直接映射和关联映射的特点
1. K=1，则为直接映射
2. K=C，则为关联映射

## 2.6. 关联性(自由度)
1. 是指一个块的可以被放置在的位置的数字。number of possible cache lines for each block in main memory
2. 直接映射:1
3. 关联映射:C
4. 主关联映射:K

### 2.6.1. 特点
1. 关联性越小，命中率越低。 The lower correlation is, the lower hit rate is
    + Direct mapping is the lowest in hit rate, and the associative mapping is the highest(直接映射的命中率是最低的，组相联映射的命中率是最高的)
2. 关联性越小，check时间越少。The lower correlation is, the quicker checking is
    + Direct mapping has the least check time, and associative has the most check time(直接映射的检查耗时最短，全相联映射的检查耗时最长)
3. 关联性越低，tag越短，The lower correlation is, the shorter tag is
    + Direct mapping is the shortest tag, and the associative mapping is the longest tag(直接映射的Tag最短，全相联映射的Tag最长)

## 2.7. cache的相应图片解释

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-COA19/img/cpt3/cpt3-03.jpg)

1. 直接映射:先把中间c位数据取出来，决定需要对比的行号，然后选中cache中的一行，然后我们在此取出前t位，然后进入比较器进行比较，如果相同即为命中。
2. 关联映射:传来m位的标记，此时我们需要将目标和cache的每一行的tag进行比较直到最后。
    + 如果相同即为Hit
    + 如果到最后仍然没有相同，那么结果则为Miss
3. 整体来说，首先从主存中确定出Cache地址，然后确定tag是否命中，存储中一个存储tag，一个存储数据

# 3. 替换算法
1. 替换的目标是:我们替换的是被用到可能性最低的块。
2. Once the cache has been filled, when a new block is brought into the cache, one of the existing blocks must be replaced(一旦缓存被填满，当一个新的块被带入缓存时，必须替换现有块中的一个。)
3. For direct mapping, there is only one possible line for any particular block, and no choice is possible(直接映射对于每一块只有确定一行，没有别的可能性)
4. For the associative and set-associative mappings, a replacement algorithm is needed, which must be implemented in hardware(对于全相联映射和组相联映射，需要实现在硬件层面的替换算法)

## 3.1. 替换算法的具体类型
1. Least Recently Used (LRU)
2. First In First Out (FIFO)
3. Least Frequently Used (LFU)
4. Random(随机替换)

### 3.1.1. Least Recently Used (LRU) 最近最少用
1. 根据最近一次被用到的时间来进行排序
    + 但是我们不能在一个Cache里面进行排序。
    + 以下以二路组为例:如果我们一行被用则我们将一位置为1，然后我们另外一路置为0。
2.  Replace a set of blocks in cache having the longest time of having no references to it(替换目前Cache中最长时间没有被用到一块)
3. Assumption: more recently used memory locations are more likely to be referenced(假设最近被用到的块更加可能被再次用到)
3. Implementation for two-way set associative mapping(对于二路组组相联映射的实现)
    + Each line includes a USE bit(每一行使用一个USE位)
    + When a line is referenced, its USE bit is set to 1 and the USE bit of the other line in that set is set to 0(对于二路组，必然一个为1，而另一个为0)
    + When a block is to be read into the set, the line whose USE bit is 0 is used(当一个块需要被写入这个组的时候，写入USE位为0的哪一行)

### 3.1.2. First In First Out (FIFO) 先进先出
1. 和使用时间没有关系，而是根据进入的时间来进行排序。
2. Replace the set of blocks in cache that has been in the cache for the longest time(替换进入到Cache时间最长的一行)
3. Assumption: later used memory locations are more likely to be referenced(建设越靠后使用的内存数据更加可能被再次使用)
4. Implementation: round-robin or circular buffer technique(实现:循环或循环缓冲技术)
5. 四路组的时间:我们只需要一个轮询器即可，从第一个轮询到第二个。

### 3.1.3. Least Frequently Used (LFU)最不经常用
1. 根据我们在过去的一段时间中被使用的次数。
2. Replace the set of blocks having the least number of references(替换Cache中使用次数最少的部分)
3. Assumption: more frequently used memory locations are more likely to be referenced(假设:使用次数多的部分更可能被再次使用)
4. Implementation: associate a counter with each line(使用一个计数器来实现)
5. 和LRU不同:这个是根据次数，而另一个是根据时间。

### 3.1.4. Random
1. Replace that block in cache or the set randomly(随机替换Cache中一行)
2. Assumption: each memory location is similar to be referenced(假设:每一行被调用的可能性是均等的)
3. Implementation: randomly replace(实现:随机替换)
4. random replacement provides only slightly inferior performance to an algorithm based on usage(随机替换只提供比基于使用情况的算法稍差的性能)
5. 随机命中在实验中也体现出了很好的性能。

### 3.1.5. 计算命中率
1. 首先计算相应部分的数据存储到了哪一块。
    + 这个务必要算清，保证可以确定是都命中。
2. 一开始cache中没有数据块的时候，必然Miss，然后加载相应模块

## 3.2. 写机制
1. 在被替换前要被写回去，没有被修改无所谓是否被写回去。
2.  Consistency between memory and cache(内存和Cache之间的一致性)
    + When a block in cache is being replaced, it should consider whether the block has been altered(当块被替换回去的时候，我们应当考虑记录下这个块是否被替换过)
3. Two cases(两种情况)
    + If not altered, it may be overwritten with a new block without any other operation(如果没有被替换过，直接在这里重写崭新的块即可)
    + If altered, the block in main memory must be updated before replacement(如果这一块被替换，那么主存应该在替换前更新里面对应的块的数据)
4. Policy
    + Write through(直写)
    + Write back(回写)

### 3.2.1. 写入操作
1. 一旦有写操作，那么要尽快把Cache中的数据写回到内存。
    + 在某些机器中，多个CPU可能会访问同时间访问一块内存，那么如果不同步会出现问题。
    + 在某些IO模块中，可以通过特定的硬件来访问内存直接进行修改

### 3.2.2. 写回操作
1. 我们只有在一个**块**被写回的时候，我们才进行写回操作。
2. 我们使用了脏位来进行判断，如果脏位为1，则进行更新。
3.  Updates are made only in the cache, and when a block is replaced, it is written back to main memory if and only if it is altered(更新只会发生在Cache中，让块被替换的时候才会写回主存)
4. Use a dirty bit, or use bit, to represent whether a block is altered( 使用一个脏位或者USE位来表示这个块的数据已经被修改过了 )
5. Advantage
    + Minimizes memory writes(最小化内存的写入)
6. Disadvantages
    + Portions of main memory are outdated, and hence accesses by I/O modules can be allowed only through the cache, which makes for complex circuitry and a potential bottleneck(部分主存已过时，因此I/O模块只能通过高速缓存进行访问，这会造成复杂的电路和潜在的瓶颈)

## 3.3. 行大小
1. 假设前提:我们认为Cache的整个的大小已经确定的时候
2. 结论:Cache的行大小增加，命中率会先升高再降低
    + 利用了空间的局部性，行在一定程度内增加，会提高命中率。
    + 之后行长度过长的时候，不满足空间的局部性，同时行数会变少，出现抖动现象，降低命中率。
3. As the line size increases from very small to larger(当行的长度从很小逐渐变大的过程中)
    + Hit ratio increases(命中率提高)
        + More useful data can be brought into the cache(更多有用的数据被加载到cache中)
4. As the line becomes even larger(当行大小进一步变大)
    + Hit ratio decreases(命中率降低)
        + Larger blocks reduce the number of lines in a cache, which leads to frequent replacement of lines(**更大的块减少了cache中的行数**，导致了某些行的经常性替换(抖动))
        + Each additional word is farther from the requested word and therefore less likely to be needed in the near future(每一个附加单词都离请求的单词较远，因此在不久的将来不太可能需要)
5. The relationship between block size and hit ratio is complex(块大小和命中率之间的关系是复杂的)

# 4. Cache的块数
1. Single or two level(单个或者两个层级)
    + Single(一个)
        + Integrates a cache on the same chip as the processor(在与处理器相同的芯片上集成缓存)
        + Reduces external bus activity and speeds up execution(减少了外部总线的使用频率并且加快了处理的速度)
    + Two level
        + Reduces the processor's access of DRAM or ROM memory across the bus when L1 misses(减少了处理器在L1为命中时通过总线对于DRAM和ROM存储器)
        +  Uses a separate data path instead of system bus for transferring data between the L2 cache and the processor(使用了被隔离开的数据通道而不是总线来再L2和处理器之间处理信息)
        + Some processors incorporate L2 cache on processor chip(一些处理器把L2缓存器集成在处理器芯片上)
2. 目前一般是三级Cache
3. 整体排列形式:横向排列为(C<sub>1</sub>,C<sub>2</sub>,C<sub>3</sub>),大小:C<sub>3</sub>>C2>C1
    + 访问形式:类似Cache和主存的关系。
    + 记住要搬运这一块。
4. Unified or split(统一或者分割)
    + Unified(统一)
        + Higher hit rate for automatic balancing of load between instruction and data(提高指令与数据负载自动平衡的命中率)
        + Only one cache is needed to be designed and implemented(只有一个cache需要被设计和实现)
    + Split(分隔)
        + Eliminate contention for the cache between the instruction fetch/decode unit and the execution unit, which is important to the pipelining of instructions(消除指令获取/解码单元和执行单元之间对缓存的争用，这对指令的流水线很重要)


## 4.1. 计算平均访问时间
1. 我们假设第一级的访问时间为T<sub>1</sub>，第二季访问时间T<sub>2</sub>，第三级访问时间为T<sub>3</sub>,访问主存的时间为TT<sub>M</sub>。第一级命中概率为P<sub>1</sub>，一二级联合命中率为P<sub>2</sub>，一二三级联合命中率为P<sub>3</sub>。
    + TA = T<sub>1</sub> +(1-P<sub>1</sub>)T<sub>2</sub>+(1-P<sub>2</sub>)T<sub>3</sub>+(1-P<sub>3</sub>T<sub>M</sub>
    + 计算技巧:一步一步进行计算，第一级肯定有，然后一级级进行计算。
