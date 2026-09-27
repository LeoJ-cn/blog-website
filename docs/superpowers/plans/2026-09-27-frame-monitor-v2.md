# Frame Monitor V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `@blog/monitoring` 的帧监控升级为支持高刷新率、确定性测试、显式目标预算和 Long Animation Frame 渐进增强的可靠监控内核。

**Architecture:** 核心监控器只消费可注入的 `FrameMonitorRuntime`，生产环境 Runtime 封装浏览器 API，测试 Runtime 显式推进时间、帧、可见性和 LoAF 条目。快照将实际帧节奏、业务目标预算和 LoAF 诊断分层输出，Vue 面板只消费公共协议。

**Tech Stack:** TypeScript 5.6、Vitest 2.1.8、Vue 3.5、Playwright 1.49、Vite 6

**Spec:** `docs/superpowers/specs/2026-09-27-frame-monitor-v2-design.md`

## Global Constraints

- FPS 不封顶，必须正确处理 60/90/120/144/165/240 FPS 输入。
- `targetFps` 无默认值；未配置时 `snapshot.target` 必须为 `null`。
- 页面隐藏时间不进入 FPS、帧间隔和目标预算统计。
- LoAF 必须渐进增强；不支持时 `longAnimationFrames` 为 `null`。
- Runtime、类型和工厂只从 `packages/monitoring/src/index.ts` 暴露公共 API。
- 所有新增依赖使用精确版本；安装前必须取得用户确认。
- 本次明确授权新增和修改测试代码。
- 只执行 Vite 侧验证，禁止执行任何 Webpack 命令。

## Review Focus

- 120/144Hz 稳定输入不得被 60 FPS 预算截断；Task 2 的高刷新率参数化测试固定此行为。
- 页面隐藏后旧 rAF 回调仍到达时不得污染恢复窗口；Task 2 的 stale callback 测试固定此行为。
- listener 抛错不得阻止其他 listener 或下一帧；Task 2 的异常隔离测试固定此行为。
- LoAF 条目跨采样边界时只能进入一个窗口，停止后 observer 不得继续写入；Task 3 的窗口与清理测试固定此行为。
- 极端或非法时间戳不得产生负数、`NaN`、`Infinity`；Task 1 与 Task 2 的异常输入测试固定此行为。

---

### Task 1: 测试基础设施与帧统计函数

