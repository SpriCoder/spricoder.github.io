interface ReadingStage {
  label: string;
  description: string;
  postIds: string[];
}

interface SeriesGuide {
  description: string;
  audience: string;
  prerequisites: string;
  goal: string;
  startId: string;
  featuredId: string;
  featuredReason: string;
  stages: ReadingStage[];
}

export const seriesGuides: Record<string, SeriesGuide> = {
  '与 AI 一起工作': {
    description: 'AI 工具、Agent 协作、评测与科研实践。',
    audience: '希望把 AI 用于日常工作，或正在搭建 Agent 与 AI 工具链的读者。',
    prerequisites: '有使用 AI 对话工具的经验即可；前四篇从常见协作问题讲起。',
    goal: '说清任务边界、权限与验收条件，并理解 Agent 的连接、状态和评测方法。',
    startId: 'ai-work/我们需要的不是更快的AI而是更慢一点的判断.md',
    featuredId: 'ai-work/MCP-Skills-Plugin-讲解与区分.md',
    featuredReason: '从连接、流程到分发，厘清 AI 工具链中三个常被混淆的概念。',
    stages: [
      {
        label: '入门：建立协作边界',
        description: '先保留人的判断，再定义任务、验证完成声明和收束工具权限。',
        postIds: [
          'ai-work/我们需要的不是更快的AI而是更慢一点的判断.md',
          'ai-work/一个好的Prompt不是更长的命令而是更清楚的任务边界.md',
          'ai-work/与 AI 一起工作｜3. AI 说完成了，为什么你还不能相信它.md',
          'ai-work/与 AI 一起工作｜4. 当 AI 可以修改文件和发送消息，权限应该怎样给.md',
        ],
      },
      {
        label: '实践：理解 Agent 系统',
        description: '搭建工具链前，理解工具连接、上下文与记忆，以及多 Agent 分工。',
        postIds: [
          'ai-work/MCP-Skills-Plugin-讲解与区分.md',
          'ai-work/与 AI 一起工作｜6. 上下文、记忆与知识库，不是同一回事.md',
          'ai-work/与 AI 一起工作｜7. 多 Agent，不是多开几个聊天窗口.md',
        ],
      },
      {
        label: '深入：评测与专业场景',
        description: '从执行过程与评价尺度出发，继续讨论科研和数据系统中的证据边界。',
        postIds: [
          'ai-work/与 AI 一起工作｜8. 为什么评价 Agent 不能只看最终答案.md',
          'ai-work/与 AI 一起工作｜9. LLM-as-a-Judge 能不能给 AI 当裁判.md',
          'ai-work/Open-Open-Reasoning_Thinking_Signature_仓库调研.md',
          'ai-work/与 AI 一起工作｜11. AI 做科研，真正难的不是生成一个假设.md',
          'ai-work/与 AI 一起工作｜12. 数据库为什么需要变得 Agent-Friendly.md',
        ],
      },
    ],
  },
  '基准测试方法与实践': {
    description: '工作负载设计、测试工具与性能结果分析。',
    audience: '需要做时序数据库性能回归、产品选型或系统调优的工程师。',
    prerequisites: '了解数据库读写与基本命令行操作；实际运行时按文章准备 Java 和被测数据库。',
    goal: '从最小写入测试走向可复现的负载设计、公平比较与结果归档。',
    startId: 'benchmarking/基准测试工具之你不知道的两三事｜1. 数据库基准测试工具是什么.md',
    featuredId: 'benchmarking/基准测试工具之你不知道的两三事｜7. 怎样做一场公平的性能对比.md',
    featuredReason: '先检查两个结果是否回答同一个问题，再讨论吞吐量与延迟。',
    stages: [
      {
        label: '入门：建立写入基线',
        description: '认识测试工具、跑通最小写入，再理解负载与结果波动。',
        postIds: [
          'benchmarking/基准测试工具之你不知道的两三事｜1. 数据库基准测试工具是什么.md',
          'benchmarking/IoT Benchmark 上手：从一次时序数据库写入测试开始.md',
          'benchmarking/基准测试工具之你不知道的两三事｜3. 如何模拟线上写入负载.md',
          'benchmarking/基准测试工具之你不知道的两三事｜4. 如何读懂测试结果波动.md',
        ],
      },
      {
        label: '实践：模拟负载与公平比较',
        description: '把读写比例、查询窗口和固定条件组织成可解释的比较。',
        postIds: [
          'benchmarking/基准测试工具之你不知道的两三事｜5. 什么是读写混合负载.md',
          'benchmarking/基准测试工具之你不知道的两三事｜6. 如何模拟线上读写混合负载.md',
          'benchmarking/基准测试工具之你不知道的两三事｜7. 怎样做一场公平的性能对比.md',
        ],
      },
      {
        label: '深入：系统行为与复盘',
        description: '继续检查并发、乱序、接口与正确性，并保存配置、日志和结论边界。',
        postIds: [
          'benchmarking/基准测试工具之你不知道的两三事｜8. 怎样找到并发与批大小的合理区间.md',
          'benchmarking/基准测试工具之你不知道的两三事｜9. 如何模拟乱序写入.md',
          'benchmarking/基准测试工具之你不知道的两三事｜10. 不同写入接口该怎样比较.md',
          'benchmarking/基准测试工具之你不知道的两三事｜11. 性能测试与正确性验证有什么区别.md',
          'benchmarking/基准测试工具之你不知道的两三事｜12. 单机测试与集群测试有什么不同.md',
          'benchmarking/基准测试工具之你不知道的两三事｜13. 怎样保存和复盘一轮测试.md',
          'benchmarking/基准测试工具之你不知道的两三事｜14. 一份可复用的 IoT Benchmark 测试方案模板.md',
          'benchmarking/基准测试工具之你不知道的两三事｜15. 端到端案例：如何完成一次时序数据库选型.md',
        ],
      },
    ],
  },
  '玩转时序数据集': {
    description: 'TsFile、IoTDB、数据访问与常用工具。',
    audience: '需要交付、查询或分析时序数据，并希望衔接脚本与 AI 工具的读者。',
    prerequisites: '了解 CSV、基本命令行和 SQL；按各篇说明准备 TsFile-Cli 或 IoTDB 演示环境。',
    goal: '选择合适的数据访问入口，完成文件与数据库间的操作，并检查往返一致性。',
    startId: 'benchmarking/tsfile-dataset/00-series-overview.md',
    featuredId: 'benchmarking/tsfile-dataset/03-choose-file-or-database.md',
    featuredReason: '围绕具体任务，选择本地文件工具、在线数据库或程序接口。',
    stages: [
      {
        label: '入门：认识数据与访问入口',
        description: '从专栏导读进入，创建和检查文件，再按任务选择工具。',
        postIds: [
          'benchmarking/tsfile-dataset/00-series-overview.md',
          'benchmarking/tsfile-dataset/01-create-tsfile.md',
          'benchmarking/tsfile-dataset/02-understand-tsfile.md',
          'benchmarking/tsfile-dataset/03-choose-file-or-database.md',
        ],
      },
      {
        label: '实践：工具链与数据往返',
        description: '组合命令、加载与导出数据，再用脚本检查结构、计数和明细。',
        postIds: [
          'benchmarking/tsfile-dataset/04-tsfile-cli-unix-toolchain.md',
          'benchmarking/tsfile-dataset/05-从本地 TsFile 加载进入 IoTDB.md',
          'benchmarking/tsfile-dataset/06-从 IoTDB 导出 table-model TsFile.md',
          'benchmarking/tsfile-dataset/07-LOAD 之后：验证 TsFile 与 IoTDB 往返一致性.md',
        ],
      },
      {
        label: '深入：AI 访问与模型接入',
        description: '先了解 Skill 如何指导数据访问；预测篇需另备连续历史序列，四行演示数据不用于预测。',
        postIds: [
          'benchmarking/tsfile-dataset/08-ai-skill-access-tsfile.md',
          'benchmarking/tsfile-dataset/09-timechoai-timer-forecast.md',
        ],
      },
    ],
  },
};
