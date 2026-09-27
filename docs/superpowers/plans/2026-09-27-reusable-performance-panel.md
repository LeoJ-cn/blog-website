# Reusable Performance Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Moving Box 性能采集拆成通用帧监控能力和可供 `apps/web` 内多个 Demo 复用的 Vue 性能面板。

**Architecture:** `@blog/monitoring` 提供不依赖 Vue 的 `FramePerformanceMonitor`；`usePerformancePanel` 把监控器适配成响应式快照和录制状态；页面组合性能面板、图片 Demo 与只负责动画和 CPU 压力的 Moving Box Manager。Vue 面板第一版保留在 `apps/web`，不创建新 Package。

**Tech Stack:** Vue 3.5.13、TypeScript 5.6.3、pnpm Workspace、Vite 6.0.11

**Spec:** `docs/superpowers/specs/2026-09-27-reusable-performance-panel-design.md`

## Global Constraints

- 当前阶段不新增第三方依赖，不安装软件、CLI 或浏览器。
- `packages/monitoring` 必须保持 framework-agnostic，不依赖 Vue 或 `apps/web`。
- 公共能力只从 `packages/monitoring/src/index.ts` 导出，应用不得绕过公共入口。
- Vue 面板留在 `apps/web/src/components/performance/`，不加入 `packages/ui`，不创建 `@blog/monitoring-vue`。
- 保持现有面板视觉样式和主要交互，不做无关重构。
- 不新增、修改或生成任何测试代码；任务级验证使用现有类型检查和 Lint，最终验证使用 Vite 构建与手工检查。
- 禁止执行 `dev:webpack`、`build:webpack`、`analyze:webpack` 或包含 Webpack 构建的基准命令。
- 不处理与本功能无关的工作区修改；提交时只暂存当前任务的明确文件。

## File Map

- Create `packages/monitoring/src/performance/frame-monitor.types.ts`: 帧快照、监听器、选项和监控器接口。
- Create `packages/monitoring/src/performance/frame-monitor.ts`: RAF 生命周期、FPS、最大帧间隔和掉帧采集。
- Modify `packages/monitoring/src/index.ts`: 从公共入口导出帧监控工厂和类型。
- Modify `apps/web/src/components/advanced-image-loader/moving-box-manager.ts`: 删除性能采集和录制事件，增加最小 Demo 状态订阅。
- Create `apps/web/src/composables/use-performance-panel.ts`: Vue 响应式适配、固定时长录制和资源清理。
- Create `apps/web/src/components/performance/PerformancePanel.vue`: 通用展示组件，复用原有样式。
- Modify `apps/web/src/components/advanced-image-loader/AdvancedImageLoaderDemo.vue`: 用组件事件请求性能录制。
- Modify `apps/web/src/components/advanced-image-loader/NormalImageLoaderDemo.vue`: 用组件事件请求性能录制。
- Modify `apps/web/src/pages/PlaygroundAdvancedImagePage.vue`: 组合监控器、Manager、Composable 和面板。
- Delete `apps/web/src/components/advanced-image-loader/MovingBoxPerformancePanel.vue`: 删除已被通用面板替代的耦合组件。

## Review Focus

- 非浏览器环境导入 `@blog/monitoring` 时不得访问不存在的 RAF 或 `performance`；Task 1 用类型检查加实现审查固定保护分支。
- 多次 `start()` 或重复订阅不得创建并行 RAF 循环；Task 1 明确幂等状态机，并在最终手工检查中观察稳定更新。
- 最后一个订阅者取消后必须停止 RAF；Task 1 实现引用订阅生命周期，Task 5 确认页面卸载会触发清理。
- 录制过程中再次触发录制必须清理旧定时器并从零开始；Task 3 明确重启语义，最终手工检查重复触发。
- 不传 CPU 压力选项时不渲染控制区；Task 4 通过条件模板实现，最终用通用组件无压力参数场景检查。

