---
date: 2026-10-11
permalink: benchmarking/tsfile-dataset/05/
title: 玩转 TsFile｜05-一条 LOAD 命令：把本地 TsFile 接入 IoTDB
series: 玩转时序数据集
series_order: 5
---

玩转 TsFile｜05-一条 LOAD 命令：把本地 TsFile 接入 IoTDB

前几篇文章把一份 CSV 做成了可携带的 table-model TsFile，并用 TsFile-Cli 在本地完成了检查。现在把这份文件交给 IoTDB，看看它怎样从文件识别表结构、建立数据库中的对象，并让数据重新出现在 SQL 查询结果里。

本篇回到导读提出的“可流转”价值：将已检查的文件交给 IoTDB，形成在线查询对象。

设想一次跨地域机房温度异常的联合排查：现场人员提交包含异常时段观测记录的 TsFile，运维团队关注温度变化，设备团队关注不同机架的状态，分析人员需要计算时间段内的统计指标。加载到 IoTDB 后，这份离线数据可以成为多个团队共同查询的对象。本文以四行数据演示接入步骤，团队协作是由此延伸的应用场景。

TsFile 提供共同的数据格式，IoTDB 的 LOAD 承担数据库接入；TsFile-Cli 在加载前提供文件检查。在线查询、聚合、权限和生命周期管理由 IoTDB 及其配置承接。

## 本篇要完成的操作

本文仍然使用 `sensors` 示例表。它有两个 TAG 和三个 FIELD：

| 列 | 类别 | 类型 |
|-|-|-|
| `site` | TAG | STRING |
| `rack` | TAG | STRING |
| `temperature` | FIELD | DOUBLE |
| `humidity` | FIELD | DOUBLE |
| `status` | FIELD | STRING |

配套数据约定为：time 使用 Unix 毫秒时间戳，temperature 使用摄氏度，humidity 使用相对湿度百分比（%）；这些业务单位由数据说明提供，不由字段类型自动推导。四行记录来自北京与上海机房各两次观测，完整 CSV 见第 01 篇。

目标是完成下面这条路径：

```text
sensors.tsfile
  -> IoTDB LOAD
  -> tsfile_cli_demo.sensors
  -> DESCRIBE / SELECT / COUNT
```

验收同时检查 `LOAD` 命令状态和查询结果：

1. `sensors` 表出现在目标数据库中；
2. TAG/FIELD 类别和类型与源文件一致；
3. 查询返回 4 行，`temperature` 有 4 个非空点。

## 1. 准备路径和服务

下面的路径变量需要替换为你本机可访问的 TsFile-Cli 可执行文件、IoTDB distribution 和演示目录。

使用环境变量把本机路径写清楚。路径必须是 IoTDB 服务端能够访问的路径；本地单机中客户端和服务端共享文件系统，所以可以直接使用绝对路径。

```bash
IOTDB_DIST=/absolute/path/to/apache-iotdb-2.x-all-bin
DEMO_DIR=/absolute/path/to/tsfile-cli-demo
TSFILE_CLI=/absolute/path/to/tsfile-cli
SOURCE_TSFILE="$DEMO_DIR/sensors.tsfile"

```

本例要求 IoTDB 使用与源数据一致的毫秒时间精度。启动前确认目标配置的时间精度，避免将相同整数解释为不同时间。

测试使用独立的本地实例；

启动本地 IoTDB：

```bash
cd "$IOTDB_DIST"
./sbin/start-standalone.sh
```

生产环境请继续使用默认密码。本文使用 `root/root` 只为了隔离的本地演示。

## 2. 先确认文件本身可读

加载前先用 TsFile-Cli 检查源文件。这样可以把“文件自身有问题”和“数据库加载有问题”分开。

```bash
"$TSFILE_CLI" meta -f csv "$SOURCE_TSFILE"
"$TSFILE_CLI" schema -t sensors -f csv "$SOURCE_TSFILE"
"$TSFILE_CLI" count -t sensors -f csv "$SOURCE_TSFILE"
```

应看到 table-model、`sensors` 表，以及 4 行数据对应的字段计数。若 `meta` 或 `schema` 已经失败，请直接继续排查 IoTDB；先回到创建 TsFile 的步骤。

## 3. 创建目标数据库

table-model 的 LOAD 需要目标数据库。以下使用专用演示数据库，执行前应确认其中缺少其他数据；如果已完成本例加载，可直接回读验收，避免重复操作。可以在 IoTDB CLI 中执行：

```bash
./sbin/start-cli.sh \
  -h 127.0.0.1 -p 6667 \
  -u root -pw root \
  -sql_dialect table \
  -e "create database if not exists tsfile_cli_demo"
```

这里的 `-sql_dialect table` 很重要。它让 CLI 使用 IoTDB 的表模型语法；请将表模型 SQL 和树模型路径语法混用。

## 4. 执行 LOAD

