---
date: 2026-10-11
permalink: benchmarking/tsfile-dataset/03/
title: 玩转 TsFile｜03-什么时候用 TsFile，什么时候用 IoTDB？
series: 玩转时序数据集
series_order: 3
tags: ["时序数据集","TsFile","IoTDB","数据流转"]
content_type: series
---

玩转 TsFile｜03-什么时候用 TsFile，什么时候用 IoTDB？

同一份时序数据，在离线交付和在线查询时需要的工具不同。本文以 `sensors.tsfile` 为例，说明如何选择文件工具、数据库工具或 SDK。

本篇回到导读提出的“可流转”价值：根据任务在本地文件、在线数据库和程序接口之间选择合适的入口。

选择时先看任务：只是检查一个文件，还是需要持续写入、多人查询与统一管理？如果要把读写逻辑放进长期运行的应用，还需要考虑 SDK。

## 从数据载体到访问工具

```text
TsFile                   数据集的文件载体
TsFile-Cli               单个本地 TsFile 的命令行访问入口
IoTDB CLI / 导入导出工具  运行中数据库实例的管理和数据交换入口
TsFile / IoTDB SDK       应用程序中的复杂、长期、可编程逻辑
Skill                    面向 AI 的任务分解、工具选择与结果检查指引

```

TsFile 为时序数据提供统一载体；IoTDB 承接数据库管理与在线服务需求；TsFile-Cli 将本地文件能力接入 Unix 工具链；Skill 进一步支持 AI 对这些能力的调用。SDK/API 用于将底层能力嵌入应用程序。明确这些层次，可以根据任务选择合适的入口。

| 任务 | 首选 | 原因 |
|-|-|-|
| 查看一个本地文件的模型、schema 和少量数据 | TsFile-Cli | 可直接使用命令行完成，可以直接启动服务和编写 Reader |
| 创建一个明确 schema 的单个表模型文件 | TsFile-Cli write | 目标窄、可回读、提交边界清楚 |
| 查看 marker、Chunk、Page 和偏移 | TsFile-Cli sketch / 格式调试工具 | 面向物理布局排障 |
| 复杂程序内读写、变换或嵌入应用 | TsFile SDK/API | 控制力更完整 |
| 目录中多个文件的例行检查 | Shell 编排 TsFile-Cli | Shell 发现和调度文件，CLI 逐个检查 |
| 目录级批量导入或格式转换 | 对应工具的专用批处理工具 | 依据工具支持的格式、模型和规模选择 |
| 持续写入、多用户查询、SQL 聚合、权限和 TTL | IoTDB | 数据集需要在线服务能力 |
| 将已有 TsFile 纳入实例 | IoTDB LOAD | 这是数据库实例的加载职责 |
| 从 IoTDB 导出为可携带 TsFile | IoTDB 导出工具 | 先从服务世界生成文件，再交给 TsFile-Cli |
| AI 查看本地 TsFile | TsFile-Cli + Skill | 命令、格式、退出码和失败分支稳定 |

## 场景一：收到一个文件，先在本地判断

收到一份数据文件后，可以先在本地确认表名、字段类型并抽查记录。下面使用四行机房演示数据，读取北京机房的两条记录：

```bash
tsfile-cli meta -f csv sensors.tsfile
tsfile-cli ls -f csv sensors.tsfile
tsfile-cli schema -t sensors -f csv sensors.tsfile
tsfile-cli head -t sensors --tag-filter site eq beijing -n 2 -f csv sensors.tsfile

```

这些操作只涉及一个本地文件，结果既可以在终端查看，也可以交给脚本处理。

示例中北京 rack-a 的温度为 24.6 和 25.1，上海 rack-b 的温度为 28.9 和 29.4。摄氏度、相对湿度百分比和 Unix 毫秒时间戳均为本专栏的数据约定，应随文件一并说明，应结合配套说明理解。

## 场景二：数据需要持续被多人使用

