# React → Vue 渐进迁移演示设计

## 背景与目标

在现有 pnpm Monorepo 中新增 `packages/react-vue-migration-demo`，由 `apps/web` 的 Engineering Playground 页面消费。该 Package 需要在 Vue Blog 中启动真实的 React Shell，再由 React Shell 通过临时迁移桥接加载 Vue 业务组件，以可交互方式展示 React → Vue 渐进迁移的完整闭环。

本设计只覆盖迁移 Demo 与 Blog 集成，不创建新的 `apps/*` 应用，不修改 Webpack 管线，也不把迁移实现散落到 `apps/web`。

## 关键约束

- `apps/web` 只依赖 `@blog/react-vue-migration-demo` 的公开 Vue 组件。
- React、React DOM、React Router、mitt 及 React 类型依赖只声明在 Demo Package 内；根 `package.json` 不新增依赖或脚本。
- `apps/web/package.json` 只新增 `@blog/react-vue-migration-demo: "workspace:*"`。
- Package 采用 Workspace 源码直编译，与现有内部 Package 保持一致，不单独生成 `dist`。
- Vite 内置 esbuild 负责编译 React `.tsx`，现有 Vue 插件负责编译 Package 内的 `.vue`。
- Vue 使用与宿主一致的精确版本 `3.5.13`，作为 Package 的 peer dependency，并由宿主 Vite 去重，避免重复 Vue Runtime。
- React Shell 使用 `MemoryRouter`，不得与 Blog 的 Vue Router 竞争顶层 History。
- 默认只验证 Vite 管线，不执行 Webpack 构建。

## 总体架构

```text
apps/web
  └─ /playground/engineering/react-vue-migration
       └─ ReactVueMigrationDemo
            │
            ▼
packages/react-vue-migration-demo
  └─ VueMigrationDemo.vue             # Demo Hosting Adapter
       └─ ReactDOM.createRoot()
            └─ ReactMigrationDemo      # Legacy React Shell
                 ├─ ReactOrder         # Legacy 实现
                 └─ ReactLoadVueOrder  # 临时迁移桥接
                      └─ bootstrap
                           └─ VueOrder  # 迁移后的业务实现
```

建议目录：

```text
packages/react-vue-migration-demo/
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── VueMigrationDemo.vue
    ├── legacy-react/
    │   └── ReactOrder.tsx
    ├── migrated-vue/
    │   └── order/
    │       ├── VueOrder.vue
    │       ├── VueOrderHost.vue
    │       ├── bootstrap.ts
    │       └── contract.ts
    ├── migration/
    │   ├── ReactLoadVueOrder.tsx
    │   ├── platform.ts
    │   └── react-platform.ts
    ├── shared/
    │   ├── api.ts
    │   ├── event-bus.ts
    │   ├── migration-log.ts
    │   └── utils.ts
    └── demo/
        ├── mount-react-migration-demo.tsx
        ├── ReactMigrationDemo.tsx
        └── ReactMigrationDemo.css
```

`src/index.ts` 只导出 `ReactVueMigrationDemo`。React 组件、bootstrap、Platform 和内部 Contract 均不属于公共 API。

## 构建与依赖策略

`apps/web` 执行 `vite build` 时沿 Workspace 依赖图读取 Package 源码：

```text
apps/web Vite
├─ @vitejs/plugin-vue → VueMigrationDemo.vue、VueOrder.vue
├─ Vite esbuild       → React TSX
└─ Rollup             → 最终 Blog Chunks
```

React TSX 文件显式导入 React，避免依赖 `apps/web` 面向 Vue JSX 的 `jsxImportSource`。Package 自己的 `tsconfig.json` 使用 `jsx: react-jsx`，独立承担 React 类型检查。

Package 依赖采用精确版本。实现计划开始前，以当前 registry 稳定版本和现有锁文件兼容性确定最终版本；计划基线为 React 与 React DOM 同版本、React Router 7、mitt 3，以及与 React Runtime 同主版本的类型包。不得使用 `^`、`~`、`*` 或 `latest`。

Engineering 页面通过 Vue Router 懒加载，因此 React Shell、React Router、Bridge 和 VueOrder 不进入首页首屏执行路径。生产构建后检查 manifest 与 Chunk 内容，确认 React 相关代码的归属，并确认 Vue Runtime 只有一份。

## Vue Hosting Adapter

`VueMigrationDemo.vue` 只负责：

1. 创建 Demo DOM Container。
2. `onMounted` 时调用 `mountReactMigrationDemo(container)`。
3. `onBeforeUnmount` 时调用返回的 disposer。
4. 在容器缺失或启动失败时呈现可见错误状态。

