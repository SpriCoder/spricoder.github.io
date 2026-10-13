---
date: 2026-10-11
permalink: benchmarking/tsfile-dataset/07/
title: 玩转 TsFile｜07-LOAD 之后继续验证：用闭环脚本验证往返一致性
series: 玩转时序数据集
series_order: 7
tags: ["时序数据集","TsFile","IoTDB","结果验证"]
content_type: series
---

玩转 TsFile｜07-LOAD 之后继续验证：用闭环脚本验证往返一致性

文件加载到 IoTDB 后，怎样确认再次导出的数据缺少变化？本文使用同一个 TsFile-Cli 读取原始文件与导出文件，比较表结构、字段计数和明细记录。

本篇回到导读提出的“可验证”价值：比较加载前后的结构与明细，留下可复查依据。

机房联合排查结束后，团队需要确认交给设备供应商的数据与进入 IoTDB 前的记录相符。本文把前两篇文章串成一个可重复的验收流程。TsFile 提供共同载体，IoTDB 的加载和导出工具负责数据库侧流转，TsFile-Cli 负责读取文件并为比较提供输入：

```text
CSV
  -> TsFile-Cli write -> original.tsfile
  -> IoTDB LOAD -> SQL table
  -> export-data.sh -> exported.tsfile
  -> TsFile-Cli read -> logical comparison
```

这里要先区分两种“一致”：

- **物理一致**：两个 `.tsfile` 的二进制字节完全相同；
- **逻辑一致**：用同一读取方式得到的表名、schema、行和字段值一致。

IoTDB 的加载和导出会接管内部布局，所以本文的成功标准是逻辑一致，而属于物理字节相同。

## 1. 固定输入与数据

本文命令中的 distribution 和 CLI 路径均为占位符，请替换为本机实际路径。

使用与专栏前文相同的 4 行数据：

```csv
time,site,rack,temperature,humidity,status
1725148800000,beijing,rack-a,24.6,46.0,ok
1725148860000,shanghai,rack-b,28.9,68.5,warn
1725148920000,beijing,rack-a,25.1,47.2,ok
1725148980000,shanghai,rack-b,29.4,70.1,warn
```

配套数据约定为 Unix 毫秒时间戳、摄氏温度和相对湿度百分比（%）。这些单位来自数据说明；Schema 中的 DOUBLE 类型本身需要配套说明这层业务解释。

以下代码块在同一个 Bash 会话中依次执行，沿用第 01 篇已创建的 sensors.tsfile。准备 jq，并设置路径与失败即停止的行为：

```bash
set -eu
set -o pipefail
TSFILE_CLI=/absolute/path/to/tsfile-cli
IOTDB_DIST=/absolute/path/to/apache-iotdb-2.x-all-bin
DEMO_DIR=/absolute/path/to/tsfile-cli-demo
ORIGINAL_TSFILE="$DEMO_DIR/sensors.tsfile"

```

原始文件与导出文件的逻辑 Schema、字段计数和明细 CSV 一致，二进制 SHA-256 不同。

## 2. 保存原始文件的比较基线

先从原始文件导出一份稳定的逻辑表示。CSV 适合人工查看和 `cmp`，NDJSON 适合结构化工具。

```bash
CHECK_DIR=$(mktemp -d "$DEMO_DIR/checks.XXXXXX")
"$TSFILE_CLI" meta -f csv "$ORIGINAL_TSFILE" \
  > "$CHECK_DIR/original.meta.csv"
"$TSFILE_CLI" schema -t sensors -f ndjson "$ORIGINAL_TSFILE" \
  > "$CHECK_DIR/original.schema.ndjson"
"$TSFILE_CLI" count -t sensors -f csv "$ORIGINAL_TSFILE" \
  > "$CHECK_DIR/original.count.csv"
"$TSFILE_CLI" cat -t sensors -f csv "$ORIGINAL_TSFILE" \
  > "$CHECK_DIR/original.rows.csv"
"$TSFILE_CLI" cat -t sensors -f ndjson "$ORIGINAL_TSFILE" \
  > "$CHECK_DIR/original.rows.ndjson"

```

最小基线应满足：

```bash
jq -e -s 'length == 4' "$CHECK_DIR/original.rows.ndjson" > /dev/null

```

