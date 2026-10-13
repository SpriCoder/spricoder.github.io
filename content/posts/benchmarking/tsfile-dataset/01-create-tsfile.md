---
date: 2026-10-11
permalink: benchmarking/tsfile-dataset/01/
title: 玩转 TsFile｜01-从 CSV 到 TsFile：自描述的时序数据集
series: 玩转时序数据集
series_order: 1
tags: ["时序数据集","TsFile","TsFile-Cli"]
content_type: series
---

玩转 TsFile｜01-从 CSV 到 TsFile：自描述的时序数据集

一份 CSV 可以保存温度记录，却通常缺少说明 `site` 和 `rack` 如何标识设备、`temperature` 应按什么类型读取。接收方往往还需要一份字段说明，或向提供数据的人确认。

本篇回到导读提出的“可发现、可理解”价值：把列定义和观测记录放在同一份可读取的文件中，接收方据此开始工作。

TsFile 将表名、列类别、数据类型和编码等信息与观测记录保存在一起。接收方可以从文件中读取这些信息，再选择要分析的数据。

本文使用 TsFile-Cli，将一份 CSV 写成表模型（table model）TsFile，再读回文件检查结构与记录。创建和检查都在本地完成，可直接完成 IoTDB。

## 1. “自描述”具体描述了什么

对本文生成的 TsFile，文件自身能够提供以下几层信息：

| 层次 | 文件中可读取的信息 | 解决的问题 |
|-|-|-|
| 文件 | 文件大小、模型与格式信息 | 这是哪类 TsFile，能否按预期工具读取 |
| 对象 | 表名 `sensors` | 文件里包含哪个逻辑数据对象 |
| Schema | TAG、FIELD、列名与数据类型 | 哪些列定义实体，哪些列保存观测值 |
| 物理设置 | 编码与压缩方式 | 数据在文件中采用怎样的物理表示 |
| 统计信息 | 点数、时间范围及可用的值统计 | 读取概览信息即可 |

文件结构还需要配套的业务说明。例如，温度使用摄氏度还是华氏度、记录来自哪个采集任务，应写入数据字典或随文件交付的说明中。

“自描述”与……有区别所有统计查询都保证零扫描。

## 2. 从一份明确的 CSV 开始

本文使用四行机房温湿度演示数据，贯穿数据集创建、检查、加载、导出与 AI 访问流程，属于演示数据。将以下内容保存为 sensors.csv：

```csv
time,site,rack,temperature,humidity,status
1725148800000,beijing,rack-a,24.6,46.0,ok
1725148860000,shanghai,rack-b,28.9,68.5,warn
1725148920000,beijing,rack-a,25.1,47.2,ok
1725148980000,shanghai,rack-b,29.4,70.1,warn
```

写入前先明确每一列的角色：

| 列 | 类别 | 类型 | 含义 |
|-|-|-|-|
| `time` | 时间列 | `INT64` 时间戳 | 每条记录的时间轴 |
| `site` | TAG | `STRING` | 站点身份 |
| `rack` | TAG | `STRING` | 机架身份 |
| `temperature` | FIELD | `DOUBLE` | 温度观测值 |
| `humidity` | FIELD | `DOUBLE` | 湿度观测值 |
| `status` | FIELD | `STRING` | 随时间变化的状态 |

`site` 和 `rack` 共同标识一条设备时间线，三个 FIELD 保存随时间变化的观测。这个声明会进入 TsFile 的表模型 Schema，而继续只是导入脚本里的临时配置。

本专栏约定时间采用 Unix 毫秒，温度单位为摄氏度，相对湿度单位为百分比；ok 和 warn 为来源记录的状态标签，未经 TsFile-Cli 计算。时间精度、测量单位与状态含义应结合业务说明理解，应随文件一并提供说明。

## 3. 一条命令写成 TsFile

假设 tsfile-cli 已经安装或构建完成，在 CSV 所在目录执行。目标 sensors.tsfile 请使用新的输出路径；重复练习时请使用新的输出路径：

```bash
tsfile-cli write \
  --table sensors \
  --tag site STRING \
  --tag rack STRING \
  --field temperature DOUBLE \
  --field humidity DOUBLE \
  --field status STRING \
  --input sensors.csv \
  --output sensors.tsfile \
  --verbose
```

