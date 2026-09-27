# 可复用性能面板拆分设计

## 背景

高级图片加载 Demo 当前通过 `moving-box-manager.ts` 同时管理 Moving Box 动画、CPU 压力模拟、帧性能采集和面板录制事件。`MovingBoxPerformancePanel.vue` 又直接依赖该 Manager，导致性能面板无法被其他 Demo 直接复用。

本次只完成第一版小范围拆分：在现有 `apps/web` 内复用 Vue 性能面板，并把框架无关的帧性能采集能力加入已有的 `@blog/monitoring`。本次不创建新的 Workspace Package。

## 目标

- 其他 Demo 可以复用同一个性能面板，不依赖 Moving Box 业务。
- FPS、最大帧间隔和累计掉帧采集由 `@blog/monitoring` 提供。
- Moving Box Manager 只管理动画对象和 CPU 压力模拟。
- 页面作为组合层，显式连接 Demo 状态、性能监控和面板操作。
- 保持现有面板的视觉样式和主要交互。

## 非目标

- 不创建 `@blog/monitoring-vue`。
- 不把性能面板加入 `packages/ui`。
- 不引入 Pinia、事件总线或新的第三方依赖。
- 不重新设计面板视觉样式。
- 不新增或修改测试代码。
- 不调整 Webpack 5 管线，也不执行 Webpack 构建。

## 目录设计

```text
packages/monitoring/src/
├── index.ts
├── types.ts
└── performance/
    ├── collector.ts
    ├── frame-monitor.ts
    └── frame-monitor.types.ts

apps/web/src/
├── composables/
│   └── use-performance-panel.ts
├── components/
│   ├── performance/
│   │   └── PerformancePanel.vue
│   └── advanced-image-loader/
│       ├── AdvancedImageLoaderDemo.vue
│       ├── NormalImageLoaderDemo.vue
│       └── moving-box-manager.ts
└── pages/
    └── PlaygroundAdvancedImagePage.vue
```

现有 `MovingBoxPerformancePanel.vue` 在调用方迁移完成后删除。

## 架构边界

### `@blog/monitoring`

新增的帧监控模块保持 framework-agnostic，不依赖 Vue 或应用代码。它负责：

- 使用 `requestAnimationFrame` 采集帧数据；
- 按配置的采样周期计算 FPS；
- 记录最大帧间隔；
- 根据目标帧预算估算累计掉帧数；
- 提供启动、停止、重置、读取快照和订阅能力；
- 最后一个订阅者移除后停止内部动画帧循环。

公共入口只通过 `packages/monitoring/src/index.ts` 暴露，业务代码不得导入包内路径。

建议的公共协议：

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

export interface FramePerformanceMonitor {
  start(): void
  stop(): void
  reset(): void
  getSnapshot(): FramePerformanceSnapshot
  subscribe(listener: FramePerformanceListener): () => void
}

export function createFramePerformanceMonitor(
  options?: FramePerformanceMonitorOptions,
): FramePerformanceMonitor
```

默认目标帧率为 60 FPS，默认采样周期为 500ms，与当前实现保持一致。

### `PerformancePanel.vue`

性能面板是 `apps/web` 内的通用展示组件。它不导入具体 Demo Manager，也不直接创建帧监控器。

输入包括：

- 当前帧性能快照；
- `running` 或 `idle` 状态；
- 可选的录制时长，默认 5 秒；
- 可选的 CPU 压力档位和当前档位。

输出包括：

- 用户请求开始录制；
- 用户选择新的 CPU 压力档位。

没有提供 CPU 压力档位时，面板不渲染压力控制区域。因此其他不包含压力模拟的 Demo 也能直接使用它。

### `use-performance-panel.ts`

Composable 负责 Vue 状态和生命周期适配：

- 订阅传入的 `FramePerformanceMonitor`；
- 暴露响应式性能快照；
- 管理固定时长的 FPS 历史采集；
- 计算录制期间新增的掉帧数；
- 暴露 `startRecording()`；
- 卸载时取消订阅并清理定时器。

录制逻辑不放入 `@blog/monitoring`，因为它属于当前面板的展示交互，而不是底层采集协议。

### `moving-box-manager.ts`

Manager 保留：

- Moving Box 的创建、读取、删除和清空；
- 动画位置更新；
- CPU 压力任务调度；
- 当前 Box 数量和 CPU 压力值。

Manager 移除：

- FPS 和掉帧计算；
- 帧监控订阅；
- 面板录制请求及其订阅；
- 与性能面板生命周期相关的状态。

为了让页面响应 Box 数量和 CPU 压力变化，Manager 提供最小的 Demo 状态订阅协议。该协议仍留在 Feature 内，不进入公共 Package。

## 数据流

`PlaygroundAdvancedImagePage.vue` 是组合层：

1. 创建或引用帧性能监控器。
2. 使用 `usePerformancePanel()` 获得实时快照和录制状态。
3. 订阅 Moving Box Manager 的 Demo 状态。
4. 将两类状态作为 Props 传给 `PerformancePanel.vue`。
5. 将面板的压力切换事件转发给 Moving Box Manager。
6. 将图片加载 Demo 的“开始记录”动作连接到 `startRecording()`。

依赖方向保持为：

```text
PlaygroundAdvancedImagePage
├── PerformancePanel
├── usePerformancePanel
│   └── @blog/monitoring
└── movingBoxManager
```

公共 Package 不依赖 `apps/web`，帧监控器不依赖 Vue。

## 生命周期和异常处理

- 帧监控器重复 `start()` 不创建多个 RAF 循环。
- `stop()` 和最后一次取消订阅都应安全停止 RAF。
- 重复开始录制时，先清理上一轮定时器并重新开始。
- 组件卸载时必须清理订阅与录制定时器。
- 浏览器 API 不可用时，监控器保持零值快照且不抛出异常，以避免影响非浏览器环境的模块加载。
- CPU 压力值继续由 Moving Box Manager 限制在当前安全范围内。

## 迁移顺序

1. 在 `@blog/monitoring` 增加帧监控协议和实现，并从公共入口导出。
2. 新增 `use-performance-panel.ts`。
3. 将旧面板迁移为通用 `PerformancePanel.vue`，保持现有样式。
4. 精简 Moving Box Manager，并增加最小 Demo 状态订阅。
5. 在 `PlaygroundAdvancedImagePage.vue` 完成组合和事件连接。
6. 修改两个图片加载 Demo 的录制触发方式。
7. 删除 `MovingBoxPerformancePanel.vue`。

每一步都保持应用到公共 Package 的单向依赖。

## 验证

不新增或修改测试代码。完成实现后运行仓库已有的 Vite 侧验证：

```bash
pnpm typecheck
pnpm lint
pnpm build:vite
```

同时进行手工检查：

- 增加和清空 Moving Box 后，面板状态正确变化；
- FPS 和掉帧数据持续更新；
- 5 秒录制可以完成并显示历史值；
- 重复触发录制不会残留多个定时器；
- CPU 压力切换仍然生效；
- 不提供压力选项时，通用面板不显示压力控制区域。

不执行 `dev:webpack`、`build:webpack`、`analyze:webpack` 或包含 Webpack 构建的基准命令。

## 后续演进条件

只有当至少两个使用方验证了稳定的 Props、事件和样式需求，并且组件需要被 `apps/web` 之外的应用复用时，才考虑创建 `@blog/monitoring-vue`。监控领域组件不进入泛化的 `packages/ui`。
