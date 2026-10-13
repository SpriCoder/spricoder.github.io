---
title: 一文带你使用Apache IoTDB系统监控模块
description: 从Apache IoTDB 0.13.0版本之后可以启动监控模块对系统进行监控，并且可以使用Prometheus、Grafana等工具进行可视化
date: 2022-04-06 14:26:29
tags:
- Apache IoTDB系统监控
categories: [Metric]
mathjax: false
---
一文带你使用Apache IoTDB系统监控模块
---

在Apache IoTDB 0.13.0版本开始，我们引入了系统监控模块，本文主要介绍了如何在单机版开启系统监控模块，并且使用Prometheus + Grafana完成系统监控的可视化。

# 相关配置信息
1. Apache IoTDB：0.13.0，可以前往官网下载：https://iotdb.apache.org/Download/
2. Prometheus：2.30.3，可以前往官网下载：https://prometheus.io/download/
3. Grafana：8.4.2，可以前往官网下载：https://grafana.com/grafana/download

# 修改配置文件，启动IoTDB
1. 首先，进入到`apache-iotdb-0.13.0-all-bin`
2. 找到监控相关配置文件`conf/iotdb-metric.yml`，修改如下配置，其他配置保持不变：

```yml
# whether enable the module
enableMetric: true
```

3. 运行脚本启动IoTDB：`./sbin/start-server.sh`，出现如下提示则为启动成功

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/introduce/1.png)

4. 在浏览器进入`http://localhost:9091/metrics`网址，可以查看到如下的监控项信息：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/introduce/2.png)

# 配置Prometheus进行数据采集
1. 下载Prometheus的二进制包到本地，解压后进入对应文件夹：

```sh
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

2. 首先，我们修改Prometheus的配置文件`prometheus.yml`如下：新增`iotdb`任务收集IoTDB的监控数据

```yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "iotdb"
    static_configs:
    - targets: ["localhost:9091"]
```

3. 启动Promethues：

```sh
./prometheus --config.file=prometheus.yml
```

4. 在浏览器中输入 http://localhost:9090，进入Prometheus
5. 查看配置是否成功：我们点击进入Status下的Target界面

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/introduce/3.png)

6. 当我们看到如下图State为Up时表示配置成功并已经联通

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/introduce/4.png)

# 使用Grafana进行数据可视化

## Grafana启动与配置
1. 下载Grafana的二进制包到本地，解压后进入对应文件夹：

```sh
tar -zxvf grafana-*.tar.gz
cd grafana-*
```

2. 启动Grafana：

```sh
./bin/grafana-server web 
```

3. 在浏览器中输入 http://localhost:3000，进入Prometheus
4. 首先我们在Configuration中配置Data Source为Prometheus

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/introduce/5.png)

5. 在配置Data Source时注意Prometheus所在的URL，配置好后点击Save & Test 出现Data source is working提示则为配置成功

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/introduce/6.png)

## 在Grafana中创建Dashboard进行数据可视化
1. 首先创建Dashboard，然后创建Panel

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/introduce/7.png)

2. 之后就可以在面板根据自己的需求对监控相关的数据进行可视化（所有相关的监控指标可以先在job中选择iotdb筛选）

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/introduce/8.png)

3. 选择关注的监控指标可视化完成后，我们就得到了这样的面板：

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/Apache%20IoTDB/metric/introduce/9.png)


后续我们还会继续分享Apache IoTDB监控模块，敬请期待！

# 参考
https://iotdb.apache.org/UserGuide/Master/Maintenance-Tools/Metric-Tool.html