这个命令同时完成三件事：

1. 将 CSV 行写入新的 table-model TsFile；
2. 将表名、TAG、FIELD、数据类型、编码和压缩信息写入文件；
3. 在正式提交输出文件前检查输入和写入结果。

这里显式声明了每一列的类型。以后换一个工具读取，仍然可以从文件中取得同样的列定义。

## 4. 立即读回文件中的自描述信息

创建成功后，通过只读命令检查文件的模型、对象、Schema 和实际数据：

```bash
tsfile-cli meta -f csv sensors.tsfile
tsfile-cli ls -f csv sensors.tsfile
tsfile-cli schema -t sensors -f csv sensors.tsfile
tsfile-cli count -t sensors -f csv sensors.tsfile
tsfile-cli head -t sensors -n 2 -f csv sensors.tsfile
```

下列内容为信息摘要，属于命令输出的逐字转录：

```text
model=table
object=sensors
site        TAG    STRING
rack        TAG    STRING
temperature FIELD  DOUBLE
humidity    FIELD  DOUBLE
status      FIELD  STRING
```

接收方可以直接读回表名和列定义。`head` 用于抽查记录；`count` 返回各列的计数，完整记录数可以在读取全部数据后另行统计。

## 5. 在交付前完成创建与检查

### 在本地完成创建与检查

创建和检查都发生在本地文件系统。IoTDB 缺少启动时，仍然可以生成、复制、归档和交付 `sensors.tsfile`。

### 直接使用命令行完成文件任务

对于 Schema 明确的单文件任务，命令行已经给出稳定入口。Shell、CI 或 ETL 可以直接调用，一次转换维护额外工程。

### 写入后可以独立回读

`write` 创建文件后，可以用 `meta`、`schema`、`count` 和 `head` 检查结果，接收方也能执行同样的检查。

### 输入检查通过后提交目标文件

请使用新的目标路径。CSV 表头、列数、类型或同一 TAG 组合内的时间顺序出现问题时，命令返回非零退出码，目标文件保持缺失。

## 6. 用一次失败看懂严格性

如果把温度改成无法解析的字符串：

```csv
1725148920000,beijing,rack-a,twenty-five,47.2,ok
```

为独立验证类型检查，将原 CSV 复制为 sensors-invalid.csv，保留表头和其他记录，仅将第三条数据记录替换为上述内容。使用新的目标路径，先完成输入检查：

```bash
tsfile-cli write \
  --table sensors \
  --tag site STRING \
  --tag rack STRING \
  --field temperature DOUBLE \
  --field humidity DOUBLE \
  --field status STRING \
  --input sensors-invalid.csv \
  --output sensors-invalid.tsfile

```

预期结果为非零退出码和类型解析诊断，正式目标 sensors-invalid.tsfile 保持目标文件缺失。原有 sensors.tsfile 可继续用于后续文章。将错误定位在转换阶段，有助于降低数据进入 IoTDB 后的排查成本。

## 7. 从自描述文件继续进入 IoTDB 生态

在导读的试飞场景中，数据团队可以用类似方式整理某个架次的观测记录，并附上单位、试飞条件与采集来源。接收方取得文件后，便能查看参数结构和数据。本文的四行机房数据只用于演示文件操作。

后续可以继续使用 TsFile-Cli 在本地查看、筛选和导出，也可以通过 IoTDB 工具执行 LOAD，获得 SQL、并发访问和实例管理能力。数据库接入由 TsFile 格式与 IoTDB 加载能力直接支撑，CLI 负责文件侧创建和检查。

完成创建与回读后，文件即可作为后续练习的输入。

> 交付 TsFile 时，同时提供文件中的结构定义和配套业务说明，接收方才能正确使用其中的观测记录。

## 继续阅读

[下一篇：02-从元数据到数据行：认识一个 TsFile](https://apache-iotdb-project.feishu.cn/docx/M1IRd82rso1rnuxgEvUcLVlWned) · [返回专栏目录](https://apache-iotdb-project.feishu.cn/docx/R0Sydx5Klo4cUSxKnB9cgIkAnLb)

> 本文命令围绕文件创建、读取与检查展开，使用时请结合本地工具帮助说明。