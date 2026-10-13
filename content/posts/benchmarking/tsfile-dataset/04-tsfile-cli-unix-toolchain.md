---
date: 2026-10-11
permalink: benchmarking/tsfile-dataset/04/
title: 玩转 TsFile｜04-让 TsFile 像 Unix 文件一样进入工具链
series: 玩转时序数据集
series_order: 4
---

玩转 TsFile｜04-让 TsFile 像 Unix 文件一样进入工具链

各机房每天提交一份温湿度 TsFile，数据接收方希望自动生成检查报告：文件是否可以读取、表结构是否符合约定、温度超过阈值的记录有多少。Shell 可以负责目录遍历与任务编排，TsFile-Cli 负责单个文件的结构化访问，jq 负责筛选和汇总。原有的 Unix 自动化流程由此可以纳入二进制时序数据集。

本篇回到导读提出的“可组合”价值：让文件访问结果进入 Shell、CI 和数据处理流程。

这一组合依赖稳定的进程接口：结果写入 stdout，诊断写入 stderr，命令退出码表示执行状态。TsFile-Cli 提供文件访问能力，Shell 和下游程序提供组合能力，各工具可以直接共享实现语言或 SDK。

本文沿用专栏的四行 sensors 示例。time 约定为 Unix 毫秒时间戳，temperature 为摄氏温度，humidity 为相对湿度百分比。这些是示例的数据约定，业务单位需要配套说明；TsFile 的字段类型应代替单位说明。

## 先准备一个可复用的命令

下面示例中的 `/absolute/path/to/...` 是占位符，请替换为你本机的 TsFile 源码、二进制或演示目录。

把构建产物放到变量中，后面的命令就采用变量定位工具：

```bash
TSFILE_CLI=/absolute/path/to/project-tsfile/cpp/build/Debug/bin/tsfile-cli
DEMO_DIR=/absolute/path/to/tsfile-cli-demo
mkdir -p "$DEMO_DIR"

```

如果二进制尚未构建，在 TsFile 源码的 `cpp/` 目录执行：

```bash
bash build.sh -t=Debug --disable-antlr4
```

若已经完成第 01 篇，沿用原文件并跳过以下创建步骤；单独练习时使用新的演示目录。用下面的数据创建文件。site 和 rack 是 TAG，三个观测列是 FIELD；相同 TAG 组合代表同一设备的时间线。

```bash
cat > "$DEMO_DIR/sensors.csv" <<'CSV'
time,site,rack,temperature,humidity,status
1725148800000,beijing,rack-a,24.6,46.0,ok
1725148860000,shanghai,rack-b,28.9,68.5,warn
1725148920000,beijing,rack-a,25.1,47.2,ok
1725148980000,shanghai,rack-b,29.4,70.1,warn
CSV

"$TSFILE_CLI" write \
  --table sensors \
  --tag site STRING \
  --tag rack STRING \
  --field temperature DOUBLE \
  --field humidity DOUBLE \
  --field status STRING \
  --input "$DEMO_DIR/sensors.csv" \
  --output "$DEMO_DIR/sensors.tsfile"

```

`write` 成功时默认保持安静，退出码为 `0`；加上 `-v` 才会在 `stderr` 输出创建摘要。它只创建新的单表 table-model TsFile，不修改已有文件，也不创建 tree-model 文件。

## 1. stdout 是结果，stderr 是诊断

先看文件级信息：

```bash
"$TSFILE_CLI" meta -f csv "$DEMO_DIR/sensors.tsfile"
"$TSFILE_CLI" schema -t sensors -f csv "$DEMO_DIR/sensors.tsfile"

```

读取类命令把结构化结果写到 `stdout`。因此可以把结果保存下来，或者直接交给下游程序：

```bash
set -o pipefail
"$TSFILE_CLI" cat -t sensors \
  --tag-filter site eq beijing \
  -m temperature -m humidity \
  -f ndjson "$DEMO_DIR/sensors.tsfile" \
  | jq -s '{rows: length, max_temperature: (map(.temperature) | max | . * 10 | round / 10)}'

```

对本文四行样例，预期显示：

```json
{"rows":2,"max_temperature":25.1}
```

这里将最大值四舍五入到一位小数，仅用于显示；底层浮点序列化可能出现更长的小数尾数。无损往返验证必须保留原始数值，应用显示舍入掩盖差异。pipefail 使上游 CLI 失败能够导致整条管道失败，但下游输出保持原样下游已经输出的内容；自动化流程必须检查整条管道状态后再接受结果。