React Root 创建逻辑位于 `.tsx` 文件，Adapter 不包含迁移业务、路由、Platform 或事件转发逻辑。

## React Shell 与 Feature Flag

`ReactMigrationDemo.tsx` 使用 `MemoryRouter`，默认路由为 `/orders/10001`，并提供 `/orders/10001` 与 `/orders/10002` 两个场景。页面包含：

- `React Legacy` 与 `Vue Migrated` 实现切换。
- Route 10001 与 10002 切换。
- 当前业务组件展示区。
- React 收到的组件事件与 EventBus 消息。
- 可视化 Migration Log。

选择 `React Legacy` 时渲染 `ReactOrder`；选择 `Vue Migrated` 时渲染 `ReactLoadVueOrder`。由 Vue 切回 React 必须触发 Bridge 与 Vue App 的完整卸载。

## 生命周期协议

`bootstrap.ts` 提供 Package 内部生命周期协议：

```ts
interface MountOptions {
  container: HTMLElement
  props: OrderModuleProps
  platform: MigrationPlatform
  events: OrderModuleEvents
}

interface ModuleInstance {
  update(props: Partial<OrderModuleProps>): void
  unmount(): void
}
```

- `mount()` 只调用一次 `createApp()`，以 `reactiveProps` 作为 Host 输入。
- `update()` 使用 `Object.assign()` 更新已有响应式 Props，不重新创建 Vue App。
- `unmount()` 清理 Vue App、EventBus Listener 和其他副作用，并具备重复调用保护。
- 已卸载实例收到 `update()` 时不得静默创建新实例，应记录明确的生命周期错误。

`ReactLoadVueOrder.tsx` 只把 React 的 mount、props update 和 unmount 映射到该协议，不包含订单业务逻辑。

## 通信边界

### Route Params → Props

React Router 的 `useParams()` 读取 `orderId`，经 `ReactLoadVueOrder` 和 `bootstrap.update()` 传给 Vue，替代 Vue 组件直接读取 `$route.params`。该能力不进入 Platform。

### Component Events

`VueOrder` 声明 `success` 与 `close` 事件。`VueOrderHost` 接收事件后，经 bootstrap callbacks 和 Bridge 转发给 React Parent。该能力属于父子组件 Contract，不进入 Platform。

### Migration Platform

Platform 明确定义在 `migration/platform.ts`：

```ts
interface MigrationPlatform {
  router: {
    push(path: string): void
    replace(path: string): void
    back(): void
  }
}
```

`react-platform.ts` 使用 React Router `navigate()` 实现协议。完整闭环为：

```text
VueOrder
→ platform.router.push('/orders/10002')
→ React Platform
→ React Router navigate()
→ useParams()
→ ReactLoadVueOrder props
→ bootstrap.update()
→ VueOrder props update
```

Platform 只承载必须由 React Shell 提供的顶层路由能力，禁止加入 API、EventBus、utils 或组件事件。

### Framework-independent Modules

- `shared/api.ts`：Vue 直接调用 `getOrder(orderId)`，不经过 Platform。
- `shared/utils.ts`：React 与 Vue 直接调用 `formatOrderId()`。
- `shared/event-bus.ts`：React 与 Vue 直接使用同一 mitt 实例，实现双向事件并在生命周期结束时清理 Listener。

## Vue 业务组件

`VueOrder.vue` 接收：

```ts
interface OrderModuleProps {
  orderId: string
  readonly: boolean
}
```

组件具备以下真实行为：

- 监听 `orderId` 变化并重新获取订单数据，同时记录 Props 变化日志。
- 保存独立的 `count` 状态，证明 Vue 内部状态不经过 React。
- 触发 `success` 与 `close` 组件事件。
- 通过 Platform 执行 push、replace 和 back。
- 向 React 发送 EventBus 消息，并接收 React EventBus 消息。
- 直接使用 `getOrder()` 和 `formatOrderId()`。
- 路由快速切换时忽略过期 API 结果，防止旧响应覆盖新订单。

## Migration Log

`shared/migration-log.ts` 提供框架无关的可订阅日志存储。React Shell、Bridge、Vue Host、VueOrder 和 React Platform 记录结构化事件，React 页面渲染日志列表。

至少呈现以下语义：React render、Bridge mount/update/unmount、Vue mounted/props changed/unmounted、Vue event、Bridge event forwarding、React event received、Vue platform call、React Platform navigation，以及双向 EventBus 消息。

