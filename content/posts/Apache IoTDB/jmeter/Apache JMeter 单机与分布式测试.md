---
title: Apache JMeter 单机与分布式测试
description: Apache JMeter 是 Apache 基金会下的一款开源软件，可以用于测试静态和动态资源、Web 动态应用程序等的性能。其可以用于模拟服务器、服务器组、网络或对象上的重负载，以测试其强度或分析不同负载下的整体性能。
date: 2024-01-20 11:00:00
categories: [Benchmark]
mathjax: false
tags: ["JMeter","性能测试","分布式系统"]
content_type: practice
---

# 1. Apache JMeter 介绍
Apache JMeter 是 Apache 基金会下的一款开源软件，可以用于测试静态和动态资源、Web 动态应用程序等的性能。其可以用于模拟服务器、服务器组、网络或对象上的重负载，以测试其强度或分析不同负载下的整体性能。

Apache JMeter 支持的功能包括但不限于：

* 能够加载和性能测试许多不同的应用程序/服务器/协议类型
* 全功能测试 IDE，允许快速记录测试计划（从浏览器或本机应用程序）、构建和调试。
* CLI 模式（命令行模式（以前称为非 GUI）/无头模式）可从任何 Java 兼容操作系统（Linux、Windows、Mac OSX 等）进行负载测试
* 完整且随时可以呈现的动态 HTML 报告
* 通过从最流行的响应格式、HTML、JSON、XML 或任何文本格式中提取数据的能力，轻松关联
* 完全的可移植性和 100% Java 纯度。
* 完整的多线程框架允许多个线程并发采样，并允许单独的线程组同时采样不同的功能。
* 测试结果的缓存和离线分析/重放。
* 高度可扩展的核心

# 2. 单机测试

## 2.1. 创建线程组
首先，我们执行 jmeter 命令启动 Apache JMeter，进入图形化界面后可以点击 Test Plan 首先添加线程组：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/1.png)

在配置线程组部分，我们可以配置线程组的名称、备注、异常处理方式和基本配置：

* 异常处理方式：继续执行、开启下一个线程组、停止线程、停止测试（不创建新的，待其他测试结束）、立即停止测试。
* 线程数：执行测试的线程数量
* Ramp-up period：JMeter 需要再在多久内启动全部线程，如果 Ramp-up period 是400s，有 40 个线程，就意味着JMeter 需要花费 400 s 时间完成 40 个线程的启动，如果设置为0，则为立即启动全部线程
* Loop Count：重复次数
* 同时也允许配置每个循环的情况等其他配置

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/2.png)

## 2.2. 创建示例测试
创建完成 Thread Group 后需要配置具体测试，JMeter 提供了种类丰富的预定义模板，并且支持自定义 Java Request。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/3.png)

本文以 Java Request 为例：

* Java Request 的使用方式为将自己编写的 Jar 包放置到 Apache JMeter 目录的 /lib/ext 下（不支持热加载，Apache JMeter 每次启动时加载）
* 如下右图所示，本文使用了自己编写的 org.apache.iotdb.jmeter.testJmeterTest 类执行测试，该类的执行方法中定义了 op_count 和 database 两个参数

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/4.png)

## 2.3. 如何才能编写可以被识别的测试包呢？
首先，创建测试类，继承AbstractJavaSamplerClient这一JMeter提供的抽象类，实现如下四个方法：

1. `public Arguments getDefaultParameters()`：定义默认配置参数的值
2. `void setupTest(JavaSamplerContext jsc)`：读取配置参数的值并初始化测试
3. `SampleResult runTest(JavaSamplerContext javaSamplerContext)`：执行测试
4. `void teardownTest(JavaSamplerContext args)`：结束测试并清理环境

其次，如果在 IDEA 中进行代码编写时需要引入 `ApacheJMeter_core.jar` 包和 `ApacheJMeter_java.jar` 包，以示例代码仓库为例，需要在 `pom.xml` 文件中添加如下内容：（请保证这个 jar 包和你使用的 Apache JMeter 版本一致，这两个 Jar 包可以从 Apache JMeter 安装目录下 /lib/ext 文件夹中获取）

```xml
<dependency>
    <groupId>org.apache.jmeter</groupId>
    <artifactId>jmeter_core</artifactId>
    <version>1.0</version>
    <scope>system</scope>
    <systemPath>${basedir}/src/main/lib/ApacheJMeter_core.jar</systemPath>
</dependency>
<dependency>
    <groupId>org.apache.jmeter.protocol</groupId>
    <artifactId>jmeter_java</artifactId>
    <version>1.0</version>
    <scope>system</scope>
    <systemPath>${basedir}/src/main/lib/ApacheJMeter_java.jar</systemPath>
</dependency>
```

最后，请将打包好的 jar 包放置到 Apache JMeter 安装目录下的 /lib/ext 文件夹中，同时将本项目依赖的所有 jar 包都放置到 /lib/ext 中，**避免无法找到目标类**

示例代码仓库：https://github.com/SpriCoder/iotdb-jmeter/tree/TPCx-IoT

### 2.3.1. 如何自定义测试参数
很显然，在很多测试场景下，我们需要自动化生成测试参数或者需要我们制定测试参数，此时我们可以通过给当前的测试添加 Config Element，包括 Counter、CSV DataSet Config等，本文以 CSV DataSet Config 为例：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/5.png)

同样，CSV Data Set Config 支持许多的自定义配置，包括：

