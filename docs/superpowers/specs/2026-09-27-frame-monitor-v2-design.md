# Frame Monitor V2 准确性与可测试性设计

## 背景

`@blog/monitoring` 当前通过 `requestAnimationFrame` 输出 `fps`、`maxFrameInterval` 和 `droppedFrames`。实现可以支持现有 Demo，但指标语义混合了采样窗口值与累计值，并默认用 60 FPS 预算解释“掉帧”。在 90Hz、120Hz、144Hz 等设备以及页面后台恢复、多订阅者和业务监听器异常场景下，这套协议不足以作为大型项目的稳定监控基础。

浏览器没有可靠的跨浏览器 API 返回显示器当前刷新率。因此 V2 不把推算刷新率作为准确性依据，而是区分：浏览器实际交付的帧节奏、项目显式配置的性能目标、浏览器提供的 Long Animation Frame 诊断数据。

## 目标

- FPS 按实际可见时间和 rAF 回调计算，不封顶，正确支持 60/90/120/144/165/240 FPS 输入。
- 用采样窗口内的帧间隔分布描述稳定性，第一版提供 p95 和最大帧间隔。
- 只有调用方显式提供 `targetFps` 时才计算目标预算指标。
- 支持时通过 Long Animation Frames API 统计严重卡顿次数和阻塞时长。
- 页面后台时间不进入 FPS、帧间隔或目标预算统计。
- 监控器可以注入确定性 Runtime，以毫秒级可重复测试核心算法。
- 监听器异常、重复启动停止和多订阅者不会破坏监控循环。

## 非目标

- 不声称能够读取设备或显示器的真实刷新率。
- 第一版不输出刷新率估算，也不基于估算刷新率判断掉帧或告警。
- 第一版不实现遥测上传、采样上报和数据存储。
- 不把 LoAF 当作所有卡顿的完整来源；不支持时仍提供 rAF 指标。
- 不执行或修改 Webpack 管线。

## 指标语义

V2 使用一个完整采样窗口作为快照范围。窗口默认 1000ms，仅累计页面可见期间的时间。

```ts
export interface FrameSampleMetrics {
  duration: number
  frameCount: number
  fps: number
  p95FrameInterval: number
  maxFrameInterval: number
}

export interface FrameTargetMetrics {
  fps: number
  frameBudget: number
  overBudgetFrames: number
  missedFrames: number
  achievementRate: number
}

export interface LongAnimationFrameMetrics {
  count: number
  totalBlockingDuration: number
  maxDuration: number
}

export interface FramePerformanceSnapshot {
  timestamp: number
  status: 'idle' | 'running' | 'suspended'
  sample: FrameSampleMetrics
  target: FrameTargetMetrics | null
  longAnimationFrames: LongAnimationFrameMetrics | null
}
```

### 实际帧节奏

- `fps = frameCount / sample.duration * 1000`，不按 `targetFps` 截断。
- `frameCount` 只统计采样窗口内实际收到的 rAF 回调。
- `p95FrameInterval` 对窗口内有效帧间隔升序排列并使用 nearest-rank 规则计算。
- `maxFrameInterval` 是当前窗口最大值，不再保留启动后的历史最大值。
- 时间戳重复或倒退的间隔被忽略，不产生负数、`NaN` 或 `Infinity`。

### 目标预算

`targetFps` 改为可选且无默认值。未配置时 `snapshot.target` 为 `null`，监控器不使用“掉帧”措辞。

配置目标后：

```ts
frameBudget = 1000 / targetFps
overBudgetFrames = interval > frameBudget 的间隔数量
missedFrames = Σ max(0, round(interval / frameBudget) - 1)
achievementRate = min(1, fps / targetFps)
```

`missedFrames` 是“相对业务目标估算的未交付帧”，不是设备级真实掉帧。

### Long Animation Frame

当 `PerformanceObserver.supportedEntryTypes` 包含 `long-animation-frame` 时，监控器同时观察当前采样窗口中的 LoAF：

- `count`：窗口内条目数；
- `totalBlockingDuration`：窗口内 `blockingDuration` 总和；
- `maxDuration`：窗口内最长 LoAF 的 `duration`。

不支持时 `longAnimationFrames` 为 `null`。停止监控或最后一个订阅者离开时必须断开 Observer。第一版不把脚本归因明细放入快照，避免高频对象和潜在敏感 URL 进入通用数据协议。

## Runtime 边界

核心算法不直接读取全局浏览器对象，而是依赖可注入 Runtime：