meta/schema 描述文件结构，count 检查字段点数，cat 读取明细。分开保存结果，便于区分结构、计数与数据读取问题；本例的 4 行断言来自完整读取后的 NDJSON，不用 CSV 的物理行数替代记录数。

## 3. 加载并查询

使用缺少其他数据、验证期间停止写入的专用演示数据库。如果已完成第 05 篇加载，直接执行查询验收；否则创建数据库并加载。已有数据混入时，应换用新的演示数据库，并同步下文数据库名，应清理未知数据。

```bash
cd "$IOTDB_DIST"
./sbin/start-cli.sh -sql_dialect table \
  -e "create database if not exists tsfile_cli_demo"
```

加载时保留源文件：

```bash
./sbin/start-cli.sh -sql_dialect table \
  -e "load '$ORIGINAL_TSFILE' with ('database'='tsfile_cli_demo', 'on-success'='none')"
```

先在数据库中做行数和字段计数：

```bash
./sbin/start-cli.sh -sql_dialect table \
  -e "select count(*) as rows,
             count(temperature) as temperature_points
      from tsfile_cli_demo.sensors"
```

这里应得到 `4` 和 `4`。再检查时间范围和极值：

```bash
./sbin/start-cli.sh -sql_dialect table \
  -e "select min(time) as first_time,
             max(time) as last_time,
             min(temperature) as min_temperature,
             max(temperature) as max_temperature
      from tsfile_cli_demo.sensors"
```

应对应源数据中的首尾时间 `1725148800000`、`1725148980000`，温度范围 `24.6` 到 `29.4`。这些聚合用于快速发现问题，但能在导出之前快速发现明显丢行或类型问题。

## 4. 从 IoTDB 导出新文件

每次新建独立空目录，避免把以前生成的文件误认为本次结果，然后执行 table-model 导出：