* 配置文件路径：需要注意在分布式测试中，所有机器上的配置文件配置路径需和此处一致。
* 文件编码格式：选择文件使用的编码格式，不填默认为 UTF-8
* 定义变量名：变量名称，使用逗号分割，格式$name。可以看到在创建第一个测试过程中，变量 Value 部分我们引用了这里的变量
* 是否忽略首行
* 分割符
* 是否允许引用数据
* 读到文件末尾是否循环读取（Recycle on EOF）：到了文件尾处，是否循环读取参数。因为CSV Data Set Config一次读入一行，分割后存入若干变量交给一个线程，如果线程数超过文本的记录行数，那么可以选择从头再次读入
* 读到文件末尾是否停止线程(Stop thread on EOF)：到了文件尾处，是否停止线程，和Recycle on EOF会有矛盾
  * 当Recycle on EOF 选择true时，Stop thread on EOF选择true和false无任何意义，通俗的讲，在前面控制了不停的循环读取，后面再来让stop或run没有任何意义
  * 当Recycle on EOF 选择flase时，Stop thread on EOF选择true，线程4个，参数3个，那么只会请求3次
  * 当Recycle on EOF 选择flase时，Stop thread on EOF选择flase，线程4个，参数3个，那么会请求4次，但第4次没有参数可取，不让循环，所以第4次请求错误
* 共享模式：All threads –所有线程，Current thread group—当前线程组，Current thread—当前线程。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/6.png)

### 2.3.2. 更多测试配置
在测试前后仍然可以添加Assertions、Timer、Pre Processors、Post Processors等部分来自定义完成更丰富的测试配置，这里不做展开。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/7.png)

## 2.4. 监听并生成测试报告
可以根据测试具体需求，添加监听并生成测试报告，具体内容如下：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/8.png)

## 2.5. Aggregate Report
可以生成聚合报告，该组件可以在测试完成后单独导出数据，数据包括测试数、平均测试时间、中位数测试时间、P90测试时间、P95测试时间、P99测试时间、最小值、最大值、错误率、吞吐量、接收量、发送量。如果想要输出到文件可以配置 Filename，支持测试后保存数据。该组件和 Summary Report 非常相似，在统计值类型上略有不同

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/9.png)

## 2.6. Aggregate Graph
可以生成聚合图，具有和 Aggregate Report 组件相同的数据，但是可以生成图像来显示数据分布情况。如果想要输出到文件可以配置 Filename，同样支持测试后保存图像和数据。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/10.png)

## 2.7. Graph Results
将测试结果图像化显示，可以选择显示原始数据、平均值、中位值、离群值和吞吐等。输出该图需要在测试前配置 Filename。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/11.png)

## 2.8. View Results in Table
将测试结果以表格形式显示，包括测试编号，开始时间、线程名称、标签、执行时间等信息，输出该表格需要在测试前配置 Filename。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/12.png)

## 2.9. View Results in Tree
将测试结果以树形形式显示，包括测试编号，开始时间、线程名称、标签、执行时间等信息，可以点击每一个请求查看具体的 Sampler result，输出该表格需要在测试前配置 Filename。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/13.png)

# 3. 分布式测试
在许多场景中，我们需要多台机器同时执行测试，并且将测试结果进行汇总，此时就需要使用 Apache JMeter 分布式测试，其本质是将测试的 jmx 文件发送到每一个 Slave 节点上执行测试，再由每一个 Slave 节点机器将测试结果汇报给控制机 Controller，如下图所示：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/14.png)

## 3.1. 环境准备
在执行测试前，我们需要完成集群环境的准备：

首先，需要保证 controller 机器同所有 slave 机器网络联通。

之后，需要将本次测试使用的全部 jar 包等文件上传到 slave 机器的对应位置上，保证 jmeter-server 启动后可以访问，同时关闭 jmeter-server 的 ssl 避免（修改 $JMETER_HOME$ 下的 /bin/jmeter.properties）：

```properties
# Set this if you don't want to use SSL for RMI
server.rmi.ssl.disable=true
```

随后，需要在每个 slave 机器上启动 JMeter-Server（启动命令 ./$JMETER_HOME$/bin/jmeter-server），默认情况下 JMeter-Server 侦听 1099 端口，可以通过查看 jmeter.log 查看具体侦听端口

最后，需要在 controller 机器上配置远程节点，修改 $JMETER_HOME$ 下的 /bin/jmeter.properties：

```properties
# Remote Hosts - comma delimited
remote_hosts=11.101.17.17:1099,11.101.17.18:1099,11.101.17.33:1099

# Set this if you don't want to use SSL for RMI
server.rmi.ssl.disable=true
```

## 3.2. 执行测试
> 分布式运行时，总并发数是脚本中设置的线程数 * slave机的个数，如线程数设置为1，使用3个slave机运行，则总并发数是3

本地启动 jmeter，编写好配置文件（JMX文件），然后点击 Run内的Remote Start All启动测试

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/14.png)

测试完成后会将全部的测试结果返回给 controller 机器，并根据配置生成对应报告

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/jmeter/15.png)

# 4. 参考
1. 参数化传递：https://blog.51cto.com/u_15076215/3806562
2. 分布式参数化：https://www.cnblogs.com/qlling/p/13647124.html
3. CSV 参数说明：https://www.cnblogs.com/insane-Mr-Li/p/10766781.html
4. 命令行运行与生成报告：https://www.cnblogs.com/kongzhongqijing/p/7216693.html
5. 命令行运行JMeter详解（详解教程）：https://cloud.tencent.com/developer/article/1803268
6. Jmeter 分布式压力测试：https://www.cnblogs.com/crazymakerc