---

### Task 1: 通用帧性能监控器

**Files:**
- Create: `packages/monitoring/src/performance/frame-monitor.types.ts`
- Create: `packages/monitoring/src/performance/frame-monitor.ts`
- Modify: `packages/monitoring/src/index.ts`

**Interfaces:**
- Consumes: 浏览器 `requestAnimationFrame`、`cancelAnimationFrame` 和 `performance.now()`；不可用时安全降级。
- Produces: `FramePerformanceSnapshot`、`FramePerformanceMonitorOptions`、`FramePerformanceListener`、`FramePerformanceMonitor`、`createFramePerformanceMonitor(options?)`。

- [ ] **Step 1: 定义帧监控公共类型**

在 `frame-monitor.types.ts` 定义：

```ts
export interface FramePerformanceSnapshot {
  fps: number
  maxFrameInterval: number
  droppedFrames: number
}

export interface FramePerformanceMonitorOptions {
  targetFps?: number
  sampleInterval?: number
}

export type FramePerformanceListener = (snapshot: FramePerformanceSnapshot) => void

export interface FramePerformanceMonitor {
  start(): void
  stop(): void
  reset(): void
  getSnapshot(): FramePerformanceSnapshot
  subscribe(listener: FramePerformanceListener): () => void
}
```

- [ ] **Step 2: 实现 `createFramePerformanceMonitor`**

在 `frame-monitor.ts` 导出：

```ts
export function createFramePerformanceMonitor(
  options: FramePerformanceMonitorOptions = {},
): FramePerformanceMonitor
```

使用 `targetFps = 60` 和 `sampleInterval = 500`。内部只维护一个 RAF ID；`start()` 幂等；`reset()` 将快照清零并重置采样起点；帧间隔按 `Math.round(frameInterval / frameBudget) - 1` 估算掉帧；最大帧间隔保留一位小数；每次采样向监听器发送不可变的新快照。浏览器 API 不可用时所有方法保持可调用并返回零值快照。

- [ ] **Step 3: 固定订阅生命周期**

`subscribe(listener)` 立即发送当前快照并启动监控，返回的取消函数具备幂等性；最后一个监听器移除时调用 `stop()`。显式 `stop()` 取消 RAF、清空帧时间并发送 FPS 为 `0`、累计值不丢失的新快照。

- [ ] **Step 4: 增加公共入口导出**

从 `packages/monitoring/src/index.ts` 导出 `createFramePerformanceMonitor` 以及 Task 1 的四个公共类型，保留全部现有导出不变。

- [ ] **Step 5: 运行现有类型检查**

Run: `pnpm typecheck`

Expected: exit code `0`，无 TypeScript 或 Vue 类型错误。

- [ ] **Step 6: 提交通用监控能力**

```bash
git add packages/monitoring/src/index.ts packages/monitoring/src/performance/frame-monitor.ts packages/monitoring/src/performance/frame-monitor.types.ts
git commit -m "feat: add frame performance monitor"
```

### Task 2: 精简 Moving Box Manager

**Files:**
- Modify: `apps/web/src/components/advanced-image-loader/moving-box-manager.ts`

**Interfaces:**
- Consumes: 无 Task 1 依赖；Manager 继续独立运行 Moving Box 动画和 CPU 压力任务。
- Produces: `MovingBoxDemoState`、`MovingBoxStateListener`、`getState()`、`subscribe(listener)`；旧性能 API 暂时保留到 Task 5 完成调用方迁移。

- [ ] **Step 1: 定义最小 Demo 状态协议**

新增：

```ts
export interface MovingBoxDemoState {
  cpuWorkMs: number
  runningBoxes: number
}

export type MovingBoxStateListener = (state: MovingBoxDemoState) => void
```

本任务暂不删除 `MovingBoxPerformanceSnapshot`、性能监听器和录制监听器类型，避免在调用方迁移前提交不可构建状态。