**Files:**
- Modify: `packages/monitoring/package.json`
- Create: `packages/monitoring/vitest.config.ts`
- Create: `packages/monitoring/src/performance/frame-statistics.ts`
- Test: `packages/monitoring/src/performance/frame-statistics.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `calculatePercentile(values: readonly number[], percentile: number): number`
- Produces: `calculateFrameSample(intervals: readonly number[], duration: number, frameCount: number): FrameSampleMetrics`
- Produces: `calculateTargetMetrics(intervals: readonly number[], fps: number, targetFps?: number): FrameTargetMetrics | null`

- [ ] **Step 1: 请求并获得依赖安装许可**

提议命令：

```bash
pnpm --filter @blog/monitoring add -D vitest@2.1.8 @vitest/coverage-v8@2.1.8
```

Expected: 用户明确同意后才执行；未同意时停止实现，不改依赖文件。

- [ ] **Step 2: 添加测试脚本和 Vitest 配置**

在 `@blog/monitoring` 增加 `test`、`test:coverage`、`test:soak`；根目录增加 `test:monitoring`。默认测试排除 `*.soak.test.ts`，环境使用 Node。覆盖率阈值固定为 statements/lines 95%、branches 90%、functions 100%。

- [ ] **Step 3: 写统计函数失败测试**

覆盖：空数组返回 0；nearest-rank p95；60/90/120/144/165/240 FPS 样本；未配置目标返回 `null`；60 与 120 目标预算；重复、负数和非有限间隔被忽略。

- [ ] **Step 4: 运行测试并确认 RED**

Run: `pnpm --filter @blog/monitoring test -- frame-statistics.test.ts`

Expected: FAIL，因为统计函数尚不存在。

- [ ] **Step 5: 实现最小统计函数**

`calculatePercentile` 使用升序数组和 nearest-rank；`calculateFrameSample` 输出当前窗口的 duration、frameCount、fps、p95 和 max；`calculateTargetMetrics` 只在有限正数目标下返回数据，并将 achievementRate 限制在 0～1。

- [ ] **Step 6: 运行测试并确认 GREEN**

Run: `pnpm --filter @blog/monitoring test -- frame-statistics.test.ts`

Expected: PASS，且高刷新率测试中的 FPS 未封顶。

- [ ] **Step 7: 提交**

```bash
git add package.json pnpm-lock.yaml packages/monitoring/package.json packages/monitoring/vitest.config.ts packages/monitoring/src/performance/frame-statistics.ts packages/monitoring/src/performance/frame-statistics.test.ts
git commit -m "test: establish frame statistics contract"
```

### Task 2: 可注入 Runtime 与帧监控生命周期

**Files:**
- Create: `packages/monitoring/src/performance/frame-monitor.runtime.ts`
- Create: `packages/monitoring/src/performance/frame-monitor.fake-runtime.ts`
- Modify: `packages/monitoring/src/performance/frame-monitor.types.ts`
- Modify: `packages/monitoring/src/performance/frame-monitor.ts`
- Test: `packages/monitoring/src/performance/frame-monitor.test.ts`
- Modify: `packages/monitoring/src/index.ts`

**Interfaces:**
- Consumes: Task 1 的 `calculateFrameSample` 与 `calculateTargetMetrics`
- Produces: `createBrowserFrameMonitorRuntime(): FrameMonitorRuntime | null`
- Produces: `createFakeFrameMonitorRuntime(initialNow?: number): FakeFrameMonitorRuntime`
- Produces: `createFramePerformanceMonitor(options?: FramePerformanceMonitorOptions): FramePerformanceMonitor`
- Produces: V2 `FramePerformanceSnapshot`、`FrameSampleMetrics`、`FrameTargetMetrics`、`FrameMonitorRuntime`

- [ ] **Step 1: 写 Fake Runtime 和监控器失败测试**

覆盖参数化高刷新率序列、窗口边界、显式目标、重复/倒退时间戳、start/stop/reset 幂等、多订阅者、最后取消后停止、listener 异常隔离、隐藏恢复、隐藏期间 stale callback 和无浏览器 Runtime 的 idle 快照。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm --filter @blog/monitoring test -- frame-monitor.test.ts`

Expected: FAIL，因为 Runtime 和 V2 快照尚不存在。

- [ ] **Step 3: 定义 V2 类型协议**

`FramePerformanceMonitorOptions` 包含 `targetFps?: number`、`sampleInterval?: number`、`runtime?: FrameMonitorRuntime | null`、`onListenerError?: (error: unknown) => void`。默认 `sampleInterval` 为 1000ms，`targetFps` 不设默认值。

- [ ] **Step 4: 实现 Browser Runtime 和 Fake Runtime**

Browser Runtime 封装 rAF、可见性订阅和高精度时间；Fake Runtime 暴露 `advanceFrame(interval)`、`setVisibility(state)`、待执行 rAF 数量和手动触发旧回调能力。

- [ ] **Step 5: 实现监控窗口和生命周期**

监控器只累计有效正向间隔；隐藏时取消 rAF 并清空未完成窗口，恢复时从新时间基线开始；每个 listener 单独捕获异常；任何 listener 行为都不能影响下一帧调度。

- [ ] **Step 6: 运行测试并确认 GREEN**

Run: `pnpm --filter @blog/monitoring test -- frame-statistics.test.ts frame-monitor.test.ts`

Expected: PASS，Fake Runtime 同时最多一个待执行 rAF。

- [ ] **Step 7: 更新公共导出并运行类型检查**

Run: `pnpm --filter @blog/web typecheck`

Expected: 旧调用方因 V2 字段变化产生明确类型错误，错误只位于待迁移的面板/composable。

- [ ] **Step 8: 提交**