直接把本地 TsFile 加载到刚创建的数据库：

```bash
./sbin/start-cli.sh \
  -h 127.0.0.1 -p 6667 \
  -u root -pw root \
  -sql_dialect table \
  -e "load '$SOURCE_TSFILE' with ('database'='tsfile_cli_demo', 'on-success'='none')"
```

这条命令中：

- `load` 是 IoTDB 的数据库命令，IoTDB 工具负责连接 IoTDB Server，TsFile-Cli 专注文件侧操作；
- `database` 指定表模型文件的落点；
- `on-success=none` 保留源文件，便于后续回读、审计和归档。

交互式场景也可以先 `USE tsfile_cli_demo`，再执行 `LOAD '<path>'`。在脚本中显式写出 `database` 可减少当前会话状态造成的目标选择错误。

如果 IoTDB 在远程主机或集群中运行，`SOURCE_TSFILE` 必须是服务端可达的路径。把本机的 `/Users/...` 路径直接传给远端服务，应算完成加载；应先放到服务端共享存储或目标节点可见的目录。

## 5. 验证表结构和数据

先看表是否出现：

```bash
./sbin/start-cli.sh -sql_dialect table \
  -e "show tables from tsfile_cli_demo"
```

在此前实跑中，缺少预先执行 CREATE TABLE，IoTDB 自动从 TsFile 创建了 sensors 表。若目标实例关闭了自动创建 schema，需要先创建一个与 TsFile 完全兼容的表。

再查看列定义：

```bash
./sbin/start-cli.sh -sql_dialect table \
  -e "describe tsfile_cli_demo.sensors"
```

期望得到：

```text
+-------------+---------+--------+
|   ColumnName| DataType|Category|
+-------------+---------+--------+
|         time|TIMESTAMP|    TIME|
|         site|   STRING|    TAG|
|         rack|   STRING|    TAG|
|  temperature|   DOUBLE|  FIELD|
|     humidity|   DOUBLE|  FIELD|
|       status|   STRING|  FIELD|
+-------------+---------+--------+
```

最后查询数据：

```bash
./sbin/start-cli.sh -sql_dialect table \
  -e "select time, site, rack, temperature, humidity, status
      from tsfile_cli_demo.sensors
      order by time"
```

再用一个采用独立的展示格式的聚合做验收：

```bash
./sbin/start-cli.sh -sql_dialect table \
  -e "select count(*) as rows,
             count(temperature) as temperature_points
      from tsfile_cli_demo.sensors"
```

结果应为 `rows=4`、`temperature_points=4`。至此，文件级检查和数据库级回读都通过，才可以说这份数据已经进入了这个 IoTDB 实例。

## 6. 加载后，数据与文件有什么变化

TsFile 已保存表名、列类别和数据类型，IoTDB 可以据此加载数据，省去先转换成 CSV 再逐行插入的步骤。加载时仍需确认文件与目标实例兼容。

加载过程中，IoTDB 可能执行以下处理：

- schema 校验和数据库、分区映射；
- 文件传输或服务端读取；
- 按 DataRegion 或时间分区拆分内部文件；
- 与实例当前配置和存储策略相关的写入处理。

此前演示中，源文件加载后对应了两个内部 TsFile，查询到的表结构与数据仍与源文件一致。内部文件数量和布局由实例的分区与存储配置决定。

## 7. 常见失败与定位顺序

1. `LOAD` 找不到文件：检查路径是否为服务端可见的绝对路径。
2. 找不到目标数据库：先执行 `create database`，或检查 `database` 参数拼写。
3. schema 出现差异：对照 `tsfile-cli schema` 和 `DESCRIBE`，重点检查 TAG/FIELD 类别、数据类型和表名。
4. 表没有自动创建：检查实例的自动建模配置，必要时先手动创建兼容表。
5. 文件已成功但查询行数不对：检查是否加载到错误数据库、查询是否带过滤条件，以及是否重复加载了同一批数据。

排查时保留源文件、加载返回信息与服务日志，再通过 SQL 核对目标表及记录。

## 继续阅读

[上一篇：让 TsFile 像 Unix 文件一样进入工具链](https://apache-iotdb-project.feishu.cn/docx/OWmCdYG97ojuJLx6OyOcUbx4nRf) · [下一篇：从 IoTDB 导出 table-model TsFile](https://apache-iotdb-project.feishu.cn/docx/MVCKdL1suos4vHxk2vPcE7Udn4j) · [想一次验收完整链路？跳到闭环验证](https://apache-iotdb-project.feishu.cn/docx/APQido4BRoaH6QxbwVPcz5cpn9e)

## 小结

本篇完成了从文件检查到数据库查询的过程。后续团队可以在同一张表上筛选记录、计算统计值，或将需要的数据再次导出。

继续下一篇前，确认 `sensors` 的字段定义正确，且查询得到 4 条演示记录。