- [ ] **Step 2: 增加状态读取与订阅**

为 `MovingBoxManager` 增加：

```ts
getState(): MovingBoxDemoState
subscribe(listener: MovingBoxStateListener): () => void
```

订阅时立即发送当前不可变状态；取消订阅函数幂等。`create()`、成功的 `remove()`、`clear()` 和 `setCpuWorkMs()` 在状态变更完成后调用私有 `emitState()`。

- [ ] **Step 3: 保持旧性能行为兼容**

保留旧性能采集和录制 API，Task 2 只增加新的 Demo 状态出口。保留 CPU 压力范围 `0...64` 和档位 `CPU_PRESSURE_OPTIONS`。

- [ ] **Step 4: 运行现有类型检查**

Run: `pnpm typecheck`

Expected: exit code `0`，无 TypeScript 或 Vue 类型错误。

- [ ] **Step 5: 提交 Manager 边界变更**

```bash
git add apps/web/src/components/advanced-image-loader/moving-box-manager.ts
git commit -m "refactor: isolate moving box state"
```

### Task 3: Vue 性能面板状态适配

**Files:**
- Create: `apps/web/src/composables/use-performance-panel.ts`

**Interfaces:**
- Consumes: Task 1 的 `FramePerformanceMonitor` 和 `FramePerformanceSnapshot`。
- Produces: `usePerformancePanel(monitor, options?)`，返回实时快照、录制状态、倒计时、FPS 历史、录制掉帧数和 `startRecording()`。

- [ ] **Step 1: 定义 Composable 接口**

新增：

```ts
export interface UsePerformancePanelOptions {
  recordingDuration?: number
}

export function usePerformancePanel(
  monitor: FramePerformanceMonitor,
  options: UsePerformancePanelOptions = {},
): {
  snapshot: Readonly<Ref<FramePerformanceSnapshot>>
  recordedFps: Readonly<Ref<number[]>>
  recordedDroppedFrames: Readonly<Ref<number | null>>
  recording: Readonly<Ref<boolean>>
  recordingSecondsLeft: Readonly<Ref<number>>
  startRecording: () => void
}
```

默认录制时长为 `5` 秒，使用 `readonly()` 防止调用方绕过接口修改内部状态。

- [ ] **Step 2: 实现监控订阅和录制状态机**

订阅监控器并更新 `snapshot`。`startRecording()` 先清理旧定时器，再清空历史、记录起始掉帧数并每秒采一条当前 FPS；倒计时结束后写入历史和非负的掉帧差值。录制中再次调用必须重新开始完整录制。

- [ ] **Step 3: 实现卸载清理**

通过 `onUnmounted()` 调用取消订阅并清理录制定时器；清理后把内部定时器引用设回 `null`。

- [ ] **Step 4: 运行脚本 Lint**

Run: `pnpm lint`

Expected: exit code `0`，无新增 ESLint 错误。

- [ ] **Step 5: 提交 Vue 适配层**

```bash
git add apps/web/src/composables/use-performance-panel.ts
git commit -m "feat: add performance panel composable"
```

### Task 4: 通用 PerformancePanel 组件

**Files:**
- Create: `apps/web/src/components/performance/PerformancePanel.vue`
- Reference: `apps/web/src/components/advanced-image-loader/MovingBoxPerformancePanel.vue`

**Interfaces:**
- Consumes: Task 1 的 `FramePerformanceSnapshot` 和 Task 3 输出的录制状态；不导入 Manager 或 Composable。
- Produces: 通用 Props/Emits 展示接口。

- [ ] **Step 1: 定义组件 Props 和 Emits**

组件接收：

```ts
interface Props {
  snapshot: FramePerformanceSnapshot
  status?: 'running' | 'idle'
  recordingDuration?: number
  recordedFps?: readonly number[]
  recordedDroppedFrames?: number | null
  recording?: boolean
  recordingSecondsLeft?: number
  pressureOptions?: readonly number[]
  activePressure?: number
}
```