```bash
git add packages/monitoring/src/performance packages/monitoring/src/index.ts
git commit -m "feat: add deterministic frame monitor runtime"
```

### Task 3: Long Animation Frame 渐进增强

**Files:**
- Modify: `packages/monitoring/src/performance/frame-monitor.runtime.ts`
- Modify: `packages/monitoring/src/performance/frame-monitor.fake-runtime.ts`
- Modify: `packages/monitoring/src/performance/frame-monitor.types.ts`
- Modify: `packages/monitoring/src/performance/frame-monitor.ts`
- Test: `packages/monitoring/src/performance/frame-monitor.test.ts`

**Interfaces:**
- Consumes: Task 2 的 Runtime 生命周期和 V2 采样窗口
- Produces: `LongAnimationFrameMetrics` 与 Runtime 的 LoAF observer 抽象

- [ ] **Step 1: 写 LoAF 失败测试**

覆盖不支持返回 `null`；支持时累计 count、totalBlockingDuration、maxDuration；采样窗口完成后归零；跨窗口条目不重复；stop、隐藏和最后取消订阅时断开 observer；恢复后重新创建 observer。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm --filter @blog/monitoring test -- frame-monitor.test.ts`

Expected: FAIL，因为 Runtime 尚未连接 LoAF observer。

- [ ] **Step 3: 实现 LoAF Runtime 适配**

仅在 `PerformanceObserver.supportedEntryTypes` 包含 `long-animation-frame` 时创建 observer；内部条目只提取 `duration` 和 `blockingDuration`，不存储脚本 URL 或归因对象。

- [ ] **Step 4: 将 LoAF 聚合绑定到采样窗口**

窗口完成时复制 LoAF 汇总进快照并清空下一窗口缓冲；停止或暂停时断开 observer，恢复运行时重新订阅。

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: `pnpm --filter @blog/monitoring test`

Expected: PASS，支持和不支持路径均覆盖。

- [ ] **Step 6: 提交**

```bash
git add packages/monitoring/src/performance
git commit -m "feat: observe long animation frames"
```

### Task 4: PerformancePanel 与录制协议迁移

**Files:**
- Modify: `apps/web/src/composables/use-performance-panel.ts`
- Modify: `apps/web/src/components/performance/PerformancePanel.vue`
- Modify: `apps/web/src/pages/PlaygroundAdvancedImagePage.vue`
- Modify: `apps/web/src/pages/PlaygroundRenderSchedulerPage.vue`

**Interfaces:**
- Consumes: Task 2/3 的 V2 `FramePerformanceSnapshot`
- Produces: `PerformancePanel` 显示 FPS、p95、最大间隔、目标预算和可选 LoAF；继续暴露 `startRecording(): void`

- [ ] **Step 1: 写面板迁移前的类型失败基线**

Run: `pnpm typecheck`

Expected: FAIL，错误指向旧 `snapshot.fps`、`snapshot.droppedFrames` 或录制结果类型。

- [ ] **Step 2: 迁移 composable 录制数据**

将录制结果从 `readonly number[]` 改成 `readonly FramePerformanceSnapshot[]`；录制每秒保存不可变快照；重复录制仍先清理旧 timer。

- [ ] **Step 3: 迁移面板字段和文案**

面板默认创建 `targetFps: 60` 的 monitor；实时区显示实际 FPS、p95、最大间隔、60 FPS 目标达成率/未达目标帧；LoAF 支持时显示次数和阻塞时长，不支持时不渲染该行。历史区每秒仍以 FPS 为主，并增加窗口未达目标帧汇总。

- [ ] **Step 4: 运行类型检查、lint 和 monitoring 测试**

Run: `pnpm typecheck && pnpm lint && pnpm --filter @blog/monitoring test`

Expected: 全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/composables/use-performance-panel.ts apps/web/src/components/performance/PerformancePanel.vue apps/web/src/pages/PlaygroundAdvancedImagePage.vue apps/web/src/pages/PlaygroundRenderSchedulerPage.vue
git commit -m "refactor: consume frame monitor v2 metrics"
```

