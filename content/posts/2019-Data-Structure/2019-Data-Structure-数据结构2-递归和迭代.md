---
title: 2019-数据结构-数据结构2-递归和迭代
date: 2020-01-17 19:02:00
description: "2019-数据结构-数据结构2-递归和迭代"
tags: 
- 数据结构
- 课程笔记
- 递归
- 迭代
categories: [2019-数据结构]
mathjax: false
---

**递归和迭代**
1. Dates: 2019/07/14.
2. Updates: 2019/10/07

# 1. 递归
1. 递归:程序调用自己的编程技巧。函数和函数的调用可以构成一个环，就可以称作一个递归。
2. 注意:
    1. 递归就是在过程或函数里面调用自身(自递归)
    2. 使用递归，必须有一个明确的递归结束条件，称为递归出口。只有**一个**就行
    3. 两个或者多个函数互相递归(互递归)
3. 过程:
    1. 递归:把复杂的问题的求解推到比原问题更简单的问题的求解
    2. 回归:获得最简单的情况后，逐步返回，依次得到复杂的解。
4. 例子:斐波那契数列，背包问题、汉诺塔问题。
```java
int fib(int n){  
    if(n>1) return fib(n-1) + fib(n-2);  
    else return n; // n = 0, 1时给recursion终止条件  
}  
``` 


## 1.1. 实例
```java
public static int bad(int n){
    if(n==1){
        return 0;
    }else{
        return bad(n/3+1)+n-1;//2/3+1=1
    }
}
```
1. 斐波那契数列递归的栈空间的波动。

### 1.1.1. 合并有序链表
<a href = "https://leetcode-cn.com/problems/merge-two-sorted-lists/solution/he-bing-liang-ge-you-xu-lian-biao-by-leetcode/">合并两个有序链表</a>

### 1.1.2. 全排列问题
1. 分格子来填入每一个字母。
```C++
#include<iostream>
using namespace std;
//如果不在最开始确定命名空间，无法正常使用库。
void perm(char list[], int k, int m) {
//k是用来确定到打印到第几个了，用来控制打印的位置。
	int i;
	if (k == m) {
		for (i = 0; i <= m; i++)
			cout << list[i];
		cout << endl;
	}
	else {
		for (i = k; i <= m; i++) {
			swap(list[k], list[i]);
			perm(list, k + 1, m);
			swap(list[k], list[i]);
		}
	}
}
int main() {
	char list[3] = { '1','2','3' };
	perm(list, 0, 2);
}        
```
2. 就是从重复(m-k)次将第k次到第m次元素的全排列输出。

### 1.1.3. 汉诺塔问题
1. java实现

![](https://spricoder.oss-cn-shanghai.aliyuncs.com/2019-Data-Structure/img\cpt1\im1-25.png)


## 1.2. 要点
1. 无论如何运行，结果必须**收敛到初始条件**上。
2. 如果不能满足上一条会导致无法跳出。

# 2. 迭代
1. 迭代:利用变量的原值推算出变量的一个新值
2. 递归中一定有迭代，但是迭代中不一定有递归。
3. 更加接近于人，就是正向思考逼近的过程。
```java
int fib(int n){  
    int i, temp0, temp1, temp2;        
    if(n<=1) return n;  
    temp1 = 0;  
    temp2 = 1;  
    for(i = 2; i <= n; i++){  
        temp0 = temp1 + temp2;  
        temp2 = temp1;  
        temp1 = temp0;  
    }  
    return temp0;  
} 
```