```ts
export interface FrameMonitorRuntime {
  now(): number
  requestFrame(callback: FrameRequestCallback): number
  cancelFrame(id: number): void
  getVisibilityState(): DocumentVisibilityState
  subscribeVisibilityChange(listener: () => void): () => void
  createLongAnimationFrameObserver(
    listener: (entry: LongAnimationFrameEntry) => void,
  ): LongAnimationFrameObserver | null
}
```

公共工厂默认使用浏览器 Runtime。Runtime 注入作为高级选项提供给测试和非标准宿主；业务页面不需要感知。

Fake Runtime 可以显式推进时间和帧：

```ts
runtime.advanceFrame(1000 / 120)
runtime.setVisibility('hidden')
runtime.emitLongAnimationFrame({ duration: 80, blockingDuration: 30 })
```

## 生命周期

- 第一个订阅者加入时自动启动；最后一个订阅者离开时停止。
- `start()`、`stop()`、取消订阅均保持幂等。
- 页面隐藏时状态变为 `suspended`，取消待执行 rAF，隐藏时间不计入采样。
- 页面重新可见时重置当前窗口的时间基线和帧间隔，再恢复为 `running`。
- `reset()` 清空当前快照与窗口数据，但保持调用前的运行或暂停状态。
- 每个监听器独立 `try/catch`；单个监听器抛错不影响其他监听器和后续 rAF。
- 可通过 `onListenerError` 接收监听器异常；默认不重新抛出。

## 测试设计

### 确定性单元测试

为 `@blog/monitoring` 增加独立测试命令，使用 Fake Runtime 覆盖：

- 60、90、120、144、165、240 FPS 稳定序列；
- 目标 FPS 低于、等于和高于实际 FPS；
- 单次及连续长帧；
- p95 nearest-rank 边界；
- 不完整窗口和跨窗口帧；
- 时间戳重复、倒退和极端长间隔；
- 页面隐藏、恢复和反复切换；
- 多订阅者、重复取消、重复 start/stop/reset；
- listener 抛错后的隔离和持续调度；
- LoAF 支持、不支持、窗口归零和 observer 清理；
- SSR 或浏览器 API 缺失时安全保持 idle。

所有精确数值由 Fake Runtime 测试保证，不依赖真实机器调度。

### 浏览器校准测试

Playwright 只验证浏览器集成与趋势，不断言机器必须达到固定刷新率：

- 页面可持续产生非负 FPS 和帧间隔；
- 注入 100ms 同步长任务后，最大帧间隔和目标未达指标上升；
- 支持 LoAF 的浏览器产生对应条目，不支持时返回 `null`；
- 路由切换和组件卸载后停止采集且无残留错误。

浏览器断言使用范围和相对变化，不能把 CI 的实际刷新节奏作为算法正确性的依据。

### 稳定性测试

增加非默认的 soak 命令，持续执行帧推进、订阅切换、暂停恢复和 LoAF 注入，验证：

- 同一监控器最多保留一个待执行 rAF；
- 停止后不再产生快照；
- listener 和 observer 最终归零；
- 指标不会出现负数、`NaN` 或 `Infinity`；
- 内部帧间隔数组按窗口释放，不随运行时间无限增长。

## PerformancePanel 迁移

面板第一版展示：

- 当前窗口 FPS；
- p95 帧间隔；
- 最大帧间隔；
- 配置目标后的目标达成率或未达目标帧；
- 支持时的 LoAF 次数和阻塞时长。

面板录制改为保存完整窗口快照，而不是只保存 FPS。现有压力模拟功能保持不变。

## 兼容与发布

当前 Package 为仓库内私有包，采用一次性 V2 迁移，不保留含义模糊的旧 `droppedFrames` 字段。所有调用方在同一变更中迁移。公共入口继续只从 `packages/monitoring/src/index.ts` 导出。

新增测试依赖必须使用精确版本，并在实施前由用户确认安装命令。未经确认不执行依赖安装。

## 验收标准

- Fake Runtime 下所有支持帧率序列的 FPS 误差不超过舍入规则允许范围。
- 未配置 `targetFps` 时不产生目标掉帧指标。
- 120 FPS 输入不会被截断或按 60 FPS 错误标记为不达标。
- 隐藏 30 秒后恢复不会产生跨后台时间的长帧或未达目标帧。
- listener 抛错后监控仍继续输出后续窗口。
- LoAF 不支持时安全降级，支持时按窗口准确累计并清理 Observer。
- `pnpm typecheck`、`pnpm lint`、`pnpm build:vite` 和新增的 monitoring 测试命令通过。
- 不运行 Webpack 管线。

## 后续演进

刷新率估算只有在实际业务需要解释多刷新率设备差异时再进入下一版。届时必须同时输出置信度，并保持它为诊断字段，不参与目标达成、告警或准确性验收。