### Task 5: 浏览器校准、稳定性测试与最终验证

**Files:**
- Create: `packages/monitoring/src/performance/frame-monitor.soak.test.ts`
- Modify: `apps/web/e2e/advanced-image-loader.spec.ts`
- Modify: `apps/web/e2e/render-scheduler.spec.ts`
- Modify: `docs/superpowers/specs/2026-09-27-frame-monitor-v2-design.md`

**Interfaces:**
- Consumes: 完整 V2 monitor 和面板
- Produces: 非默认 soak Gate、两个页面的浏览器回归和最终实现说明

- [ ] **Step 1: 写 soak 失败测试**

用 Fake Runtime 执行至少 100,000 次帧推进，并周期性执行订阅/取消、隐藏/恢复、reset 和 LoAF 注入；断言待执行 rAF 不超过 1、停止后快照不再变化、所有数值有限且内部窗口不会无限增长。

- [ ] **Step 2: 运行 soak 并检查资源上界**

Run: `pnpm --filter @blog/monitoring test:soak`

Expected: 若 rAF、observer 或数值不变量存在泄漏则 FAIL；只在 Fake Runtime 暴露待执行回调/observer 数量，不向生产公共 API 暴露内部数组。若现有实现首次即满足全部不变量，记录通过结果，不为了制造 RED 修改生产代码。

- [ ] **Step 3: 运行 soak 并确认 GREEN**

Run: `pnpm --filter @blog/monitoring test:soak`

Expected: PASS，无残留 rAF 或 observer。

- [ ] **Step 4: 增加浏览器趋势测试**

在两个现有页面断言面板输出非负 FPS；触发动画附加任务后断言最大间隔或未达目标指标相对基线上升；路由离开后动画节点清零；LoAF 仅在浏览器支持时断言存在，不把固定刷新率作为 Gate。

- [ ] **Step 5: 运行完整 Vite 侧验证**

Run:

```bash
pnpm --filter @blog/monitoring test
pnpm --filter @blog/monitoring test:coverage
pnpm --filter @blog/monitoring test:soak
pnpm test:e2e
pnpm typecheck
pnpm lint
pnpm build:vite
```

Expected: 全部退出码 0；覆盖率达到 statements/lines 95%、branches 90%、functions 100%；不执行 Webpack。

- [ ] **Step 6: 更新设计文档实现状态并提交**

记录最终 API、测试命令、浏览器降级行为和刷新率估算仍未进入 V2。

```bash
git add packages/monitoring/src/performance/frame-monitor.soak.test.ts apps/web/e2e/advanced-image-loader.spec.ts apps/web/e2e/render-scheduler.spec.ts docs/superpowers/specs/2026-09-27-frame-monitor-v2-design.md
git commit -m "test: harden frame monitor v2"
```

### Task 6: 全分支复核

**Files:**
- Review: `packages/monitoring/src/performance/`
- Review: `apps/web/src/composables/use-performance-panel.ts`
- Review: `apps/web/src/components/performance/PerformancePanel.vue`
- Review: `apps/web/e2e/`

**Interfaces:**
- Consumes: Task 1～5 的全部产物
- Produces: 可以交付的大型项目接入结论和残余风险清单

- [ ] **Step 1: 对照设计逐项复核指标语义**

确认实际 FPS、目标预算、p95、LoAF、页面可见性和错误隔离均有对应实现与测试。

- [ ] **Step 2: 检查公共 API 与依赖方向**

确认业务代码只从 `@blog/monitoring` 公共入口导入，Package 不依赖 Vue 或 `apps/web`。

- [ ] **Step 3: 复跑最终验证并检查干净工作区**

Run: Task 5 的完整命令集合，然后运行 `git status --short`。

Expected: 所有 Gate 通过，工作区仅包含计划内变更或完全干净。

- [ ] **Step 4: 提交复核中发现的必要修正**

```bash
git add <only-reviewed-files>
git commit -m "fix: finalize frame monitor v2"
```

若无需修正，不创建空提交。
