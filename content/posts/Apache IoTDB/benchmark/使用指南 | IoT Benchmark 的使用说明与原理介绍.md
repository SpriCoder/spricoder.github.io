---
title: 使用指南 | IoT Benchmark 的使用说明与原理介绍
description: IoT Benchmark 是基于 Java 开发的时序数据库测试工具，支持 Apache IoTDB 各版本、InfluxDB 等多款数据库的测试，支持生成模拟数据集和使用真实数据集，可以自配置多种比例的读写混合测试，同样支持基于 Differential Testing 的数据库正确性测试。
date: 2024-01-20 11:00:00
categories: [Benchmark]
mathjax: false
tags: ["IoT Benchmark","时序数据库","基准测试"]
content_type: practice
---

IoT Benchmark 是基于 Java 开发的时序数据库测试工具，支持 Apache IoTDB 各版本、InfluxDB 等多款数据库的测试，支持生成模拟数据集和使用真实数据集，可以自配置多种比例的读写混合测试，同样支持基于 Differential Testing 的数据库正确性测试。

# 1. IoT Benchmark 使用说明
> GitHub 仓库地址：https://github.com/thulab/iot-benchmark

IoT Benchmark 支持多种方式获取，可以通过在 GitHub 仓库右侧直接下载编译好的二进制包，也可以将 GitHub 仓库 Clone 到本地，然后在主目录执行 mvn clean package -DskipTests 完成编译，获取二进制包。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/1.png)

IoT Benchmark 针对每一款被测数据库编译生成测试包，以 Apache IoTDB 1.0 为例，其包结构如下图所示。其中启动脚本为 benchmark.sh(for Linux/MacOS), benchmark.bat(for Windows)，测试配置文件为 conf/config.properties。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/2.png)

启动被测数据库后，修改完成 conf/config.properties 中的相关测试配置参数，执行启动脚本即可启动测试，测试结果会生成在 data/csvOutput 文件夹下，具体描述见用户手册。

# 2. IoT Benchmark 原理介绍
IoT Benchmark 包含**负载生成器、测试客户端线程池、TSDB 接口层和系统监控**等模块。**负载生成器**模块包含元数据生成器、时序数据生成器、查询语句生成器、负载语句模板、时间戳生成器等部分，可以完成真实数据集的读取、模拟数据集的生成、模拟查询语句的生成混合后生成不同特征的测试负载。**测试客户端线程池模块**将使用负载生成器模块生成的负载在具体的数据库上执行测试，在这个过程中**系统监控模块**将统计所有测试数据，并生成测试统计报告。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/3.png)

## 2.1. 测试核心配置与原理说明
IoT Benchmark 目前支持常规测试模式（读写混合负载）、生成数据模式（将数据集生成到文件系统）、单数据库正确性写入模式、单数据库正确性查询模式、服务器资源使用监控模块，本文主要介绍常规测试模式，其他模式将在后续分享中持续更新。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/4.png)

其中，**LOOP 参数**代表每个测试客户端现成执行的操作总数，**OPERATION_PROPORTION 参数**代表执行不同操作的比例。由于具体执行操作类型是通过随机数控制的，在 LOOP 较小的情况下，实际操作比例和配置操作比例略有偏差。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/5.png)

值得一提的是， IoT Benchmark 为了适配部分被测数据库的分布式架构，同样支持**集群模式**，可以通过 **BENCHMARK_CLUSTER 参数**打开，其实现原理是通过元数据划分保证不同 IoT Benchmark 写入不同的数据，例如 BENCHMARK_INDEX = 0 是写入 0 到 DEVICE_NUMBER - 1 号设备，而 BENCHMARK_INDEX = 1 则是写入 DEVICE_NUMBER 到 2 * DEVICE_NUMBER - 1 号设备。通常情况下，每个数据库节点可以配置 1 台集群模式的 IoT Benchmark 进行测试。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/6.png)

## 2.2. 被测数据库配置与原理说明
每个 DataClient 代表一个测试客户端线程。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/7.png)

目前 IoT Benchmark 支持测试 Apache IoTDB 1.0, 0.13, 0.12, 0.11, 0.10, 0.9, InfluxDB 1.x & 2.x, TDengine 2.x & 3.x, Victoriametrics, OpenTSDB, TimescaleDB, KariosDB, SQLite, QuestDB, MSSQLServer 等数据库，具体数据库类型、版本和插入方式可以通过 DB_SWITCH 参数配置，并通过 HOST 等参数配置其他配套参数。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/8.png)

## 2.3. 元数据生成配置与原理说明
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/9.png)

IoT Benchmark 的元数据是并发创建的，并发数可以通过 **CLIENT_NUMBER 参数**配置。可以通过 **CREATE_SCHEMA 参数**来配置测试过程是否首先创建元数据。