日志存储提供清空能力，并在 Demo Root 卸载时释放订阅，避免重复进入页面后产生 Listener 泄漏。

## apps/web 集成

新增 `Engineering` 分类与项目元数据，并增加路由：

```text
/playground/engineering/react-vue-migration
```

页面只导入：

```ts
import { ReactVueMigrationDemo } from '@blog/react-vue-migration-demo'
```

`apps/web` 不导入 React、React DOM、React Router、Bridge、bootstrap 或 Platform。页面沿用现有 Playground 标题和内容区域风格；子包 CSS 使用独立前缀，避免泄漏到 Blog 其他页面。

## 错误处理与清理

- Hosting Adapter 容器缺失或 React Root 启动失败时显示可见错误。
- bootstrap 对重复 mount、重复 unmount 和 unmount 后 update 采用幂等清理或明确保护。
- API 暴露加载、成功和失败状态，并忽略过期请求结果。
- EventBus 订阅使用成对的注册与注销，切换实现及离开页面时都必须清理。
- 清理过程不依赖业务事件成功执行；单个回调异常不得阻止 Vue App 和 Listener 回收。

## 代码分类与最终迁移删除边界

### Legacy Code

- `legacy-react/ReactOrder.tsx`

### Migration Temporary Code

- `migration/ReactLoadVueOrder.tsx`
- `migration/platform.ts`
- `migration/react-platform.ts`
- `migrated-vue/order/bootstrap.ts`
- `migrated-vue/order/VueOrderHost.vue`

### Permanent Business Code

- `migrated-vue/order/VueOrder.vue`
- `migrated-vue/order/contract.ts`
- `shared/api.ts`
- `shared/utils.ts`
- 业务确实仍需使用时的 `shared/event-bus.ts`

### Demo Hosting Adapter

- `VueMigrationDemo.vue`
- `demo/mount-react-migration-demo.tsx`
- `demo/ReactMigrationDemo.tsx`
- `demo/ReactMigrationDemo.css`
- `shared/migration-log.ts`

React 完全迁移完成后，生产系统删除 Legacy Code 与 Migration Temporary Code。当前 Blog Demo 仍保留 Hosting Adapter 和演示 Shell，用于展示迁移过程。

## 测试与验证

在现有测试基础设施上补充最小测试，不另建重复测试体系。自动化测试重点覆盖：

- bootstrap 首次 mount、Props update 不重新 mount、unmount 与重复清理。
- EventBus Listener 注册和注销。
- Migration Platform 到 React navigate adapter 的调用映射。
- 日志顺序中关键生命周期事件的存在性。

页面交互验证由用户手动执行。实现完成后提供 12 个场景的具体操作、预期 UI 与预期 Migration Log，包括加载、Legacy/Vue 切换、Route Props 更新、组件事件、Platform 路由、双向 EventBus、API、utils、卸载和重复切换。

在执行非页面自动化测试、typecheck、lint 或 Vite build 前，按照仓库规则征求用户确认。禁止自动启动页面测试或操作浏览器。

## README 内容

README 需要说明：

- 外层 Blog Vue 与内层 Legacy React Shell 是两层不同环境。
- Demo 使用 `MemoryRouter` 只是为了隔离宿主 History；真实迁移项目通常由 React Shell 持有 Browser History。
- Legacy、Migration Temporary、Permanent 和 Demo Hosting Adapter 的代码分类。
- 依赖判断决策树：能否脱离原 Framework 运行；是否属于组件边界通信；是否必须依赖 React Shell。
- `$route.params`、`$emit`、`$router`、API、utils 与 EventBus 分别采用何种通道及原因。
- 最终迁移完成后的删除清单。

## 完成标准

1. `apps/web` 能通过一个公开组件加载 Package。
2. React Legacy 能正常显示。
3. Feature Flag 能挂载 Vue Migrated 实现。
4. Route 10001 → 10002 经 React Router、Props、bootstrap.update 更新 Vue，且不重新 mount。
5. Vue `success`/`close` 事件能转发至 React。
6. Vue Platform 路由调用能驱动 React Router 并回流为 Props 更新。
7. Vue EventBus 消息能被 React 接收。
8. React EventBus 消息能被 Vue 接收。
9. Vue 能直接调用 shared API。
10. Vue 与 React 能直接调用 shared utils。
11. Vue → React Legacy 会卸载 Vue App。
12. 重复切换不产生重复 Listener、重复 Vue App 或明显泄漏。
13. Vite typecheck、lint 和 build 在获准执行后通过。
14. 构建产物确认 Vue Runtime 单实例，并记录 React/Vue 相关 Chunk 情况。
