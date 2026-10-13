---
date: 2026-10-11
permalink: benchmarking/tsfile-dataset/02/
title: 玩转 TsFile｜02-从元数据到数据行：认识一个 TsFile
series: 玩转时序数据集
series_order: 2
---

玩转 TsFile｜02-从元数据到数据行：认识一个 TsFile

接收一份设备测试数据或机房运行数据后，使用者需要先确认文件模型、对象、字段结构和数据规模，再决定如何分析。本文沿用第 01 篇创建的 sensors.tsfile，说明如何逐步检查一个本地时序数据集。

本篇回到导读提出的“可发现、可理解、可验证”价值：按对象、结构、统计和记录逐层检查数据。

检查时先查看有哪些表或设备，再核对字段和时间范围，最后读取所需记录。本文按以下顺序展开：

```Plaintext
ls → meta → schema → stats / count → head / cat
```

这一顺序将结构检查与明细读取分开，使每一步对应一个明确问题。统计和计数的读取成本取决于文件结构与实现，应统一视为可以直接扫描数据的操作。

## 1. 先知道 TsFile 里的两种模型

TsFile 生态中常见两种逻辑模型：

| 模型 | 组织方式 | 适合怎样理解 |
|-|-|-|
| 树模型（tree model） | 设备路径下挂载 measurement | root.factory.line1.sensor1.temperature |
| 表模型（table model） | 表包含 TAG 身份列和 FIELD 观测列 | site、rack 标识实体，temperature、humidity、status 保存观测 |

本专栏第一篇用 `write` 创建的是表模型。TsFile-Cli 读取已有文件时，会根据文件自身信息识别纯树模型或纯表模型；同时包含两类结构，或无法唯一识别时，应擅自选择其中一半继续解释。

同样叫 `temp` 的列，在树模型里可能属于某个设备路径，在表模型里则属于某张表和一组 TAG 身份。只有先知道模型，后面的作用域和查询参数才有意义。

## 2. 用 `ls` 发现数据集的对象

```Bash
tsfile-cli ls -f table sensors.tsfile
```

`ls` 回答“文件里有哪些可访问对象”。对树模型，它列出设备或路径对象；对表模型，它列出表对象。输出的对象名是后续 `schema`、`head`、`cat` 和 `export` 选择作用域的依据。

后续命令使用 `ls` 返回的对象名。文件包含多个对象时，显式指定表或设备；导出时也应明确指定需要交付的对象。

## 3. 用 `meta` 看文件级总览

```Bash
tsfile-cli meta -f table sensors.tsfile
```

`meta`

`meta` 是“总览”，属于完整的合法性证明。需要定位 marker、Chunk、Page、metadata 或文件尾部的偏移问题时，应使用 `sketch`。

## 4. 用 `schema` 还原逻辑结构

```Bash
tsfile-cli schema -t sensors -f table sensors.tsfile
```

对表模型，`schema` 应让我们看清表名、列名、列类别、数据类型以及文件中持久化的物理参数。对于 `sensors.tsfile`，逻辑上应类似：

```Plaintext
table=sensors
TAG   site         STRING
TAG   rack          STRING
FIELD temperature  DOUBLE
FIELD humidity     DOUBLE
FIELD status       STRING
```

`time` 是时序记录的时间轴；`site` 和 `rack` 是实体身份，应因为它们也是 `STRING` 就与 `status` 混为同一种用途。

本专栏另行约定：时间采用 Unix 毫秒，温度单位为摄氏度，相对湿度单位为百分比；ok 和 warn 为来源记录的状态标签。这些业务解释应结合从字段类型推断，需结合配套数据说明。

查询前先核对字段是否存在，以及它属于 TAG 还是 FIELD。这样可以及早发现列名写错或字段选择不合适的问题。

## 5. 用 `stats` 和 `count` 了解规模

```Bash
tsfile-cli stats -t sensors -f table sensors.tsfile
tsfile-cli count -t sensors -f table sensors.tsfile
```

这两个命令回答统计与规模问题，其输出范围不同于明细查询，也不意味着执行时必然可以直接读取数据页。

stats 查看 FIELD 的计数、时间范围和可用值统计，并通过 stats_source 标识来源。缺少可用统计时，部分路径会扫描数据以补充时间线或计数；无法提供的值级统计仍可能为空。应结合字段和来源解释结果，避免将所有统计项视为由元数据直接给出。