IoT Benchmark 的每次测试，涉及 **DEVICE_NUMBER** 个 Device，每个 Device 包含 **SENSOR_NUMBER** 个传感器，传感器的数据类型可以通过 **INSERT_DATATYPE_PROPORTION** 参数配置。在实现过程中，所有的 Device 会根据分组策略 **SG_STRATEGY** 分配到对应的 Client 中去执行创建。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/10.png)

其中，当被测数据库是 Apache IoTDB 时，还可以通过 **GROUP_NUMBER 参数**来配置存储组个数，通过**COMPRESSOR 参数**配置数据压缩方式，通过 **ENCODEING_${TYPE} 参数**配置数据编码方式。

## 2.4. 数据生成配置与原理说明
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/11.png)

IoT Benchmark 的数据同样是并发按 **Batch** 写入的，并发数可以通过 **CLIENT_NUMBER 参数**配置。可以通过 **IS_DELETE_DATA 参数**来配置在每次测试开始前是否首先清理原有数据，通过 **INIT_WAIT_TIME 参数**来配置等待数据清理完成时间，单位为毫秒。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/12.png)

其中每个 Batch 包含 **BATCH_SIZE_PER_WRITE** 行数据，相邻两行时间间隔为 **POINT_STEP**，行间时间间隔是否等长可以通过 **IS_REGULAR_FREQUENCY 参数**配置，如果该参数为 true，则行间时间间隔为 POINT_STEP，否则行间时间间隔为(0, POINT_STEP)区间内的一个随机值。

测试生成数据开始时间为 **START_TIME 参数**配置，生成数据时间精度为 **TIMESTAMP_PRECISION 参数**配置，生成字符串长度为 **STRING_LENGTH**，生成浮点数小数位数为 **DOUBLE_LENGTH**。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/13.png)

此外，IoT Benchmark 还支持生成乱序数据，将 **IS_OUT_OF_ORDER 参数**设置为 true 开启生成乱序数据，可以通过修改 **OUT_OF_ORDER_MODE 参数**修改乱序模式，修改 **OUT_OF_ORDER_RATIO 参数**修改乱序写入比例。

## 2.5. 查询生成配置与原理说明
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/14.png)

IoT Benchmark 的插叙同样是并发执行的，并发数可以通过 **CLIENT_NUMBER 参数**配置，其中可以通过配置 **IS_RECENT_QUERY** 参数来设置优先查询最近数据，可以通过设置 **IS_QUIET_MODE 参数**为 false 打印所有查询语句和统计情况。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/15.png)

测试生成查询的起始时间步长间隔为 **STEP_SIZE**，涉及时间范围的查询的跨度为 **QUERY_INTERVAL**。此外还可以通过 **QUERY_AGGREGATE_FUN** 参数配置具体聚合函数，通过 **QUERY_LOWER_VALUE** 来配置值范围查询的最小值，通过 **GROUP_BY_TIME_UNIT** 来设置 Group By 查询中的组大小。

## 2.6. 测试结果配置与原理说明
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/16.png)

IoT Benchmark 可以通过设置 U**SE_MEASUREMENT 参数**来开启对测试操作时间分布情况的统计，并且通过 **RESULT_PRECISION 参数**来设置统计结果的精度，单位为%。IoT Benchmark 测试过程进度日志可以通过 **LOG_PRINT_INTERVAL 参数**配置，单位为秒。

其中，IoT Benchmark 也支持将过程数据（每次操作数据）进行持久化，可以通过 **TEST_DATA_PERSISTENCE 参数**选择是否进行**过程数据持久化**以及具体的持久化介质。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/17.png)

其中，IoT Benchmark 也支持将测试配置和最终结果持久化到 data/csvOutput下，可以通过 **CSV_OUTPUT 参数**配置。

## 2.7. 测试统计说明
IoT Benchmark 支持对测试耗时、测试结果、测试延迟进行统计。其中，**测试耗时**包含元数据创建耗时（单位为秒）、测试总耗时（不含元数据创建，单位为秒），**结果矩阵**包含 okOperation（执行成功操作数）、okPoint（写入成功点数/查询结果点数）、failOperation（执行失败操作数）、failPoint（写入失败点数）、throughtput（吞吐，点数每秒），延迟矩阵（单位为毫秒）包含Operation（操作类型）、AVG（均值）、MIN（最小值）、MAX（最大值），MEDIAN（中位数）、Pn（对应的n分位数）。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/benchmark/intro/18.png)

在纯写入场景下，okOperation 和 okPoint 满足如下公式：

$$
okPoint = DEVICE\_NUMBER * LOOP \\ okPoint = okOperation * BATCH\_SIZE\_PER\_WRITE * SENSOR\_NUMBER
$$

在纯查询场景下，okOperation 和 okPoint 满足如下公式：

$$
okOperation = CLIENT\_NUMBER * LOOP \\ okPoint = actual\ points
$$

在读写混合场景下，对应的值和 **OPERATION_PROPORTION 参数**有关。

以上便是对于 IoT Benchmark 的使用说明和原理介绍，后续还将继续分享 IoT Benchmark 的更多功能。