```bash
EXPORT_DIR=$(mktemp -d "$DEMO_DIR/export.XXXXXX")
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

导出成功后取得结果文件：

```bash
set -- "$EXPORT_DIR"/*.tsfile
if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  printf '%s\n' '本例要求恰好一个导出 TsFile；请检查导出日志和全部文件。' >&2
  exit 1
fi
EXPORTED_TSFILE=$1

```

这里缺少假设默认文件名，但为四行示例显式断言单个文件。一般数据集可能产生多个文件，必须逐个读取并汇总验证；仅取第一个文件会遗漏数据。

## 5. 用同一读取器比较结果

为了避免把“读取器差异”混入比较，原始文件和导出文件都用同一个 TsFile-Cli、同一个表名、同一个 CSV 格式读取：

```bash
"$TSFILE_CLI" meta -f csv "$EXPORTED_TSFILE" \
  > "$CHECK_DIR/exported.meta.csv"
"$TSFILE_CLI" schema -t sensors -f ndjson "$EXPORTED_TSFILE" \
  > "$CHECK_DIR/exported.schema.ndjson"
"$TSFILE_CLI" count -t sensors -f csv "$EXPORTED_TSFILE" \
  > "$CHECK_DIR/exported.count.csv"
"$TSFILE_CLI" cat -t sensors -f csv "$EXPORTED_TSFILE" \
  > "$CHECK_DIR/exported.rows.csv"

```

先从结构化 Schema 输出中提取逻辑属性，再比较字段点数：

```bash
for side in original exported; do
  jq -e -s '
    if length == 0 or any(.[];
      (has("model") and has("object") and has("column") and
       has("category") and has("data_type")) | not)
    then error("Schema 输出为空或缺少逻辑属性")
    else map({model, object, column, category, data_type}) end
  ' "$CHECK_DIR/$side.schema.ndjson" \
    > "$CHECK_DIR/$side.schema.logical.json"
done
cmp "$CHECK_DIR/original.schema.logical.json" \
    "$CHECK_DIR/exported.schema.logical.json"
cmp "$CHECK_DIR/original.count.csv" \
    "$CHECK_DIR/exported.count.csv"

```

逻辑 Schema 比较保留模型、对象、列名、列类别、类型及其顺序，排除 encoding 和 compression 等物理属性。上述 NDJSON 解析能够正确处理包含特殊字符的字段名，采用结构化字段解析。字段计数相同仍需结合明细比较，还需要比较明细 CSV：

```bash
cmp "$CHECK_DIR/original.rows.csv" \
    "$CHECK_DIR/exported.rows.csv"

```

命令返回 `0` 表示逐字一致；非零则说明至少有一处表头、列顺序、时间格式、行顺序或字段值不同。此时请直接改成“只比较行数”，而应先定位差异：

```bash
diff -u "$CHECK_DIR/original.rows.csv" \
        "$CHECK_DIR/exported.rows.csv"

```

本例使用同一读取器、相同列顺序与展示设置进行严格比较。逐字相同是本例的一项强验收条件；不同可以然意味着逻辑数据改变，也可能来自行序或序列化差异。一般数据集若允许忽略行序，应使用可靠的 CSV/JSON 解析器按完整记录及 (site, rack, time) 身份进行规范化，并明确空值、重复记录和浮点数的比较规则。带引号、逗号或换行的 CSV 应通过简单的 cut、删表头或逐行排序得到通用逻辑比较。浮点容差应事先约定；应为了通过验证临时放宽。

## 6. 为什么二进制 SHA 应作为唯一标准

可以记录两个文件的 SHA-256：

```bash
shasum -a 256 "$ORIGINAL_TSFILE" "$EXPORTED_TSFILE"
```

此前实跑中，两个 SHA-256 不同。这是预期现象：导出工具根据 IoTDB 查询结果重新写文件，文件压缩、页边界、元数据布局和内部顺序都可能发生变化。即使所有逻辑数据完全一致，二进制也可以相同。

源文件与数据库内部文件未必一一对应，因此应将源文件与导出结果按相同的读取方式比较。

推荐把证据分成三层：

| 层次 | 检查 | 说明 |
|-|-|-|
| 文件可读 | `meta/schema/count` | 模型、schema、统计可解析 |
| 数据逻辑 | `cat` 后 `cmp`/规范化比较 | 行和字段值一致 |
| 数据库承接 | SQL `count`、时间范围、抽样查询 | 实例中可查询 |

文件检查、明细比较和数据库查询各自回答不同的问题，验收时一并保留结果。

## 7. 将验收纳入自动化流程

将前述步骤按顺序放入同一个 Bash 脚本，并保留开头的 set -eu 和 set -o pipefail。每次运行分别创建新的 CHECK_DIR 和 EXPORT_DIR，导出成功且文件数量符合本例预期后才回读，所有读取完成后才比较逻辑 Schema、字段计数和明细。任何步骤失败，都应保留该次目录和诊断信息供排查。

如果需要汇总多个导出文件，应显式扩展文件清单、逐文件读取与记录合并流程；本篇单文件断言应直接删除后继续沿用单文件比较。SQL 回读仍是独立验收环节，文件比较应替代实例侧的查询检查。

## 8. 如何解释验证结果

本例在加载、查询和导出期间保持演示数据稳定。全部检查通过后，可以记录以下结果：

这项结果适用于本例固定的数据和查询范围。

- 具体兼容范围需要结合目标实例和数据类型逐项检查；
- IoTDB 会保留原文件的物理布局或 SHA-256；
- 远程集群可以直接访问客户端本地路径；
- `export-tsfile.sh` 在未启用 Subscription 的实例上也能工作；
- 具有过滤、聚合或复杂表达式的 SQL 都能无损还原为明细 TsFile。

## 继续阅读

[上一篇：从 IoTDB 导出 table-model TsFile](https://apache-iotdb-project.feishu.cn/docx/MVCKdL1suos4vHxk2vPcE7Udn4j) · [下一篇：AI 如何通过 Skill 可靠访问 TsFile](https://apache-iotdb-project.feishu.cn/docx/BSGhd65zZoZSQqxVMoHc9xqBnkb) · [返回专栏目录](https://apache-iotdb-project.feishu.cn/docx/R0Sydx5Klo4cUSxKnB9cgIkAnLb)

## 小结

出现差异时，从字段类型、空值、行序和序列化方式逐项定位。

将源文件、导出文件、查询结果和比较日志保存在同一运行目录，后续便能重新检查这次往返。