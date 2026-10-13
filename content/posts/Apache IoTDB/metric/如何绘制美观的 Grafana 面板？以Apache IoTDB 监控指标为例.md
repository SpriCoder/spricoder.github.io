---
title: 如何绘制美观的 Grafana 面板？以Apache IoTDB 监控指标为例
description: 本文以Apache IoTDB master 分支的 commit Id=eaee1d8d 为例，介绍了 Apache IoTDB 的监控指标通过 Prometheus 格式进行采集，并且使用 Grafana 的方式进行可视化
date: 2024-01-13 21:46:00
categories: [Metric]
mathjax: false
tags: ["IoTDB","可观测性","Grafana"]
content_type: practice
---

本文以Apache IoTDB master 分支的 commit Id=eaee1d8d 为例，介绍了 Apache IoTDB 的监控指标通过 Prometheus 格式进行采集，并且使用 Grafana 的方式进行可视化。

# 1. 监控指标的 Prometheus 格式说明
> 对于 Metric Name 为 name, Tags 为 K1=V1, ..., Kn=Vn 的监控指标有如下映射，其中 value 为具体值

| 监控指标类型     | 映射关系                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Counter          | name_total{k1="V1", ..., Kn="Vn"} value                                                                                                                                                                                                                                                                                                                                                                                                                                |
| AutoGauge、Gauge | name{k1="V1", ..., Kn="Vn"} value                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Histogram        | name_max{k1="V1", ..., Kn="Vn"} value<br>name_sum{k1="V1", ..., Kn="Vn"} value<br>name_count{k1="V1", ..., Kn="Vn"} value<br>name{k1="V1", ..., Kn="Vn", quantile="0.0"} value<br>name{k1="V1", ..., Kn="Vn", quantile="0.5"} value<br>name{k1="V1", ..., Kn="Vn", quantile="0.75"} value<br>name{k1="V1", ..., Kn="Vn", quantile="0.99"} value<br>name{k1="V1", ..., Kn="Vn", quantile="0.999"} value                                                                 |
| Rate             | name_total{k1="V1", ..., Kn="Vn"} value<br>name_total{k1="V1", ..., Kn="Vn", rate="m1"} value<br>name_total{k1="V1", ..., Kn="Vn", rate="m5"} value<br>name_total{k1="V1", ..., Kn="Vn", rate="m15"} value<br>name_total{k1="V1", ..., Kn="Vn", rate="mean"} value                                                                                                                                                                                                     |
| Timer            | name_seconds_max{k1="V1", ..., Kn="Vn"} value<br>name_seconds_sum{k1="V1", ..., Kn="Vn"} value<br>name_seconds_count{k1="V1", ..., Kn="Vn"} value<br>name_seconds{k1="V1", ..., Kn="Vn", quantile="0.0"} value<br>name_seconds{k1="V1", ..., Kn="Vn", quantile="0.5"} value<br>name_seconds{k1="V1", ..., Kn="Vn", quantile="0.75"} value<br>name_seconds{k1="V1", ..., Kn="Vn", quantile="0.99"} value<br>name_seconds{k1="V1", ..., Kn="Vn", quantile="0.999"} value |

# 2. Prometheus 函数说明

## 2.1. Aggregation operator
> 参考文档：[Operation | Prometheus](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)

1. 运算符：`sum`(calculate sum over dimensions), `min`(select minimum over dimensions), `max`(select maximum over dimensions), `avg`(calculate the average over dimensions), `count`(count number of elements in the vector)
2. 所有的聚合运算符都可以在所有的维度列上进行聚合，也可以通过 without 或者 by 子句来决定聚合方式，对应语法规约：

```sql
<aggr-op> [without|by (<label list>)] ([parameter,] <vector expression>)
   or
<aggr-op>([parameter,] <vector expression>) [without|by (<label list>)] 
```

## 2.2. Functions
> 参考文档：[Query functions|Prometheus](https://prometheus.io/docs/prometheus/latest/querying/functions/)

**rate(v range-vector)**: 计算范围向量中时间序列的**每秒平均增长率**。rate 会自动调整单调性中断，例如由于目标重启导致的计数器重置。例如，如下的表达式返回范围向量中每个时间序列在**过去 5 分钟**内测量的**每秒** HTTP 请求速率：

```sql
rate(http_requests_total{job="api-server"}[5m])
```

**irate(v range-vector)**: 计算范围向量中时间序列的**每秒瞬时增长**率。irate 会自动调整单调性中断，例如由于目标重启导致的计数器重置。例如，如下的表达式通过查找 5 分钟前两个最近的数据点得出 HTTP 请求的每秒速率：

```sql
irate(http_requests_total{job="api-server"}[5m])
```

irate 函数同样也是通过计算一个新的直方图作为原生直方图，不同的是，计算的是原生直方图中最后2个分量之间的增长率。适用于易变的、快速移动的计数器。zh 注意，当 irate 与聚合运算符（如 sum）或随着时间聚合的函数 (任何以 _over_time 结尾的函数) 结合使用时，始终首先采用 irate，然后进行聚合，否则 irate 无法在目标启动时候检测到计数器重置。

# 3. Grafana 可视化绘制
> 官方文档参考：[Grafana Dashboard Doc](https://grafana.com/docs/)

## 3.1. 创建或导入 Dashboards
> 如果已有 Dashboard，只是修改 Dashboard 跳过本步骤

点击左侧边栏 Dashboards -> browse：

* 已有 Dashboard：点击右侧 import 按钮导入对应的 Dashboard 即可。
* 创建 Dashboard：点击右侧 New Dashboard 按钮。

进入 Dashboard 后点击右上角 设置 按钮：

* 在 General 界面更新 Name，Description，Tag 等基础信息，调整 Panel options 为 Shared crosshair，从而保证 tooltip 可以跨 panel 使用。
* 在 Variables 界面定义本 Dashboard 的变量。

添加 job 变量，类型为 Query，对应的Query Options 是 label_values(job)

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/1.png)

添加 instance 变量，类型为 Query，对应的 Query Options 是 label_values(up{job=~"$job"},instance)

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/2.png)