默认值：`status = 'idle'`、`recordingDuration = 5`、`recordedFps = []`、`recordedDroppedFrames = null`、`recording = false`、`recordingSecondsLeft = 0`、`pressureOptions = []`。组件发出 `record` 和 `change-pressure(duration: number)`。

- [ ] **Step 2: 迁移展示模板**

迁移原面板的 FPS 等级、录制按钮、历史条形图和掉帧结果。文案中的录制秒数使用 `recordingDuration`，运行状态仅由 `status` 决定；点击录制按钮发出 `record`，不在组件内部维护定时器。

- [ ] **Step 3: 迁移样式并让压力区可选**

原样迁移 scoped SCSS。仅当 `pressureOptions.length > 0` 时渲染压力区；当前档位使用 `activePressure`；点击档位发出 `change-pressure`。

- [ ] **Step 4: 运行现有 Lint**

Run: `pnpm lint`

Expected: exit code `0`，新组件无 ESLint 或 Stylelint 范围内的新增错误。

- [ ] **Step 5: 提交通用组件**

```bash
git add apps/web/src/components/performance/PerformancePanel.vue
git commit -m "feat: add reusable performance panel"
```

### Task 5: 页面组合与旧耦合清理

**Files:**
- Modify: `apps/web/src/components/advanced-image-loader/AdvancedImageLoaderDemo.vue`
- Modify: `apps/web/src/components/advanced-image-loader/NormalImageLoaderDemo.vue`
- Modify: `apps/web/src/pages/PlaygroundAdvancedImagePage.vue`
- Delete: `apps/web/src/components/advanced-image-loader/MovingBoxPerformancePanel.vue`

**Interfaces:**
- Consumes: Task 1 的 `createFramePerformanceMonitor`，Task 2 的 Manager 状态订阅，Task 3 的 `usePerformancePanel`，Task 4 的 `PerformancePanel`。
- Produces: 完整迁移后的高级图片加载页面；两个图片 Demo 发出 `performance-recording-request`。

- [ ] **Step 1: 将两个图片 Demo 改为显式事件**

在两个组件中分别定义：

```ts
const emit = defineEmits<{
  'performance-recording-request': []
}>()
```

删除 `movingBoxManager` 导入，并在 `rerender()` 中调用 `emit('performance-recording-request')`。其余图片加载逻辑不变。

- [ ] **Step 2: 在页面创建组合状态**

`PlaygroundAdvancedImagePage.vue`：

- 创建模块内单例 `framePerformanceMonitor = createFramePerformanceMonitor()`；
- 调用 `usePerformancePanel(framePerformanceMonitor)`；
- 用 `ref(movingBoxManager.getState())` 保存 Demo 状态；
- 订阅 Manager 状态，并在 `onUnmounted()` 取消订阅；
- 从 `@blog/monitoring` 公共入口导入，不导入包内文件。

- [ ] **Step 3: 接入通用面板**

用 `PerformancePanel` 替换旧组件，传入帧快照、录制状态、`CPU_PRESSURE_OPTIONS`、当前 CPU 压力和由 `runningBoxes > 0` 推导的状态；将 `record` 连接到 `startRecording`，将 `change-pressure` 连接到 `movingBoxManager.setCpuWorkMs`。

- [ ] **Step 4: 接入图片 Demo 录制请求**

在 `AdvancedImageLoaderDemo` 和 `NormalImageLoaderDemo` 的页面用法上监听 `performance-recording-request` 并调用 `startRecording()`，从而删除图片 Demo 对 Moving Box Manager 的反向依赖。

- [ ] **Step 5: 从 Manager 删除旧性能职责**

