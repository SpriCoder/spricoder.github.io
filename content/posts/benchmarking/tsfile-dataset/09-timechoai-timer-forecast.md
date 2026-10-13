---
date: 2026-10-11
permalink: benchmarking/tsfile-dataset/09/
title: 玩转 TsFile｜09-从时序数据集到预测：用 TimechoAI / Timer 连接数据与模型
series: 玩转时序数据集
series_order: 9
tags: ["时序数据集","TsFile","TimechoAI","Timer","时序预测"]
content_type: series
---

<title>玩转 TsFile｜09-从时序数据集到预测：用 TimechoAI / Timer 连接数据与模型</title>

前面的文章介绍了如何保存、查询和分析时序数据。本篇以发动机温度预测为场景，说明怎样准备历史序列，通过 TimechoAI / Timer 获得预测，并与后续观测对照。

本篇回到导读提出的“可流转、可验证”价值：整理历史序列，生成预测并用后续观测检查结果。

本文提供接入说明和命令模板，适合已了解 TsFile 或 IoTDB 的开发者。操作需要 timecho-cli、可用的 TimechoAI API Key，以及符合模型要求的连续时序数据。本文本文聚焦接入流程和结果检查，文中的试飞场景用于说明操作方式。

# 先理解数据集、模型与服务的关系

时序数据集提供观测记录及其上下文，例如哪架飞机、哪个架次、什么参数、什么时间。Timer 是面向时间序列的模型，根据历史变化生成未来数值的预测。TimechoAI 将以 Timer 为核心的时序模型能力作为云服务开放，开发者可以通过接口使用。关于服务定位，可参阅 [TimechoAI 官方介绍](https://ai.timecho.com/docs/zh-cn/)。

TsFile 和 IoTDB 分别承担文件保存与数据库访问，timecho-cli 则提供调用服务的命令行入口。数据从哪里来、选取什么范围、预测哪个参数，仍由具体业务任务决定；模型输出应与输入数据及任务条件一起保存，便于后续解释与复核。

# 从一个明确的问题准备输入

以飞机试飞为场景示意，可以提出一个具体问题：根据某架次稳定飞行片段中的发动机温度历史记录，预测其后的短时温度变化。先选定飞机、架次、测点和连续时间段，确认参数单位与工况，再从 TsFile 或 IoTDB 中读取所需记录，整理为模型接口接受的输入文件。

本例只预测发动机温度，输入表包含时间列和温度数值列。应选取同一架次中的连续片段；不同飞机、架次或长时间间断的记录分别整理。前文的四行机房样例服务于文件操作，本篇另行准备模型输入。

时间列使用一致的 ISO 日期时间格式，统一时区与采样间隔，并检查重复时间、缺测和无效值。原始数据若使用 Unix 毫秒时间戳，需要先转换时间表示。需要重采样时，记录处理规则；留作验证的未来观测应进入历史输入。

# 用命令模板提交预测任务

先按 [TimechoCLI 官方指南](https://www.timecho-global.com/docs/UserGuide/latest/AI-capability/TimechoCLI_timecho.html)以下为 Bash / zsh 模板，需要先将变量设置为实际文件路径、列名和预测要求：

```bash
timecho-cli ai forecast --help

# 以下为设置示例；文件须自行准备，列名与起点须按实际数据修改。
INPUT_FILE=./flight-temperature.csv
TIME_COLUMN=time
TARGET_COLUMN=engine_temperature
FORECAST_START=2024-01-01T10:00:00+08:00
FORECAST_STEPS=30
RESULT_FILE=./prediction.csv

timecho-cli ai forecast \
  --input "$INPUT_FILE" \
  --time-col "$TIME_COLUMN" \
  --target "$TARGET_COLUMN" \
  --model Timer-3.5 \
  --output-start-time "$FORECAST_START" \
  --output-length "$FORECAST_STEPS" \
  --out "$RESULT_FILE"
```

`INPUT_FILE` 是 CSV、TSV 或 JSON 文件；`TIME_COLUMN` 是时间列名；`TARGET_COLUMN` 是本次预测的一个数值列名。当前官方预测命令说明要求 `--target` 只传一次。

`FORECAST_START` 是预测起点，历史输入来自该时刻之前；`FORECAST_STEPS` 是预测采样步数，实际覆盖时长由采样间隔决定。例如，按一分钟一个点整理的序列，预测 30 步对应后续 30 分钟。步数与历史长度的可用范围以当前服务和所选模型为准。

`RESULT_FILE` 是输出路径，使用 `.csv` 或 `.json` 扩展名保存预测数据。脚本或 Agent 需要结构化终端输出时，可在 `timecho-cli` 后加入全局参数 `--json`。参数与输入格式说明参见官方指南的“Timecho AI”部分；

# 拿到输出后，检查它回答了什么

一次预测任务完成后，先检查命令退出状态与返回信息，再读取结果文件，确认预测起点、时间间隔、目标参数和输出点数符合任务要求。

需要图表时，可将保存的预测数据交给绘图工具，分别标出历史观测、预测起点、预测曲线与后续实测曲线。图表应保留时间与单位，并清楚区分预测值和实测值，让读者能够判断差异出现在哪个时段。

请求成功表示得到了模型输出，预测是否有用还需要实测数据检验。可以先留出一段已有记录，把起点之前的数据用于预测，再与留出的观测值比较。对试飞数据，尤其应结合飞行阶段、飞机配置和工况理解误差；某个稳定片段的表现应直接代表其他机动或全部架次。

# 让数据积累与模型使用持续连接

新架次的数据可以继续检验模型在不同飞行阶段的表现。误差较大时，回查工况、数据质量和处理方式，再判断需要补充数据还是调整预测任务。

把每次使用的数据范围、模型设置、预测与实测结果放在一起，团队就能比较多次试飞中的表现，逐步明确模型适合哪些任务。

返回专栏总览：[AI-Native 的时序数据集](https://apache-iotdb-project.feishu.cn/docx/R0Sydx5Klo4cUSxKnB9cgIkAnLb)。