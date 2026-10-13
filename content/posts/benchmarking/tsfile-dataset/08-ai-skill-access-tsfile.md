---
date: 2026-10-11
permalink: benchmarking/tsfile-dataset/08/
title: 玩转 TsFile｜08-让 AI 少猜一步：用 Skill 可靠访问 TsFile
series: 玩转时序数据集
series_order: 8
tags: ["时序数据集","TsFile","TsFile-Cli","Agent Skills","AI Agent"]
content_type: series
---

玩转 TsFile｜08-让 AI 少猜一步：用 Skill 可靠访问 TsFile

用户将一份机房温湿度 TsFile 交给 AI，希望比较北京与上海机房的最高温度，并说明计算依据。完成这项任务，需要确认文件模型、表结构和字段含义，读取两个站点的记录，再检查工具执行状态。自然语言问题由此转化为一组可以复查的数据操作。

本篇回到导读提出的“可委托”价值：让 Agent 依照 Skill 指引调用工具并说明依据。

仓库附带的 `SKILL.md` 记录了命令用法、参数限制、输出格式和错误处理方式。支持 Skill 的 Agent 可以据此操作本地 TsFile，并用实际读取结果回答问题。

本文仍使用第 01 篇创建的四行 sensors.tsfile：一张 sensors 表、两个 TAG（site、rack）和三个 FIELD（temperature、humidity、status）。北京与上海各有两条记录。time 约定为 Unix 毫秒时间戳，温度单位为摄氏度，湿度为相对湿度百分比；业务单位来自配套数据说明，应结合由 Schema 推断。

## Skill 到底解决哪一层问题

可以把一次 AI 访问拆成三层：

```text
AI 的自然语言任务
    -> Skill：命令选择、参数约束、结果与错误语义
        -> tsfile-cli：读取或创建 TsFile
            -> TsFile 二进制文件
```

LLM 理解问题并组织回答，Agent 调用 CLI 读取文件，Skill 提供操作指引。文件中的数值仍由工具读取和计算。

这份 Skill 的范围很明确：它只面向 C++ 的 `tsfile-cli`，覆盖本地 `.tsfile` 的检查、预览、导出、统计，以及从严格 CSV 创建单个 table-model TsFile。它不连接 IoTDB Server，不提供 SQL，也不替代 Java 的 `csv2tsfile`、`parquet2tsfile` 等批量或格式转换工具；遇到这些任务，应转交对应的 IoTDB 或顶层 TsFile 工具。

## 第一步：让 AI 找到正确的二进制和 Skill

在 TsFile 源码树中，Skill 位于：

```text
cpp/tools/skills/tsfile-cli/SKILL.md
```

先声明绝对路径，后续构建与访问均采用绝对路径定位工具：

```bash
TSFILE_SOURCE=/absolute/path/to/project-tsfile
TSFILE_CLI="$TSFILE_SOURCE/cpp/build/Debug/bin/tsfile-cli"
DEMO_DIR=/absolute/path/to/tsfile-cli-demo
if [ ! -x "$TSFILE_CLI" ]; then
  (cd "$TSFILE_SOURCE/cpp" && bash build.sh -t=Debug --disable-antlr4)
fi
"$TSFILE_CLI" --version

```

构建在子 Shell 中进行，保持后续命令的工作目录。安装 Skill 时，应按照所用 AI 工具的发现规则指定目标位置，并复制完整 Skill 目录，包括 references/。只复制 SKILL.md 会遗漏其中引用的命令、错误和示例说明。

```bash
SKILL_DEST=/absolute/path/to/host-recognized-skills/tsfile-cli
# SKILL_DEST 应为该宿主认可、尚未存在的安装路径。
if [ -e "$SKILL_DEST" ]; then
  printf 'Skill destination already exists: %s\n' "$SKILL_DEST" >&2
else
  mkdir -p "$(dirname "$SKILL_DEST")" &&
    cp -R "$TSFILE_SOURCE/cpp/tools/skills/tsfile-cli" "$SKILL_DEST"
fi

```

安装路径因宿主工具而异，复制完成后仍需确认 AI 已加载 Skill 及其引用文件。本文安装路径需要依据宿主工具的发现规则确认。

## 第二步：先认识文件，再读取数据

以下命令使用上一步定义的 TSFILE_CLI 和 DEMO_DIR。

先查看模型、表名和字段结构，确认需要读取哪些记录：