从 `moving-box-manager.ts` 移除帧预算、采样周期、性能字段、性能订阅、录制请求、性能快照方法和 `tick()` 内的帧测量。Moving Box 动画的启动条件只取决于是否存在 Box；清空最后一个 Box 后停止动画循环。保留 Task 2 的 Demo 状态订阅、CPU 压力范围 `0...64` 和 `CPU_PRESSURE_OPTIONS`。

- [ ] **Step 6: 删除旧面板**

删除 `MovingBoxPerformancePanel.vue`，再运行：

Run: `rg -n "MovingBoxPerformancePanel|requestPerformanceRecording|subscribePerformanceRecordingRequest|subscribePerformance|MovingBoxPerformanceSnapshot" apps packages`

Expected: 无匹配结果。

- [ ] **Step 7: 运行完整静态验证**

Run: `pnpm typecheck`

Expected: exit code `0`。

Run: `pnpm lint`

Expected: exit code `0`。

- [ ] **Step 8: 提交页面迁移**

```bash
git add apps/web/src/components/advanced-image-loader/AdvancedImageLoaderDemo.vue apps/web/src/components/advanced-image-loader/NormalImageLoaderDemo.vue apps/web/src/components/advanced-image-loader/MovingBoxPerformancePanel.vue apps/web/src/components/advanced-image-loader/moving-box-manager.ts apps/web/src/pages/PlaygroundAdvancedImagePage.vue
git commit -m "refactor: reuse performance panel across demos"
```

### Task 6: Vite 构建与手工验收

**Files:**
- Modify: 仅限 Task 1—5 中因验证暴露的问题所对应的文件。

**Interfaces:**
- Consumes: Task 1—5 的完整集成。
- Produces: Vite 构建通过且主要交互经手工确认的实现。

- [ ] **Step 1: 执行 Vite 生产构建**

Run: `pnpm build:vite`

Expected: exit code `0`，生成 Vite 生产产物；不执行 Webpack 构建。

- [ ] **Step 2: 启动现有 Vite 开发服务进行手工检查**

Run: `pnpm dev:vite`

Expected: 开发服务器启动成功且页面可访问；该命令只使用现有依赖，不安装任何内容。

- [ ] **Step 3: 检查现有交互**

依次确认：增加/清空 Box 会切换 `RUNNING/IDLE`；FPS 持续更新；手工点击记录和两种图片模式的重新加载都能开始完整 5 秒录制；录制中再次触发会重新开始；CPU 档位切换生效；离开页面后无残留 Box、RAF 或录制定时器。

- [ ] **Step 4: 检查通用无压力分支**

审查 `PerformancePanel.vue` 的条件模板，确认压力区只由 `pressureOptions.length > 0` 渲染，且实时指标和录制区域位于该条件之外。由于仓库禁止为本请求新增测试代码，本次不为该可选分支创建测试组件或测试夹具。

- [ ] **Step 5: 最终验证**

Run: `pnpm typecheck && pnpm lint && pnpm build:vite`

Expected: 三个命令全部 exit code `0`；没有执行任何 Webpack 命令。

- [ ] **Step 6: 提交验证修正（仅在有修正时）**

用 `git status --short` 确认变更范围，只暂存验证过程中实际修正的 Task 1—5 文件。下列命令列出全部允许暂存的候选路径；没有发生变化的路径不会进入提交：

```bash
git add packages/monitoring/src/index.ts packages/monitoring/src/performance/frame-monitor.ts packages/monitoring/src/performance/frame-monitor.types.ts apps/web/src/composables/use-performance-panel.ts apps/web/src/components/performance/PerformancePanel.vue apps/web/src/components/advanced-image-loader/AdvancedImageLoaderDemo.vue apps/web/src/components/advanced-image-loader/NormalImageLoaderDemo.vue apps/web/src/components/advanced-image-loader/moving-box-manager.ts apps/web/src/pages/PlaygroundAdvancedImagePage.vue
git commit -m "fix: finalize reusable performance panel"
```