`stderr` 应该混入这条数据流。比如打开 `-v` 或发生错误时，摘要和诊断仍然写在 `stderr`，所以调用方可以安全地把 `stdout` 交给 JSON 解析器：

```bash
"$TSFILE_CLI" cat -t sensors -f ndjson \
  "$DEMO_DIR/sensors.tsfile" \
  > "$DEMO_DIR/rows.ndjson" \
  2> "$DEMO_DIR/rows.err"

```

`rows.ndjson` 保存数据，`rows.err` 保存诊断，两者可以分别归档。

## 2. 以退出码判断命令是否完整成功

TsFile-Cli 使用四类退出状态：

| 退出码 | 含义 | 调用方该怎么做 |
|-|-|-|
| 0 | 完整成功 | 接受 stdout 或正式输出文件 |
| 1 | 用法或参数错误 | 修正命令、模型、对象或列名 |
| 2 | 输入问题 | 检查文件是否存在、损坏，或 CSV 是否非法 |
| 3 | 运行或目标交付失败 | 检查查询执行、输出写入、flush/close、目标冲突等问题 |

请以退出码作为完整性判断，stdout 只作为数据载体。`cat`、`head` 和 `export` 需要解码数据页，错误可能发生在已经输出部分结果之后；只要退出码为 `0` 时接受结果，其他状态进入诊断流程。一个脚本可以这样写：

```bash
set -eu
set -o pipefail

if ! "$TSFILE_CLI" cat -t sensors -f ndjson "$DEMO_DIR/sensors.tsfile" \
      > "$DEMO_DIR/all.ndjson" \
      2> "$DEMO_DIR/all.err"; then
  printf 'TsFile read failed; see %s\n' "$DEMO_DIR/all.err" >&2
  exit 1
fi

jq -s 'length' "$DEMO_DIR/all.ndjson"

```

这里的 `exit 1` 是外层脚本自己的失败状态；真实失败原因仍保留在 `all.err`。如果下游提前关闭管道，写端也可能收到 `SIGPIPE/EPIPE`，按工具契约返回运行期失败。对于只想取前几行的场景，优先使用 `tsfile-cli head -n`，这样限制发生在 TsFile-Cli 内部：

```bash
"$TSFILE_CLI" head -t sensors -n 2 -f csv "$DEMO_DIR/sensors.tsfile"

```

## 3. NDJSON 和 CSV 是给程序的接口

TsFile-Cli 提供 `table`、`csv` 和 `ndjson` 三种输出形式：

- table 适合人直接阅读；为对齐列，它可能使用临时 spool，需要结合资源消耗选择流式格式。
- csv 遵循 RFC 4180，适合支持 CSV 语法的工具。空值写作未引用的 \N，空字符串写作 ""。
- ndjson 每行一个 JSON 对象，适合 jq 或逐行处理器。空值是 null，非有限浮点数也归一化为 JSON null。

例如，用 NDJSON 筛选温度达到或超过 28 摄氏度的记录：

```bash
set -o pipefail
"$TSFILE_CLI" cat -t sensors -m temperature -m humidity \
  -f ndjson "$DEMO_DIR/sensors.tsfile" \
  | jq 'select(.temperature != null and .temperature >= 28)'

```

本文样例对应上海机房的两条记录。通用 CSV 可能包含引号、字段内逗号和换行，应使用 awk -F, 代替 CSV 解析器。

在自动化脚本中建议显式指定 `-f csv` 或 `-f ndjson`，请依赖终端环境推测格式。这样同一条命令在交互式终端、重定向和 CI 中都会产生可预期的字节流。

## 4. 管道不仅能读，也能写

`write --stdin` 允许上游程序把 CSV 直接送进 TsFile-Cli：

```bash
set -euo pipefail
cat "$DEMO_DIR/sensors.csv" \
  | "$TSFILE_CLI" write \
      --table sensors \
      --tag site STRING --tag rack STRING \
      --field temperature DOUBLE \
      --field humidity DOUBLE \
      --field status STRING \
      --stdin -o "$DEMO_DIR/from-stdin.tsfile"

"$TSFILE_CLI" count -t sensors -f csv "$DEMO_DIR/from-stdin.tsfile"

```

写入有几个容易被忽略的约束：输入必须有唯一表头，并且包含保留列 `time`；列名必须与命令行声明的 TAG/FIELD 完全对应；类型不会自动推断；同一 TAG 组合内的时间戳必须严格递增。不同设备之间可以交错输入，但同一设备乱序会失败并报告行号。

失败导入会保持目标文件缺失。目标文件请使用独立路径。成功提交后再用 `count`、`meta` 或 `schema` 回读，是比“目标文件已经出现”更可靠的校验。

