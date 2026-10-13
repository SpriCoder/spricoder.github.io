---
date: 2026-10-11
permalink: benchmarking/tsfile-dataset/series/
title: 玩转时序数据集｜系列目录
series: 玩转时序数据集
tags: ["时序数据集","TsFile","IoTDB","TsFile-Cli","时序预测"]
content_type: series
---

# 玩转时序数据集｜系列目录

本专栏介绍时序数据的文件交付、数据库查询、脚本分析与模型预测。00 篇用飞机试飞说明应用场景；01–08 篇沿用同一份四行机房温湿度样例演示操作；09 篇介绍模型接入，需要另外准备连续的历史序列。

## 阅读顺序

| 序号 | 文章 | 内容 |
| --- | --- | --- |
| 00 | [玩转 TsFile｜00-专栏导读：AI-Native 的时序数据集](/benchmarking/tsfile-dataset/00/) | 理解数据格式、访问工具与业务说明的分工 |
| 01 | [玩转 TsFile｜01-从 CSV 到 TsFile：自描述的时序数据集](/benchmarking/tsfile-dataset/01/) | 创建文件并检查结构与数据 |
| 02 | [玩转 TsFile｜02-从元数据到数据行：认识一个 TsFile](/benchmarking/tsfile-dataset/02/) | 查看对象、字段、统计与记录 |
| 03 | [玩转 TsFile｜03-什么时候用 TsFile，什么时候用 IoTDB？](/benchmarking/tsfile-dataset/03/) | 按任务选择文件工具、数据库工具或 SDK |
| 04 | [玩转 TsFile｜04-让 TsFile 像 Unix 文件一样进入工具链](/benchmarking/tsfile-dataset/04/) | 组合命令并生成每日检查报告 |
| 05 | [玩转 TsFile｜05-一条 LOAD 命令：把本地 TsFile 接入 IoTDB](/benchmarking/tsfile-dataset/05/) | 将文件加载到数据库并查询 |
| 06 | [玩转 TsFile｜06-从 IoTDB 把表带回文件：导出 table-model TsFile](/benchmarking/tsfile-dataset/06/) | 导出表数据并回读文件 |
| 07 | [玩转 TsFile｜07-LOAD 之后继续验证：用闭环脚本验证往返一致性](/benchmarking/tsfile-dataset/07/) | 比较往返前后的结构、计数与明细 |
| 08 | [玩转 TsFile｜08-让 AI 少猜一步：用 Skill 可靠访问 TsFile](/benchmarking/tsfile-dataset/08/) | 让 Agent 按 Skill 指引分析数据 |
| 09 | [玩转 TsFile｜09-从时序数据集到预测：用 TimechoAI / Timer 连接数据与模型](/benchmarking/tsfile-dataset/09/) | 准备模型输入、调用预测并检查结果 |

## 样例与运行方式

```csv
time,site,rack,temperature,humidity,status
1725148800000,beijing,rack-a,24.6,46.0,ok
1725148860000,shanghai,rack-b,28.9,68.5,warn
1725148920000,beijing,rack-a,25.1,47.2,ok
1725148980000,shanghai,rack-b,29.4,70.1,warn
```

`site` 与 `rack` 为 STRING 类型的 TAG；温度和湿度为 DOUBLE 类型的 FIELD，状态为 STRING 类型的 FIELD。时间采用 Unix 毫秒，温度单位为摄氏度，湿度为相对湿度百分比。`ok/warn` 是演示状态，样例属于演示数据。

01–08 篇的数据库操作使用专用演示库，验证期间保持输入数据不变。`TSFILE_CLI`、`DEMO_DIR` 和 `IOTDB_DIST` 都需要替换为实际路径。每篇代码在同一个 Bash 会话中顺序执行；已完成创建或加载时按正文说明跳过重复步骤。IoTDB LOAD 的文件路径由服务端解释。

