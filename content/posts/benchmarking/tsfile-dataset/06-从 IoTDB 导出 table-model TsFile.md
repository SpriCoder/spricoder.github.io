---
date: 2026-10-11
permalink: benchmarking/tsfile-dataset/06/
title: 玩转 TsFile｜06-从 IoTDB 把表带回文件：导出 table-model TsFile
series: 玩转时序数据集
series_order: 6
---

玩转 TsFile｜06-从 IoTDB 把表带回文件：导出 table-model TsFile

已经加载到 IoTDB 的数据，还可以按表导出为 TsFile，供离线分析或交付使用。本篇承接第 05 篇，将 `tsfile_cli_demo.sensors` 导出并读回检查。

本篇回到导读提出的“可流转、可验证”价值：导出在线数据并检查文件中的结构和记录。

例如，机房异常排查结束后，团队可以把选定的观测记录交给设备供应商复核。导出由 IoTDB 工具完成，文件检查使用 TsFile-Cli。

本文仍使用北京、上海机房各两条观测记录组成的四行 sensors 示例。配套约定为 Unix 毫秒时间戳、摄氏温度和相对湿度百分比（%）。完整数据与 Schema 见第 01 篇；以下应用场景属于演示场景。

## 你将得到什么

本文从已经加载数据的 IoTDB 数据库 `tsfile_cli_demo` 出发，只导出 `sensors` 表：

```text
IoTDB table tsfile_cli_demo.sensors
  -> export-data.sh (-ft tsfile, table dialect)
  -> exported/*.tsfile
  -> tsfile-cli meta/schema/cat
```

导出完成的判断有三层：

1. 工具进程返回退出码 `0`，输出 `Export completely!`；
2. 导出目录中出现 `.tsfile` 文件；
3. TsFile-Cli 能识别其为 table-model，并读出 `sensors` 的 schema 和 4 行数据。

## 1. 准备已运行的 IoTDB

下面的 `IOTDB_DIST`、`DEMO_DIR` 和 `TSFILE_CLI` 请替换为你本机的实际路径；导出目录建议每次使用新的临时空目录。

本文承接上一篇已加载数据的状态。以下命令在同一个 Bash 会话中执行；实例已运行时可以直接再次启动。

```bash
set -eu
set -o pipefail
IOTDB_DIST=/absolute/path/to/apache-iotdb-2.x-all-bin
cd "$IOTDB_DIST"
# 仅当本地演示实例尚未运行时，才执行：
# ./sbin/start-standalone.sh

```

准备导出目录：

```bash
DEMO_DIR=/absolute/path/to/tsfile-cli-demo
TSFILE_CLI=/absolute/path/to/tsfile-cli
mkdir -p "$DEMO_DIR"
EXPORT_DIR=$(mktemp -d "$DEMO_DIR/export.XXXXXX")

```

先验证数据库和表存在：

```bash
./sbin/start-cli.sh -sql_dialect table \
  -e "show tables from tsfile_cli_demo"
```

如果这里缺少 `sensors`，先回到“从本地 TsFile 加载进入 IoTDB”一文完成导入，请将一个空目录误判成导出工具故障。

## 2. 用 export-data.sh 导出表模型 TsFile

IoTDB 的 `tools/export-data.sh` 支持多种输出格式。对于 table-model TsFile，关键是同时指定 `-ft tsfile` 和 `-sql_dialect table`：

```bash
cd "$IOTDB_DIST"
tools/export-data.sh \
  -h 127.0.0.1 -p 6667 \
  -u root -pw root \
  -ft tsfile \
  -sql_dialect table \
  -db tsfile_cli_demo \
  -table sensors \
  -t "$EXPORT_DIR"
```

此前实跑命令返回成功，并在输出中打印：

```text
Export completely!
```

`-db` 是必需的目标数据库，`-table sensors` 把导出范围限制为一张表，`-t` 是目标目录。工具默认使用 `dump` 作为文件名前缀，实际文件名可能是 `dump0.tsfile`；请在脚本中硬编码文件名，先列目录：

```bash
find "$EXPORT_DIR" -maxdepth 1 -type f -name '*.tsfile' -print
```

如果需要更明确的前缀，请查看 `tools/export-data.sh -help tsfile`，再使用工具支持的 `-pfn` 参数。

## 3. 用 TsFile-Cli 回读导出文件

定义 CLI 路径和导出文件：

```bash
set -- "$EXPORT_DIR"/*.tsfile
if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  printf '%s\n' '本例要求恰好一个导出 TsFile；请检查导出日志和文件清单。' >&2
  exit 1
fi
EXPORTED_TSFILE=$1

```

本例针对四行输入显式要求单个导出文件。一般数据集可能产生多个文件，应逐个检查并汇总，应结合取第一个文件作为全部结果。

先检查元数据与字段计数：

