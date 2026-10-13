---
title: MIT-6.824-Lecture1-Introduction
date: 2022-02-18 17:17:29
description: "MIT 6.824课程笔记 第一讲概述"
categories: [MIT-6.824]
mathjax: false
tags: ["分布式系统","MapReduce"]
content_type: course
course: mit-6-824
course_group: lectures
course_order: 1
---

Lec1-Introduction
---

# 1. Distributed System
1. Multiple Cooperating computers
2. Storage for big web sites, MapReduce, peer-to-peer sharing
3. A lots of critical infracture is distributed

## 1.1. Purpose of Distributed System
1. to increase capacity via parallism, that's CPU, disk and so on.
2. to tolerate faults via replication
3. to place computing physically close to external entities.
4. to achiece security via isolation: untrust code ans so on.

## 1.2. Chanllenges of Distributed System
1. Many concurrent parts, complex interactions
2. Must cope with partial failure
3. Tricky to realize performance potential 

# 2. Lab
1. Lab1-MapReduce
2. Lab2-Raft for fault tolerance
3. Lab3-K/V Server
4. Lab4-Shared K/V service

# 3. Preview
1. Infrastracture of application
   1. storage:focus on, useeful adstraction
   2. communication: tool need to be used to create distributed system
   3. computation: mapreduce
2. for storage and computation, out goal is to discover abstraction where use of simplyfing the interface of system(hide the distributed system, make syste look like non-distributed system)
3. topic
   1. Implemenatation, Tool: RPC, Threads, Concurrency Control
   2. Performance, Scalability: increasing number of people, increasing number of computer
   3. Fault Tolerance
      1. Availability：huge numbers of computer makes failure constant thing.
      2. Recoverability：for example, save disk date for recovery.
      3. Tool: non-volatile storage, replication
   4. Consistency：for key-value, there are two operation: put(k, v), get(k). but in distributed system, the replica makes many version.
      1. level of consistency
         1. Strong consistency: make gurantee
         2. Weak consistency: do not make gurantee
      2. Don't put replica(copy) in the same place

# 4. MapReduce
1. Purpose: Looking for a framework that would make it easy for non specialists to be able to write and run giant distributed computations.
2. Map function
   1. run on each of input file(or chunk)
   2. output a list of key value pair
   3. for example, input: `a b`, output: `<a,1> <b,1>`
3. Reduce function
   1. collect all output of maps
   2. for example: each reduce deal with a word, result in`<a, 2>`, `<b, 2>`. 
4. Output of MapReduce can be used as input of MapReduce, like PageRank
5. More in paper.