```bash
"$TSFILE_CLI" ls -f ndjson "$DEMO_DIR/sensors.tsfile"
"$TSFILE_CLI" meta -f ndjson "$DEMO_DIR/sensors.tsfile"
"$TSFILE_CLI" schema -t sensors -f csv "$DEMO_DIR/sensors.tsfile"
"$TSFILE_CLI" count -t sensors -f csv "$DEMO_DIR/sensors.tsfile"

```

AI 可以据此回答几个基础问题：

- 文件是 table-model 还是 tree-model？
- 文件中有哪些表或设备？
- `sensors` 的列分别是 TAG、FIELD 还是时间列？
- 每一列的数据类型、编码和压缩方式是什么？
- 行数是否与用户预期相符？

应先用 meta、ls、schema 确认模型、对象与列，再按任务需要调用 stats、count 或行读取命令。stats 和 count 在部分情况下需要扫描数据页，应统一视为无扫描操作。count 返回逐列计数，应直接将其输出行数解释为数据行数。

## 第三步：用有边界的读取回答问题

用户的问题是：“比较北京和上海机房的最高温度，并给出各自的记录数与计算依据。”以下 Bash 片段分别执行 TAG 过滤与字段投影，只有两次读取都成功后才计算结果。每次执行建立独立证据目录，保留原始记录与诊断。

```bash
set -euo pipefail
EVIDENCE_DIR=$(mktemp -d "$DEMO_DIR/ai-evidence.XXXXXX")
for site in beijing shanghai; do
  if "$TSFILE_CLI" cat -t sensors \
       --tag-filter site eq "$site" -m temperature \
       -f ndjson "$DEMO_DIR/sensors.tsfile" \
       > "$EVIDENCE_DIR/$site.ndjson" 2> "$EVIDENCE_DIR/$site.err"; then
    :
  else
    code=$?
    printf 'Read failed for %s: exit=%s; see %s\n' "$site" "$code" "$EVIDENCE_DIR/$site.err" >&2
    exit "$code"
  fi
done
for site in beijing shanghai; do
  jq -s --arg site "$site" \
    '{site: $site, rows: length,
      valid_temperature_rows: (map(select(.temperature != null)) | length),
      max_temperature: (map(.temperature | select(. != null)) | max)}' \
    "$EVIDENCE_DIR/$site.ndjson"
done

```

对四行样例，北京与上海各有两条有效温度记录，最高温度分别约为 25.1 °C 和 29.4 °C。脚本输出保留原始数值；回答中可按一位小数展示，并说明单位来自示例约定。

该示例按站点读取全部匹配记录，内存中的 jq -s 汇总适合本文小样例。更大数据集应根据任务增加时间范围，或交由合适的流式程序、SDK 或数据库完成分析。

如果用户只想确认前两条记录，则用 `head`：

```bash
"$TSFILE_CLI" head -t sensors -n 2 -f csv "$DEMO_DIR/sensors.tsfile"

```

这些命令的格式和筛选条件都写在 Skill 的参考规则中。`ndjson` 是每行一个 JSON 对象，采用逐行 JSON 对象；CSV 遵循 RFC 4180；空值和空字符串有不同表示。AI 在解释结果时应保留这些语义，应将 CSV 的 `\N` 当成普通字符串，也应将 NDJSON 的 `null` 当成零。

## 第四步：把退出码纳入 AI 的判断

先检查退出码，确认命令是否执行成功：

```text
0  完整成功
1  用法或参数错误
2  输入问题，例如文件不存在、损坏或 CSV 非法
3  运行或目标交付失败，例如查询执行、stdout 写入、输出文件创建/提交或目标冲突
```

因此，AI 工具应同时检查命令状态、输出范围和诊断信息。对于 `head`、`cat` 和 `export`，读取或输出阶段出现错误时，退出码会进入诊断流程，已有片段标记为不完整。输入文件打不开、损坏或数据页解码失败归入退出码 `2`；运行和目标交付问题归入退出码 `3`。诊断信息从 `stderr` 读取，并在回答中说明失败发生在哪个阶段。

上一节通过独立文件保存结果，并保留 CLI 的原始退出码。若采用 CLI | jq 管道，应启用 pipefail 并检查整个管道状态；下游成功应抵消上游读取失败，已输出内容也不会因管道失败自动撤回。退出码确认的是命令执行状态，结论是否覆盖用户问题还需要检查筛选条件、时间范围、单位约定和空值处理。

## 第五步：AI 创建 TsFile 时也要遵守输入契约