```bash
"$TSFILE_CLI" meta -f csv "$EXPORTED_TSFILE"
"$TSFILE_CLI" ls -f csv "$EXPORTED_TSFILE"
"$TSFILE_CLI" schema -t sensors -f csv "$EXPORTED_TSFILE"
"$TSFILE_CLI" count -t sensors -f csv "$EXPORTED_TSFILE"
```

应看到：

- `model=table`；
- 对象 `sensors`；
- `site`、`rack` 为 TAG，三个观测列为 FIELD；
- 总行数对应 4 条记录。

再读取实际数据页：

```bash
"$TSFILE_CLI" cat -t sensors -f ndjson "$EXPORTED_TSFILE"
```

输出可以直接交给 `jq`：

```bash
set -o pipefail
"$TSFILE_CLI" cat -t sensors -f ndjson "$EXPORTED_TSFILE" \
  | jq -s '{rows: length, sites: (map(.site) | unique), max_temperature: (map(.temperature) | max)}'

```

预期得到 4 条记录、`beijing` 和 `shanghai` 两个站点，最高温度约为 29.4 °C。这里的最大值用于检查结果；第 07 篇还会比较完整字段与记录。

## 4. export-data 和 export-tsfile 的边界

IoTDB 目录中还可能看到 `tools/export-tsfile.sh`。它走的是 Subscription 消费路径，与本文使用的 `export-data.sh` 查询导出属于同一件事：

- export-data.sh -ft tsfile -sql_dialect table：执行表查询，把结果写成新的 table-model TsFile，适合一次性数据交付或脚本化导出；
- export-tsfile.sh：从 Subscription 消费 TsFile 消息，依赖主题、消费者组和 Subscription 配置，适合持续消费场景。

使用 `export-tsfile.sh` 前需要配置 Subscription。本文的一次性表导出使用 `export-data.sh`。

## 5. 导出的文件到底是什么

`export-data.sh` 的 table 分支会先执行 `select * from sensors`，再根据查询结果和现有表 schema 构造 `Tablet`，最后用 TsFile writer 写出新文件。它是一次**逻辑重建**，属于逻辑 IoTDB 内部某个物理 TsFile 原样复制出来。

这带来几个实际含义：

- 导出文件拥有 table-model 的表名、列类别和类型，可被 TsFile-Cli 或另一个 IoTDB 实例读取；
- 文件的压缩、页组织、分块边界和内部布局可以与原始文件不同；
- 导出范围由 SQL、时间条件和表参数决定，应将导出文件默认当成数据库全量物理备份；
- 聚合 SQL 适用范围有限 TsFile 导出输入，工具会拒绝包含 `count`、`sum`、`avg` 等聚合的查询，因为聚合结果已继续对应原始明细行。

按时间范围导出时，先核对 `-start_time` 和 `-end_time` 的支持及端点含义。导出后用 `cat` 检查实际记录，用 `stats` 查看时间范围，并核对筛选条件。

## 6. 面向 Unix 工具链的导出习惯

导出命令可以作为一个普通进程嵌入脚本：

```bash
set -eu
set -o pipefail
EXPORT_DIR=$(mktemp -d "$DEMO_DIR/export.XXXXXX")
tools/export-data.sh \
  -h 127.0.0.1 -p 6667 -u root -pw root \
  -ft tsfile -sql_dialect table \
  -db tsfile_cli_demo -table sensors -t "$EXPORT_DIR"

```

后续检查只读已完成的文件：

```bash
set -- "$EXPORT_DIR"/*.tsfile
if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  printf '%s\n' '本例要求恰好一个导出 TsFile。' >&2
  exit 1
fi
EXPORTED_TSFILE=$1
"$TSFILE_CLI" meta -f csv "$EXPORTED_TSFILE" > "$EXPORT_DIR/meta.csv"
"$TSFILE_CLI" cat -t sensors -f ndjson "$EXPORTED_TSFILE" > "$EXPORT_DIR/sensors.ndjson"

```

导出完成后，TsFile-Cli 负责读回文件；后续可以使用 jq 等工具分析结果。运行脚本时还应保存导出日志，便于检查失败原因。

## 继续阅读

[上一篇：从本地 TsFile 加载进入 IoTDB](https://apache-iotdb-project.feishu.cn/docx/Ni7Kdaiv3oLBhYxKMNNcFRuqnqs) · [下一篇：双向闭环验证](https://apache-iotdb-project.feishu.cn/docx/APQido4BRoaH6QxbwVPcz5cpn9e)

## 小结

`export-data.sh` 根据查询结果生成新的 TsFile。接收方可以离线读取，也可以将它加载到兼容的 IoTDB 实例。

这个出口保存查询范围内的逻辑数据，属于查询范围内的逻辑导出，快照行为需由独立测试确认。本例使用固定、停止写入的演示数据，数据库查询和文件回读共同构成交付检查。export-tsfile.sh 是另一条依赖 Subscription 的持续消费链路。