## 5. 需要落盘时，使用 export 而是裸重定向

管道适合把数据交给另一个进程；需要生成一个可交付文件时，使用 `export`：

```bash
"$TSFILE_CLI" export -t sensors --type csv \
  -o "$DEMO_DIR/sensors-export.csv" \
  "$DEMO_DIR/sensors.tsfile"

```

`export` 在命令级校验、读取和写入成功后才提交正式目标；`cat > sensors-export.csv` 则由 shell 立即创建目标，过程中失败可能留下半文件。这个差别在数据集发布、批处理和流水线重试时尤其重要。

## 6. 为每日数据目录生成检查报告

下面是一个基于同一 sensors Schema 的 Bash 示例。它遍历 DEMO_DIR 顶层的 TsFile，保存结构信息，读取温度列，并汇总阈值记录数。每次执行使用独立报告目录，失败文件保留诊断，尚未完成的报告不会发布为正式报告。该示例需要 Bash 与 jq，已在本专栏 TsFile-Cli 基线上对四行样例实际执行；

```bash
set -euo pipefail
REPORT_DIR=$(mktemp -d "$DEMO_DIR/check-report.XXXXXX")
shopt -s nullglob
files=("$DEMO_DIR"/*.tsfile)
if (( ${#files[@]} == 0 )); then
  printf 'No TsFile input found.\n' >&2
  exit 1
fi
: > "$REPORT_DIR/summary.pending.ndjson"
failed=0
index=0
for file in "${files[@]}"; do
  index=$((index + 1))
  prefix="$REPORT_DIR/$index"
  if "$TSFILE_CLI" meta -f ndjson "$file" > "$prefix.meta" 2> "$prefix.err" &&
     "$TSFILE_CLI" schema -t sensors -f ndjson "$file" > "$prefix.schema" 2>> "$prefix.err" &&
     "$TSFILE_CLI" cat -t sensors -m temperature -f ndjson "$file" > "$prefix.rows" 2>> "$prefix.err"; then
    jq -s --arg file "$file" \
      '{file: $file, rows: length,
        temperature_ge_28: (map(select(.temperature != null and .temperature >= 28)) | length)}' \
      "$prefix.rows" >> "$REPORT_DIR/summary.pending.ndjson"
  else
    printf 'Check failed: %s; diagnostics: %s\n' "$file" "$prefix.err" >&2
    failed=1
  fi
done
if (( failed != 0 )); then
  printf 'Report incomplete: %s\n' "$REPORT_DIR" >&2
  exit 1
fi
mv "$REPORT_DIR/summary.pending.ndjson" "$REPORT_DIR/summary.ndjson"
printf 'Report: %s\n' "$REPORT_DIR/summary.ndjson"

```

对本文四行 sensors.tsfile，预期报告包含 4 条记录，其中 2 条温度达到或超过 28 摄氏度。本次本地执行得到 rows=4、temperature_ge_28=2，与样例预期一致。脚本保存 Schema 供检查，但尚未实现与基准 Schema 的自动比对；生产流程可以在此基础上增加字段、类型和业务单位的验收规则。

目录遍历和报告管理由 Shell 承担，单文件访问由 TsFile-Cli 承担，业务阈值计算由 jq 承担。需要将通过验收的文件纳入在线服务时，再由 IoTDB 工具执行 LOAD；TsFile-Cli 专注于文件侧操作数据库。

## 小结

标准输出、诊断信息和退出状态分开后，Shell 就能组合文件读取、筛选、统计和交付操作。需要正式输出文件时，使用 `export` 或 `write`，并检查命令结果。

本文的每日报告就是一个例子：TsFile-Cli 读取文件，jq 计算温度统计，Shell 管理文件清单和报告目录。

## 继续阅读

[上一篇：文件还是数据库？](https://apache-iotdb-project.feishu.cn/docx/K0J7dNBC0owgU6xHlRachysvnQg) · [下一篇：一条 LOAD 命令接入 IoTDB](https://apache-iotdb-project.feishu.cn/docx/Ni7Kdaiv3oLBhYxKMNNcFRuqnqs) · [返回专栏目录](https://apache-iotdb-project.feishu.cn/docx/R0Sydx5Klo4cUSxKnB9cgIkAnLb)

## 参考资料

- [Apache TsFile C++ CLI README](https://github.com/apache/tsfile/tree/develop/cpp/tools)
- [TsFile-Cli Skill](https://github.com/apache/tsfile/blob/develop/cpp/tools/skills/tsfile-cli/SKILL.md)
- [Apache TsFile PR 915](https://github.com/apache/tsfile/pull/915)