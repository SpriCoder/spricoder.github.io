---
title: Grafana 面板数据快照导出方法
description: 为便于线上问题排查和性能调优工作的开展，经过前期调研，本文给出如何导出 Grafana 面板数据快照的方法，后续可以离线导入到其他 Grafana 中进行交互式问题排查。
date: 2024-01-20 11:00:00
categories: [Metric]
mathjax: false
tags: ["IoTDB","可观测性","Grafana"]
content_type: practice
---

> 为便于线上问题排查和性能调优工作的开展，经过前期调研，本文给出如何导出 Grafana 面板数据快照的方法，后续可以离线导入到其他 Grafana 中进行交互式问题排查。

本文以 Apache IoTDB Performance Overview Dashboard 为例

# 1. 进入面板制作快照

## 1.1. 第一步：进入 Performance Overview 面板
1. 展开所有折叠的 Panel
2. **只有展开的面板才会实际拉取数据，同时需要自顶向下滚动页面，保证所有 panel 数据已加载**，否则会导致后续导入的数据快照中部分面板无数据
3. **调整右上角时间范围为合适的时间范围**：只有在该时间范围内的数据会被加载到数据快照中。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/data-snapshot/1.png)

## 1.2. 第二步：点击 Share Dashboard or Panel
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/data-snapshot/2.png)

## 1.3. 第三步：点击制作快照
1. 选择 Snapshot 选项
2. 点击 Load Snapshot 制作快照

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/data-snapshot/3.png)

## 1.4. 第四步：得到快照URL
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/data-snapshot/4.png)

# 2. 进入快照页面并导出数据快照

## 2.1. 第一步：进入快照页面
1. 方法一：将上文得到的快照 URL 中的 localhost 修改为 Grafana 实际所在的 IP 地址，然后输入浏览器中访问
2. 方法二：回到 Home 页面，点击 Snapshots 找到刚刚创建的快照，点击 View 访问

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/data-snapshot/5.png)

## 2.2. 第二步：点击 Share Dashboard Or Panel
![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/data-snapshot/6.png)

## 2.3. 第三步：导出数据快照 JSON 文件
1. 点击 Export 选项卡
2. 点击勾选支持外部分享
3. 点击 Save To File 下载数据快照的 JSON 文件

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/data-snapshot/7.png)

# 3. 删除快照
在完成面板数据打包下载后，可以删除掉对应的数据快照 Snapshot，具体步骤为：进入 Snapshot 页面，点击对应的快照的删除按钮：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/data-snapshot/8.png)