## 3.2. 创建 Panel
> 优秀绘制参考：[Grafana Dashboard Demo](https://play.grafana.org/dashboards)

点击右上角：Add Panel，其中 Add a new panel 是添加一个面板，Add a new row 是添加一个行（分组，两个行之间的所有 panel 属于前一个row）

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/3.png)

点击 Add a new Panel，添加一个面板。首先点击右上角，选择当前 Panel 的类型，比较常用的有Time series(时间序列)、Stat（统计）、Gauge（寄存器）等等，可以视情况选择。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/4.png)

## 3.3. 编写 PromQL

以 Timeseries 为例，首先编写对应的 PromQL 执行数据查询：

* 在 PromQL 中，可以用 $instance 访问到刚刚在 Dashboard 的 Variables 中配置的 instance 变量，job 变量也是类似的。
* 在 Legend 中，可以通过双中括号访问到对应的监控项的对应 Tag 的具体值，比如在下图的例子中，state="blocked/new/runnable/terminated/timed-waiting/waiting"，通过这样的方式修改图例。
* 可以通过点击 + Query 在当前面板添加更多时间序列

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/5.png)

## 3.4. 调整 Panel Options
在右侧的 Panel Options 中可以更新当前面板的标题、描述并设置面板背景是否透明：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/6.png)

## 3.5. 调整 Tooltip
在右侧的 Tooltip 中可以选择不同的类型：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/7.png)

Tooptip mode 包含 3 个选项：Single（只显示距离鼠标最近的一条），All（显示鼠标所在时间线的所有条，可以不排序、升序或降序），Hidden（不显示）：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/8.png)

## 3.6. 调整 Legend
在右侧的 Legend 可以调整图例：

* Mode：List（列表）、Table（表格）、Hidden（不显示）
* Placement：Bottom（放在底部）、Right（放在右侧）
* Legend Values：是否要同时显示对应的时间序列的值

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/9.png)

如下示例我们将图例放置在右侧，采用表格的形式，并且显示平均值：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/10.png)

## 3.7. 调整 Graph Styles
在右侧的 Graph Styles 可以调整线的样式，包括 line、bar 和 point 三类：

* line：还可以调整插值、线宽、填充透明度、渐变模式、线形、空值连接方法、是否显示等属性
* bar：还可以调整类型、线宽、填充透明度、渐变模式、是否显示点等属性
* points：还可以调整点大小等属性

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/11.png)

如下示例我们使用线，设置填充透明度为5%，从不显示点：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/12.png)

## 3.8. 调整 Axis
在右侧的 Axis 可以调整对应的轴信息，包括标签、宽度、纵轴最小值、纵轴最大值等等，一般不需要调整：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/13.png)

## 3.9. 调整 Standard Options
在右侧的 Standard options 可以设置单位（有byte, s, ms, us, ns等等，还可以自定义）、显示最小值、显示最大值、精度、展示名称、配色（可以选择单个颜色、根据阈值或者现有配色方案）等：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/14.png)

如下示例为自定义单位为个，最小值设置为0，最大值设置为300：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/15.png)

## 3.10. 调整 Value Mappings
在右侧的 Value mappings 可以添加对应的映射：可以根据值、范围、正则和特殊值（空等）来控制其展示的文本，比如0代表离线，1代表上线，可以通过 value mappings 完成：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/16.png)

## 3.11. 调整 Thresholds
在右侧的 Thresholds 则是设置阈值，可以结合Standard options中的配色方案使用：

* 阈值设置：可以设置绝对阈值、相对阈值（和显示最大值、显示最小值有关）
* 阈值显示：可以选择不显示阈值、显示阈值线、显示阈值阴影和同时显示阈值线和阴影

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/17.png)

例如设置为 60% 和 80% 的阈值，并且显示阈值吸纳和阴影线：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/18.png)

## 3.12. 调整 Overrides
可以通过 Overrides 来重写部分时间序列的上述某些属性，支持通过名字、名字正则、类型和返回值重写，重写的属性具有更高的优先级：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/19.png)

例如我可以重写 name 为 waiting 的时间序列的颜色为绿色，如下所示：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/20.png)

至此，已经完成了对于 Panel 创建的简单介绍，可以通过在 Dashboard 中拖拽 Panel 改变其位置，也可以通过拖拽 Panel 的右下角来改变 panel 的大小。

# 4. 导出 Grafana
点击左上角的导出按钮：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/21.png)

点击 Export 标签页，并选择 Export for sharing externally，然后点击 save to file 就将对应的 Dashboard 的 json 文件下载到本地了：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana/22.png)

最后，将 Dashboard 的 json 上传到 GitHub (docs/UserGuide/Monitor-Alert文件夹下) 的对应位置即可。