用户可以让 AI 把一段传感器 CSV 创建成 TsFile：

```bash
cat "$DEMO_DIR/sensors.csv" \
  | "$TSFILE_CLI" write \
      --table sensors \
      --tag site STRING --tag rack STRING \
      --field temperature DOUBLE \
      --field humidity DOUBLE \
      --field status STRING \
      --stdin -o "$DEMO_DIR/generated.tsfile"

```

Skill 会提醒 AI 检查以下事实，而是自行推断：

1. CSV 表头必须包含保留列 `time`，并且与声明的 TAG/FIELD 名称完全一致。
2. 类型由命令行声明，类型由命令行声明；`TIMESTAMP` 使用十进制 int64，`DATE` 使用 `YYYY-MM-DD`。
3. 同一 TAG 组合代表一个设备，其时间戳必须严格递增；不同设备的行可以交错。
4. 输出文件必须事先不存在，且应使用独立的输出文件路径。
5. 成功后立即用 `meta`、`schema` 或 `count` 回读，应结合回读结果判断成功。

`write` 默认成功时保持安静；需要展示创建摘要时可加 `-v`。摘要写入 `stderr`，数据写入 `stdout`。

## 一个完整的 AI 访问回合

把上面的规则合起来，一个可复现的请求可以写成：

> 请使用 tsfile-cli Skill 检查 sensors.tsfile。先报告模型、表名、schema 和总行数；再分别筛选 site=beijing 和 site=shanghai 的温度数据，计算各自的有效温度记录数和最大值，保留用于计算的原始记录。每一步检查退出码；若失败，读取 stderr 并停止，请根据部分 stdout 推断结论。

AI 的工具调用顺序应接近：

```text
ls/meta
  -> schema/count
  -> cat（带 TAG 过滤和字段投影）
  -> 检查 CLI 退出码，保留记录与诊断
  -> jq 计算并检查其退出码
  -> 报告结论、数据范围与单位来源

```

回答中给出结果及其来源即可。例如：“`sensors` 表中，北京与上海各有两条有效温度记录，最高温度分别约为 25.1 °C 和 29.4 °C。”同时列出文件、筛选条件和单位说明，便于读者复查。

## Skill 与 IoTDB 的分工

这里介绍的 `tsfile-cli` Skill 用于本地文件访问。需要加载数据或查询数据库时，Agent 应使用相应的 IoTDB 工具：

```text
AI + tsfile-cli Skill
  -> 创建/检查本地 sensors.tsfile
IoTDB LOAD
  -> IoTDB 表与 SQL 查询
IoTDB export-data.sh
  -> 导出的 table-model TsFile
AI + tsfile-cli Skill
  -> 再次检查与比较
```

同一个 TsFile 可以供人、脚本、Agent 和 IoTDB 使用。切换工具时，应保留文件来源、对象标识和筛选范围，避免把不同任务的数据混在一起。

## 能力范围与结果可信度

Skill 的能力取决于底层工具的支持范围。该 Skill 面向本地 TsFile；数据库查询由 IoTDB 工具执行，损坏文件的修复需要相应的专用能力。创建流程使用严格 CSV 和显式 Schema，目标为新的 table-model 文件。AI 在形成结论前仍需检查执行状态、数据范围和业务说明。

## 小结

Skill 将常用操作写成可复用的指引，减少 Agent 选择命令和参数时的歧义。是否完成任务，仍要结合工具结果、数据范围和用户问题判断。

读完本篇，可以先用四行样例检查 Agent 的操作记录，再把同样的方法用于自己的数据。

## 继续阅读

[上一篇：双向闭环验证](https://apache-iotdb-project.feishu.cn/docx/APQido4BRoaH6QxbwVPcz5cpn9e) · [返回专栏目录](https://apache-iotdb-project.feishu.cn/docx/R0Sydx5Klo4cUSxKnB9cgIkAnLb) · [下一篇：从时序数据集到预测](https://apache-iotdb-project.feishu.cn/docx/PBJbdfR6lohJZzxR8LCcC0XFneb)

## 参考资料

- [TsFile-Cli Skill](https://github.com/apache/tsfile/blob/develop/cpp/tools/skills/tsfile-cli/SKILL.md)
- [Apache TsFile C++ CLI README](https://github.com/apache/tsfile/tree/develop/cpp/tools)
- [Apache TsFile PR 915](https://github.com/apache/tsfile/pull/915)