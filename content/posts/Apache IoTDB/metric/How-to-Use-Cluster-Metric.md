---
title: 如何使用 Apache IoTDB 分布式系统监控
description: 从Apache IoTDB 0.13.0版本之后可以启动监控模块对系统进行监控，并且可以使用Prometheus、Grafana等工具进行可视化
date: 2023-01-02 14:26:29
tags:
- 如何使用 Apache IoTDB 分布式系统监控
categories: [Metric]
mathjax: false
---
如何使用 Apache IoTDB 分布式系统监控
---

从 Apache IoTDB 0.13.0 版本开始，我们引入了系统监控模块，可以完成对 Apache IoTDB 的重要运行指标进行监控，本文介绍了如何在 Apache IoTDB 分布式开启系统监控模块，并且使用 Prometheus  + Grafana 的方式完成对系统监控指标的可视化。

# 1. 软件配置信息
1. Apache IoTDB：1.0 版本及以上，可以前往<a href ="https://iotdb.apache.org/Download/">官网</a>下载
2. Prometheus：2.30.3 版本及以上，可以前往<a href = "https://prometheus.io/download/">官网</a>下载
3. Grafana：8.4.2 版本及以上，可以前往<a href = "https://grafana.com/grafana/download">官网</a>下载

# 2. 集群基础信息
本文在一台机器上启动 1 个 ConfigNode 和 1 个 DataNode 来搭建最简单的 Apache IoTDB 分布式集群，后续可以根据自己的需求调整 ConfigNode 和 DataNode 的数量，相关的配置是类似的。本文搭建的集群的基本配置信息如下表所示：

| 集群角色   | 节点IP    | 监控模块推送器 | 监控模块级别 | 监控 Port |
| ---------- | --------- | -------------- | ------------ | --------- |
| ConfigNode | 127.0.0.1 | PROMETHEUS     | IMPORTANT    | 9091      |
| DataNode   | 127.0.0.1 | PROMETHEUS     | IMPORTANT    | 9093      |

# 3. 启动 Apache IoTDB 分布式集群
## 3.1. 启动 Apache IoTDB ConfigNode
1. 进入`apache-iotdb-1.0.0-all-bin`包
2. 修改配置文件`conf/iotdb-confignode.properties`，修改如下配置，其他配置保持不变：

```properties
cn_metric_reporter_list=PROMETHEUS
cn_metric_level=IMPORTANT
cn_metric_prometheus_reporter_port=9091
```

3. 运行脚本启动 ConfigNode：`./sbin/start-confignode.sh`，出现如下提示则为启动成功：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/1.png)

4. 在浏览器进入http://localhost:9091/metrics网址，可以查看到如下的监控项信息：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/2.png)

## 3.2. 启动 Apache IoTDB DataNode
1. 进入`apache-iotdb-1.0.0-all-bin`包
2. 修改配置文件`conf/iotdb-datanode.properties`，修改如下配置，其他配置保持不变：

```properties
dn_metric_reporter_list=PROMETHEUS
dn_metric_level=IMPORTANT
dn_metric_prometheus_reporter_port=9093
```

3. 运行脚本启动 ConfigNode：`./sbin/start-datanode.sh`，出现如下提示则为启动成功：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/3.png)

4. 在浏览器进入`http://localhost:9093/metrics`网址，可以查看到如下的监控项信息：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/4.png)

# 4. 配置 Prometheus 进行监控指标采集
1. 下载Prometheus的二进制包到本地，解压后进入对应文件夹：

```sh
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

2. 首先，我们修改Prometheus的配置文件prometheus.yml如下
   1. 新增 confignode 任务收集 ConfigNode 的监控数据
   2. 新增 datanode 任务收集 DataNode 的监控数据

```yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "prometheus"
    static_configs:
    - targets: ["localhost:9090"]
  - job_name: "confignode"
    static_configs:
    - targets: ["localhost:9091"]
    honor_labels: true
  - job_name: "datanode"
    static_configs:
    - targets: ["localhost:9093"]
    honor_labels: true
```

3. 启动Promethues

```sh
./prometheus --config.file=prometheus.yml
```

4. 在浏览器中输入 http://localhost:9090，进入Prometheus
5. 查看配置是否成功：我们点击进入Status下的Target界面

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/5.png)

6. 当我们看到如下图State均为Up时表示配置成功并已经联通，点击左侧链接可以跳转到网页监控。

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/6.png)

# 5. 使用 Grafana 进行数据可视化

## 5.1. Grafana 安装、配置与启动
1. 下载Grafana的二进制包到本地，解压后进入对应文件夹：

```sh
tar -zxvf grafana-*.tar.gz
cd grafana-*
```

2. 启动Grafana并进入：

```sh
./bin/grafana-server web 
```

3. 在浏览器中输入 http://localhost:3000，进入Grafana，默认初始用户名和密码均为 admin。
4. 首先我们在 Configuration 中配置 Data Source 为 Prometheus

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/7.png)

5. 在配置 Data Source 时注意 Prometheus 所在的URL，配置好后点击Save & Test 出现 Data source is working 提示则为配置成功

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/8.png)

## 5.2. 使用官方提供的 Dashboard 进行数据可视化
### 5.2.1. Grafana Dashboard Json获取方式
1. 从 GitHub 官网下载：
   1. Apache IoTDB ConfigNode Dashboard
   2. Apache IoTDB DataNode Dashboard
2. 从 Grafana 官网获取：https://grafana.com/grafana/dashboards/?search=Apache+IoTDB

### 5.2.2. 导入 Grafana Dashboard 并使用
1. 进入 Grafana，选择 Dashboards 的 Browse

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/9.png)

2. 点击右侧 Import 按钮

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/10.png)

3. 选择一种方式导入 Dashboard
   1. 上传本地已下载的 Dashboard 的 Json 文件
   2. 输入 Grafana 官网获取到的 Dashboard 的 URL 或者 ID
   3. 将  Dashboard 的 Json 文件内容直接粘贴进入

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/11.png)

4. 选择 Dashboard 的 Prometheus 为刚刚配置好的 Data Source，然后点击 Import

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/12.png)

5. 之后进入 Dashboard，选择 job 为 ConfigNode，就看到如下的监控面板

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/13.png)

6. 同样地，我们可以导入 Apache DataNode Dashboard，选择 job 为 DataNode，就看到如下的监控面板：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/14.png)

## 5.3. 创建新的 Dashboard 进行数据可视化
1. 首先创建Dashboard，然后创建Panel

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/15.png)

2. 之后就可以在面板根据自己的需求对监控相关的数据进行可视化（所有相关的监控指标可以先在job中选择confignode/datanode筛选）

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/16.png)

3. 选择关注的监控指标可视化完成后，我们就得到了这样的面板：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/cluster-introduce/17.png)

后续我们还会继续分享Apache IoTDB监控模块，敬请期待！

# 6. 用户手册
<a href = "https://iotdb.apache.org/zh/UserGuide/Master/Monitor-Alert/Metric-Tool.html">中文用户手册</a>