`count` 关注数量，但不同模型和对齐方式的计数口径可能不同：非 aligned 序列通常统计实际存在的点；aligned 数据还可能需要根据时间列和 bitmap 计算包含空值位置的逻辑行数。因此，看见 `count` 的数字时，要连同命令输出口径一起解释，应将 FIELD 非空点数与逻辑行数当成同一个概念。

需要检查物理布局时，再使用下一节的 `sketch`。

## 6. 用 `sketch` 进入物理排障层

```Bash
tsfile-cli sketch sensors.tsfile
```

`sketch` 面向 marker、Chunk、Page、metadata、文件头和文件尾部等物理布局信息。它更像格式排障工具，而主要用于格式排障：想知道有哪些表和列，先用 `ls` 和 `schema`；想知道有多少行、时间覆盖多久，用 `count` 和 `stats`；想知道哪个偏移附近的物理结构可疑，再用 `sketch`。

`sketch`

## 7. 最后才读取数据行

确认模型、对象和列之后，再读取少量样例：

```Bash
tsfile-cli head \
  -t sensors \
  -m temperature \
  -m humidity \
  -n 3 \
  -f table \
  sensors.tsfile
```

需要把匹配范围交给脚本时，可以使用 `cat` 并显式选择机器格式：

```Bash
tsfile-cli cat \
  -t sensors \
  --tag-filter site eq beijing \
  -m temperature \
  -m humidity \
  -f ndjson \
  sensors.tsfile
```

表模型行查询会保留全部 TAG 身份列，再加上调用者选择的 FIELD。这样，`temperature=25.1` 不会自动失去它属于哪个 `site` 和 `rack` 的上下文。

对于本专栏的四行样例，北京 rack-a 的两条温度记录分别为 24.6 和 25.1，相对湿度分别为 46.0 和 47.2；上海 rack-b 的温度分别为 28.9 和 29.4，相对湿度分别为 68.5 和 70.1。上述 cat 查询应仅返回北京的两条记录。数值的文本展示可能存在浮点精度差异，应结合字段类型与示例精度解释。

`head` 和 `cat` 是流式读取路径：读取、解码或格式化中途失败时，stdout 可能已经产生部分内容。因此自动化调用者必须把退出码作为完整性判断：只有 `0` 才接受整段结果；返回非零状态时，即使已经看到几行，也应丢弃并根据 stderr 处理失败。

## 8. 把整条路径交给 AI 或脚本

当用户问“这个 TsFile 里有哪些表，温度字段覆盖多久，给我两行北京数据”时，稳定的调用顺序应接近：

```text
ls       -> 发现表
meta     -> 确认模型和文件状态
schema   -> 确认 sensors 与 temperature 的真实定义
stats    -> 回答覆盖范围和统计问题
head     -> 显式筛选 site=beijing，读取两行具体数据

```

`SKILL.md` 可以记录这套操作顺序，供 Agent 选择命令、解释输出并处理失败。具体调用仍须以工具实际支持的参数为准。

## 9. 遇到异常时，先判断是哪一层

| 返回状态 | 应该怎样理解 | 下一步 |
|-|-|-|
| `0` | 结果完整，或目标文件已成功提交 | 接受结果，继续分析 |
| `1` | 用法或参数错误，例如对象、列或条件不匹配 | 修正请求，不盲目重试 |
| `2` | 输入问题，例如文件打不开、损坏、解码失败 | 报告文件/记录边界；丢弃已有部分 stdout |
| `3` | 执行或交付失败，例如输出写入、flush、目标提交失败 | 检查目标和 stderr；请先检查目标和 stderr，再决定是否追加 `--force` |

读取失败时保留诊断信息，并将已有输出标记为不完整；确认原因后再重新读取。

## 10. 从“打开文件”到“理解数据集”

```Plaintext
发现对象
  -> 确认模型
  -> 还原 schema
  -> 读取统计和规模
  -> 必要时检查物理布局
  -> 最后读取数据行
```

收到试飞归档文件或其他设备数据后，都可以沿用这套检查过程。下一篇讨论何时继续使用本地文件，何时将数据加载到 IoTDB。

## 继续阅读

[上一篇：从 CSV 到 TsFile](https://apache-iotdb-project.feishu.cn/docx/LRwGd6a8zo0l9gxR6R7cPKjLnkc) · [下一篇：文件还是数据库？](https://apache-iotdb-project.feishu.cn/docx/K0J7dNBC0owgU6xHlRachysvnQg) · [想直接接管道？跳到 Unix 工具链](https://apache-iotdb-project.feishu.cn/docx/OWmCdYG97ojuJLx6OyOcUbx4nRf)