多个团队需要查询同一批数据，或需要持续写入、SQL 聚合和权限管理时，可以将数据加载到 IoTDB。按第 05 篇准备表模型会话、目标数据库和毫秒时间精度后，执行以下语句。文件路径须对加载端可见：

```SQL
LOAD '/absolute/path/sensors.tsfile'
WITH ('database'='tsfile_cli_demo', 'on-success'='none')
```

进入实例后，再通过 table SQL 查询：

```SQL
SELECT site, rack, avg(temperature)
FROM tsfile_cli_demo.sensors
GROUP BY site, rack;
```

TsFile 解决数据怎样被携带，IoTDB 解决数据怎样被持续服务。`LOAD` 把两者连接起来，但 `LOAD` 属于 IoTDB，属于 IoTDB 命令，TsFile-Cli 专注文件操作。

协作分析完成后，可以通过 IoTDB 导出工具生成 table-model TsFile，再交给 TsFile-Cli 回读。该场景说明数据如何由文件交付转为在线协作，再返回文件形态；四行样例仅验证基本操作，应据此推断生产规模下的性能。

## 场景三：命令行开始变成应用程序

需要跨文件索引、复杂状态管理、重试恢复或长期运行的服务时，SDK 通常更便于组织程序和测试。命令行则适合检查、转换和交换文件等独立任务。

可以用一个朴素标准判断：如果同一段 shell 已经需要维护大量临时状态、隐式缓存和复杂恢复逻辑，它很可能已经进入需要正式接口和测试的程序阶段。

## 三个常见误区

### 误区一：有 TsFile 就等于已经进入某个 IoTDB 实例

TsFile 是 IoTDB 原生认识的数据载体，但只有目标实例成功执行 `LOAD` 并完成回读，数据才真正进入该实例。更准确的说法是：拿到一个合法 TsFile，数据已经拥有进入 IoTDB 生态的标准入口。

### 误区二：入口连续性与物理存储方式属于两个层面

“连续”描述的是用户可以直接自写逐行转换程序、schema 能够被承接；它不承诺 IoTDB 内部继续保留同一个物理文件。加载过程仍可能校验、传输、拆分或重新组织 TsFile。

### 误区三：AI Skill 会消除工具边界

Skill 能告诉 AI 先执行什么命令、怎样解释输出、失败时何时停止，但TsFile-Cli 专注文件操作，SQL、服务管理和文件修复由对应工具承担。AI 负责理解任务，确定性工具负责执行，边界仍然存在。

## 一个简单判断法

查看本地文件，使用 TsFile-Cli；查询和管理数据库实例，使用 IoTDB 工具；将读写功能嵌入应用，使用 SDK。

还可以把决策压缩成三个问题：

1. 输入对象是一个本地文件，还是一个正在运行的实例？
2. 任务是一次检查和交换，还是持续查询与管理？
3. 逻辑能否由少量确定性命令表达，还是需要长期维护的程序状态？



文件与数据库之间通过加载和导出工具连接：

```Plaintext
本地 TsFile --IoTDB LOAD--> 在线表
本地检查 <--IoTDB 导出-- 在线表
```

排查问题时，也按同样的分工定位：文件读取看 TsFile-Cli 的诊断，加载与在线查询看 IoTDB 的返回结果和服务日志。

## 继续阅读

[上一篇：从元数据到数据行](https://apache-iotdb-project.feishu.cn/docx/M1IRd82rso1rnuxgEvUcLVlWned) · [下一篇：让 TsFile 像 Unix 文件一样进入工具链](https://apache-iotdb-project.feishu.cn/docx/OWmCdYG97ojuJLx6OyOcUbx4nRf) · [准备进入 IoTDB？看 LOAD 实操](https://apache-iotdb-project.feishu.cn/docx/Ni7Kdaiv3oLBhYxKMNNcFRuqnqs) · [返回专栏目录](https://apache-iotdb-project.feishu.cn/docx/R0Sydx5Klo4cUSxKnB9cgIkAnLb)