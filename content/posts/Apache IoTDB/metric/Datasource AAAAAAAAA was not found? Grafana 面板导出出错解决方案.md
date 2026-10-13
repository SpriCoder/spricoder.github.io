---
title: Datasource AAAAAAAAA was not found? Grafana 面板导出出错解决方案
description: Datasource AAAAAAAAA was not found? Grafana 面板导出出错解决方案
date: 2024-01-20 10:00:00
categories: [Metric]
mathjax: false
tags: ["IoTDB","可观测性","Grafana"]
content_type: practice
---

当绘制完成 Grafana 监控面板，选择导出时，我们发现导出的 json 文件名称开头是 undefined，打开文件后发现了如下的内容：

```json
{
  "error": {
    "message": "Datasource AAAAAAAAA was not found"
  }
}
```

问题原因：对应的 Datasource 的 Id 错误，导致 Grafana 无法导出，需要通过手动修正 Grafana 的 Json 模型，从而可以导出。

# 1. 找到正确的 Datasource 的 uid
点击 Dashboards 的 Browse 选项卡，点击新建 Dashboard：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana-error/1.png)

点击 Add as new panel，新建一个 Panel：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana-error/2.png)

选择 Prometheus 对应的 Datasource，任意编写一个 PromQL 后点击 Apply 保存：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana-error/3.png)

点击 Dashboard 的**设置**按钮：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana-error/4.png)

在设置中选择 **JSON Model**：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana-error/5.png)

找到对应的JSON Model中的targets中的datasource里面的uid（下图例子中正确的 uid 是 yGHX6yh4k）：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana-error/6.png)

# 2. 修复无法导出的 Dashboard 面板
进入需要修复的 Grafana 面板，在设置中选择 JSON Model：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/grafana-error/7.png)

将 JSON Object 中的所有错误的 Datasouce 的 uid 替换为正确的（在上面的例子里就是将 AAAAAAAAA 替换为 yGHX6yh4k），可以使用 Ctrl + R 完成替换，然后点击 Save Changes 保存，最后点击 Save dashboard。然后即可正常导出。