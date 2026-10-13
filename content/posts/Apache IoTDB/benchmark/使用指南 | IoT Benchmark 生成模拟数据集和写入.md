---
title: 使用指南 | IoT Benchmark 生成模拟数据集和写入
description: IoT Benchmark 是基于 Java 开发的时序数据库测试工具，支持 Apache IoTDB 各版本、InfluxDB 等多款数据库的测试，支持生成模拟数据集和使用真实数据集，可以自配置多种比例的读写混合测试，同样支持基于 Differential Testing 的数据库正确性测试。
date: 2024-01-20 11:00:00
categories: [Benchmark]
mathjax: false
tags: ["IoT Benchmark","时序数据库","基准测试","写入负载"]
content_type: practice
---

IoT Benchmark 是基于 Java 开发的时序数据库测试工具，支持 Apache IoTDB 各版本、InfluxDB 等多款数据库的测试，支持生成模拟数据集和使用真实数据集，并且完成多种配置的读写混合测试。本文主要介绍了如何使用 IoT Benchmark 生成模拟数据集和加载外部数据集。

# 1. 生成模拟数据集
IoT Benchmark 支持将生成的模拟数据集持久化到本地，修改如下的配置：

```properties
# 目前Benchmark支持多种运行模式，支持模式如下
# testWithDefaultPath   常规测试模式，支持多种读和写操作的混合负载
# generateDataMode      生成数据模式，生成Benchmark本身识别的数据
# verificationWriteMode 单数据库正确性写入模式，需要配置 FILE_PATH
# verificationQueryMode 单数据库正确性查询模式，需要配置 FILE_PATH
# serverMODE            服务器资源使用监控模式（该模式下运行通过ser-benchmark.sh脚本启动，无需手动配置该参数）
BENCHMARK_WORK_MODE=generateDataMode
################ 真实数据集：测试数据 #####################
# 如下两个参数，当且仅当BENCHMARK_MODE = verificationWriteMode 和 verificationQueryMode 时生效
# 数据文件地址
FILE_PATH=data/test
# 每个数据文件包含的Batch个数
BIG_BATCH_SIZE=100
```

执行模拟数据集生成，我们得到如下结构的数据集：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/generate/1.png)

info.txt 文件是本数据集的相关配置信息，在后续执行数据集写入时会校验该配置是否与当前测试配置一致。如果不一致会拒绝写入，可以通过修改当前测试配置来完成写入。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/generate/2.png)

schema.txt 文件是本数据库的相关元数据配置，该文件每行包含设备名、传感器名和传感器类型，上述三个属性通过空格分隔开。其中，传感器类型0-5分别代表 BOOLEAN、INT32、INT64、FLOAT、DOUBLE、TEXT 类型。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/generate/3.png)

数据集内对应文件夹下的 csv 文件为本数据集的数据文件，每一个 csv 文件中包含 `BIG_BATCH_SIZE` 个 batch，每个 batch 均由 `Sensor,s_0,s_1,s_2,s_3,s_4,s_5,s_6,s_7,s_8,s_9...` 表头开始。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/generate/4.png)

# 2. 写入生成的模拟数据集
在完成模拟数据集生成后，修改如下配置后执行模拟数据集写入并获取对应的统计结果：

```properties
# 目前Benchmark支持多种运行模式，支持模式如下
# testWithDefaultPath   常规测试模式，支持多种读和写操作的混合负载
# generateDataMode      生成数据模式，生成Benchmark本身识别的数据
# verificationWriteMode 单数据库正确性写入模式，需要配置 FILE_PATH
# verificationQueryMode 单数据库正确性查询模式，需要配置 FILE_PATH
# serverMODE            服务器资源使用监控模式（该模式下运行通过ser-benchmark.sh脚本启动，无需手动配置该参数）
BENCHMARK_WORK_MODE=verificationWriteMode
```

此外，还可以通过对生成的模拟数据集进行修改以满足更丰富的测试需求，只需要保证info.txt，schema.txt 和 具体的数据文件保持一致即可。