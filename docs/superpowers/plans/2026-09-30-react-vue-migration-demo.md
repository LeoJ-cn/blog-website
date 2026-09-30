# React → Vue 渐进迁移演示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Vue Blog 的 Engineering Playground 中交付一个独立 Package，以真实 React Shell 加载 Vue 订单组件并演示完整的渐进迁移通信与回滚闭环。

**Architecture:** `apps/web` 仅懒加载 Package 导出的 `ReactVueMigrationDemo`；Package 的 Vue Hosting Adapter 创建 React Root，React Shell 再通过 bootstrap 生命周期协议挂载 VueOrder。Route Params 走 Props、组件事件走 Contract、`$router` 走 Migration Platform，API、utils 与 mitt EventBus 保持框架无关。

**Tech Stack:** Vue 3.5.13、React 19.3.0、React DOM 19.3.0、React Router DOM 7.14.0、mitt 3.0.1、TypeScript 5.6.3、Vite 6.0.11、Vitest 2.1.8、jsdom 30.1.1

**Spec:** `docs/superpowers/specs/2026-09-30-react-vue-migration-demo-design.md`

## Global Constraints

- 不创建新的 `apps/*` 应用；新增 Package 固定为 `packages/react-vue-migration-demo`。
- 根 `package.json` 不新增依赖或脚本；第三方运行时、类型与测试依赖全部声明在 Demo Package。
- `apps/web/package.json` 只新增 `@blog/react-vue-migration-demo: "workspace:*"`。
- 所有依赖使用精确版本，禁止 `^`、`~`、`*` 和 `latest`。
- Package 采用 Workspace 源码直编译；React TSX 由 Vite 内置 esbuild 编译，不新增 React Vite 插件。
- Vue 必须同时声明为精确版本 `3.5.13` 的 peer dependency 与 dev dependency，生产构建复用宿主 Vue Runtime。
- React Shell 使用 `MemoryRouter`，不得读写 Blog 的顶层 History。
- 默认只执行 Vite 管线；禁止执行 Webpack 构建、分析或基准命令。
- 页面测试、交互调试和浏览器操作由用户手动完成；Agent 不启动 dev server 或代替用户操作页面。
- 在运行非页面测试、typecheck、lint 或 build 前再次征求用户确认。
- 新增复杂生命周期、协议成员、边界条件和兼容性处理时添加简体中文注释，解释原因与约束。

## Review Focus

- Route 在 API 请求未完成前从 10001 快速切到 10002：旧响应必须被忽略；Task 2 的 API 状态测试固定该行为。
- `ModuleInstance.unmount()` 被重复调用或 unmount 后收到 update：不得重复卸载或重新创建 App；Task 2 的生命周期测试固定该行为。
- React Strict Mode 风格的 effect setup/cleanup 重入：每次有效 mount 只能对应一个 Vue App 与一组 Listener；Task 3 的 Bridge 测试固定该行为。
- EventBus 在 React/Vue 实现切换后仍有旧 Listener：卸载后旧订阅不得收到消息；Task 1 与 Task 2 的订阅测试固定该行为。
- Vue 通过 Platform 导航到当前路径或未知订单路径：React Router 保持可用，当前订单不发生无意义重新 mount；Task 3 的 Platform 测试与 Task 4 的手工验收固定该行为。

---

## File Map

### 新增 Package

- `packages/react-vue-migration-demo/AGENTS.md`：Package 边界与专题文档路由。
- `packages/react-vue-migration-demo/package.json`：Package 公共入口、精确依赖和验证脚本。
- `packages/react-vue-migration-demo/tsconfig.json`：React JSX 与 Vue 源码类型检查范围。
- `packages/react-vue-migration-demo/vitest.config.ts`：复用现有 Vitest 版本的 jsdom 单元测试配置。
- `packages/react-vue-migration-demo/README.md`：迁移判断原则、代码分类和删除边界。
- `packages/react-vue-migration-demo/src/index.ts`：唯一公共导出。
- `packages/react-vue-migration-demo/src/VueMigrationDemo.vue`：Vue Blog 到 React Root 的 Hosting Adapter。
- `packages/react-vue-migration-demo/src/demo/mount-react-migration-demo.tsx`：React Root 创建与 disposer。
- `packages/react-vue-migration-demo/src/demo/ReactMigrationDemo.tsx`：React Shell、MemoryRouter、Feature Flag 和日志面板。
- `packages/react-vue-migration-demo/src/demo/ReactMigrationDemo.css`：隔离前缀的 Demo 样式。
- `packages/react-vue-migration-demo/src/legacy-react/ReactOrder.tsx`：Legacy React 订单组件。
- `packages/react-vue-migration-demo/src/migrated-vue/order/contract.ts`：Props、Events 与 ModuleInstance 协议。
- `packages/react-vue-migration-demo/src/migrated-vue/order/VueOrder.vue`：迁移后的 Vue 业务组件。
- `packages/react-vue-migration-demo/src/migrated-vue/order/VueOrderHost.vue`：响应式 Props 和事件转发 Host。
- `packages/react-vue-migration-demo/src/migrated-vue/order/bootstrap.ts`：Vue App mount/update/unmount。
- `packages/react-vue-migration-demo/src/migration/platform.ts`：Migration Platform 协议。
- `packages/react-vue-migration-demo/src/migration/react-platform.ts`：React Router adapter。
- `packages/react-vue-migration-demo/src/migration/ReactLoadVueOrder.tsx`：React 生命周期到 Vue bootstrap 的临时 Bridge。
- `packages/react-vue-migration-demo/src/shared/api.ts`：订单模拟 API。
- `packages/react-vue-migration-demo/src/shared/event-bus.ts`：跨框架 mitt 实例与事件类型。
- `packages/react-vue-migration-demo/src/shared/migration-log.ts`：框架无关可订阅日志存储。
- `packages/react-vue-migration-demo/src/shared/utils.ts`：订单编号格式化。
- `packages/react-vue-migration-demo/src/**/*.test.ts`：生命周期、Platform、日志和共享能力测试。

### 修改 Blog

- `apps/web/package.json`：增加唯一 Workspace 依赖。
- `apps/web/src/types/project.ts`：增加 `engineering` 分类。
- `apps/web/src/data/projects.ts`：增加 Engineering 元数据和迁移 Demo 项目。
- `apps/web/src/pages/PlaygroundPage.vue`：生成 Engineering 项目路径。
- `apps/web/src/pages/PlaygroundReactVueMigrationPage.vue`：懒加载 Package 公开组件的展示页。
- `apps/web/src/app/router/index.ts`：增加 Engineering 分类重定向和 Demo 路由。
- `apps/web/build/vite/common.ts`：仅在实际构建发现重复 Vue 时调整 `dedupe`/Chunk；不得为 React 增加插件。

### 更新工作区状态

- `pnpm-lock.yaml`：记录子包精确依赖和 Workspace 链接。

---

### Task 1: Package 契约、依赖与框架无关基础能力

**Files:**
- Create: `packages/react-vue-migration-demo/AGENTS.md`
- Create: `packages/react-vue-migration-demo/package.json`
- Create: `packages/react-vue-migration-demo/tsconfig.json`
- Create: `packages/react-vue-migration-demo/vitest.config.ts`
- Create: `packages/react-vue-migration-demo/src/index.ts`
- Create: `packages/react-vue-migration-demo/src/shared/api.ts`
- Create: `packages/react-vue-migration-demo/src/shared/event-bus.ts`
- Create: `packages/react-vue-migration-demo/src/shared/migration-log.ts`
- Create: `packages/react-vue-migration-demo/src/shared/utils.ts`
- Create: `packages/react-vue-migration-demo/src/shared/shared.test.ts`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: 根 `tsconfig.json`；现有 Package 的源码入口约定。
- Produces: `eventBus: Emitter<MigrationEventMap>`；`getOrder(orderId: string, signal?: AbortSignal): Promise<Order>`；`formatOrderId(id: string): string`；`migrationLog.append(entry)`、`subscribe(listener)`、`clear()`、`getSnapshot()`。

- [ ] **Step 1: 创建 Package 清单与独立工具配置**

`package.json` 使用 `@blog/react-vue-migration-demo`、`private: true`、`main/types: ./src/index.ts`，并声明：

- dependencies：`mitt@3.0.1`、`react@19.3.0`、`react-dom@19.3.0`、`react-router-dom@7.14.0`。
- peerDependencies 与 devDependencies：`vue@3.5.13`。
- devDependencies：`@types/react@19.3.0`、`@types/react-dom@19.3.0`、`vitest@2.1.8`、`jsdom@30.1.1`。
- scripts：`typecheck` 与 `test`，均只作用于本 Package。

`tsconfig.json` 继承根配置，设置 `jsx: react-jsx`，包含 `.ts`、`.tsx`、`.vue` 和声明文件；`vitest.config.ts` 使用 jsdom。

- [ ] **Step 2: 请求依赖安装授权**

展示并等待用户批准：

```bash
pnpm install
```

未获批准前不得执行；安装后确认只有子包与 `apps/web` manifest、根锁文件发生预期变化，根 `package.json` 不变。

- [ ] **Step 3: 编写共享能力失败测试**

测试名称与断言：

- `formats an order id with a hash prefix`：`formatOrderId('10001') === '#10001'`。
- `returns the requested order`：`getOrder('10001')` 返回 `{ id: '10001', name: 'Order 10001' }`。
- `does not deliver events after listener cleanup`：注销后再次 emit，旧 Listener 调用次数不增加。
- `publishes immutable log snapshots in append order`：订阅者按 append 顺序收到新 snapshot，外部修改副本不改变 store。
- `clears all migration log entries`：clear 后 snapshot 为空。

- [ ] **Step 4: 在获准后运行测试并确认红灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/shared/shared.test.ts`

Expected: FAIL，原因是共享模块尚未实现。

- [ ] **Step 5: 实现共享能力与唯一公共入口占位**

实现精确接口；API 使用可取消延迟并在 abort 时拒绝 `AbortError`。日志条目包含稳定 `id`、`source`、`message` 和时间戳；公开 snapshot 返回只读副本。`src/index.ts` 暂写为 `export {}`，直到 Task 5 创建公开组件，避免提前引用不存在的文件；任何内部模块都不得从该入口导出。

- [ ] **Step 6: 运行共享测试并确认绿灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/shared/shared.test.ts`

Expected: PASS，5 个共享行为全部通过。

- [ ] **Step 7: 提交 Task 1**

```bash
git add packages/react-vue-migration-demo apps/web/package.json pnpm-lock.yaml
git commit -m "feat: scaffold react vue migration package"
```

### Task 2: Vue 订单模块与 bootstrap 生命周期

**Files:**
- Create: `packages/react-vue-migration-demo/src/migrated-vue/order/contract.ts`
- Create: `packages/react-vue-migration-demo/src/migrated-vue/order/VueOrder.vue`
- Create: `packages/react-vue-migration-demo/src/migrated-vue/order/VueOrderHost.vue`
- Create: `packages/react-vue-migration-demo/src/migrated-vue/order/bootstrap.ts`
- Create: `packages/react-vue-migration-demo/src/migrated-vue/order/bootstrap.test.ts`
- Create: `packages/react-vue-migration-demo/src/migrated-vue/order/order-state.ts`
- Create: `packages/react-vue-migration-demo/src/migrated-vue/order/order-state.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `getOrder`、`eventBus`、`migrationLog` 和 `formatOrderId`。
- Produces: `OrderModuleProps { orderId: string; readonly: boolean }`；`OrderModuleEvents { success(payload): void; close(): void }`；`mountVueOrder(options: MountOptions): ModuleInstance`，实例提供 `update(Partial<OrderModuleProps>): void` 与 `unmount(): void`。

- [ ] **Step 1: 编写订单异步状态失败测试**

覆盖：首次加载返回 10001；10001 未完成即切到 10002 时最终状态只能是 10002；abort 不展示业务错误；普通拒绝进入错误状态。

- [ ] **Step 2: 在获准后运行订单状态测试并确认红灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/migrated-vue/order/order-state.test.ts`

Expected: FAIL，原因是订单状态控制器不存在。

- [ ] **Step 3: 实现 `createOrderState(loader)`**

返回 Vue refs 与 `load(orderId: string): Promise<void>`、`dispose(): void`；每次 load 取消上一个请求，并以请求序号双重防止旧响应覆盖新状态。

- [ ] **Step 4: 运行订单状态测试并确认绿灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/migrated-vue/order/order-state.test.ts`

Expected: PASS。

- [ ] **Step 5: 编写 bootstrap 生命周期失败测试**

断言：mount 后显示 10001；update 到 10002 不替换 Vue 根容器且只记录一次 Vue mounted；第一次 unmount 清空容器并记录 Vue unmounted；第二次 unmount 无副作用；unmount 后 update 不重新创建 App并记录非法生命周期；卸载后 Vue EventBus Listener 不再收到消息。

- [ ] **Step 6: 在获准后运行 bootstrap 测试并确认红灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/migrated-vue/order/bootstrap.test.ts`

Expected: FAIL，原因是协议、Host 与 bootstrap 尚未实现。

- [ ] **Step 7: 实现 Contract、VueOrderHost、VueOrder 与 bootstrap**

`VueOrderHost` 将 reactive Props 和 callbacks 转为 Vue Props/Events；`VueOrder` 实现 count、订单加载、success/close、Platform push/replace/back、双向 EventBus 与可见状态；bootstrap 保持单一 App 实例并实现幂等清理。

- [ ] **Step 8: 运行 Task 2 测试并确认绿灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/migrated-vue/order`

Expected: PASS，且测试输出无 Vue 未清理警告。

- [ ] **Step 9: 提交 Task 2**

```bash
git add packages/react-vue-migration-demo/src/migrated-vue
git commit -m "feat: add migrated vue order lifecycle"
```

### Task 3: Migration Platform 与 React Bridge

**Files:**
- Create: `packages/react-vue-migration-demo/src/migration/platform.ts`
- Create: `packages/react-vue-migration-demo/src/migration/react-platform.ts`
- Create: `packages/react-vue-migration-demo/src/migration/react-platform.test.ts`
- Create: `packages/react-vue-migration-demo/src/migration/ReactLoadVueOrder.tsx`
- Create: `packages/react-vue-migration-demo/src/migration/bridge-lifecycle.ts`
- Create: `packages/react-vue-migration-demo/src/migration/bridge-lifecycle.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `mountVueOrder(options): ModuleInstance`、Props 与 Events Contract。
- Produces: `MigrationPlatform`；`createReactMigrationPlatform(navigate: NavigateFunction): MigrationPlatform`；`createBridgeLifecycle(mount): { attach; update; detach }`；`ReactLoadVueOrder(props)`。

- [ ] **Step 1: 编写 Platform adapter 失败测试**

分别断言 `push('/orders/10002')` 调用 `navigate('/orders/10002')`；`replace` 传 `{ replace: true }`；`back()` 调用 `navigate(-1)`；导航到当前路径仍不触发 Vue remount，该语义由 Bridge 实例计数固定。

- [ ] **Step 2: 编写 Bridge 重入失败测试**

使用 fake mount 断言：首次 attach 仅 mount 一次；props update 只调用实例 update；detach 只 unmount 一次；`attach → detach → attach` 每轮只有一个活跃实例；detach 后 update 不调用旧实例。

- [ ] **Step 3: 在获准后运行 Task 3 测试并确认红灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/migration`

Expected: FAIL，原因是 Platform 与 Bridge 尚未实现。

- [ ] **Step 4: 实现 Platform、纯生命周期控制器和 React Bridge**

`ReactLoadVueOrder` 使用 `useRef` 保存容器与 lifecycle；effect 只管理 attach/detach，独立 effect 传递 Props update；用 `useNavigate` 创建 Platform；事件 callbacks 保持最新引用但不导致 Vue remount。

- [ ] **Step 5: 运行 Task 3 测试并确认绿灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/migration`

Expected: PASS，mount/update/unmount 计数符合断言。

- [ ] **Step 6: 提交 Task 3**

```bash
git add packages/react-vue-migration-demo/src/migration
git commit -m "feat: bridge react lifecycle to vue orders"
```

### Task 4: React Shell、Legacy 实现与可视化日志

**Files:**
- Create: `packages/react-vue-migration-demo/src/legacy-react/ReactOrder.tsx`
- Create: `packages/react-vue-migration-demo/src/demo/ReactMigrationDemo.tsx`
- Create: `packages/react-vue-migration-demo/src/demo/ReactMigrationDemo.css`
- Create: `packages/react-vue-migration-demo/src/demo/demo-state.ts`
- Create: `packages/react-vue-migration-demo/src/demo/demo-state.test.ts`

**Interfaces:**
- Consumes: Task 1 的 EventBus 与日志；Task 2 的 Order Contract；Task 3 的 `ReactLoadVueOrder`。
- Produces: `ReactMigrationDemo`，内部拥有 `MemoryRouter`、Feature Flag、Route 控件、React 事件状态和日志视图。

- [ ] **Step 1: 编写 Shell 状态失败测试**

对纯 `demo-state` reducer 断言：默认实现为 `vue`、默认订单为 10001；切换 legacy/vue 保留当前 route；success/close 更新 React received 文案；清空日志只影响日志；未知 route 映射为明确 not-found 状态而不改变已挂载次数。

- [ ] **Step 2: 在获准后运行 Shell 状态测试并确认红灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/demo/demo-state.test.ts`

Expected: FAIL，原因是 Shell 状态模型不存在。

- [ ] **Step 3: 实现 Shell 状态、Legacy 组件与 ReactMigrationDemo**

`MemoryRouter` 使用 `/orders/:orderId`；实现选择 Vue 时渲染 Bridge，选择 React 时渲染 Legacy；Route 按钮通过 React Router 导航；React 直接订阅/发送 EventBus；日志面板订阅 immutable snapshots。

- [ ] **Step 4: 实现隔离样式与响应式布局**

所有选择器使用 `react-vue-migration-demo__*` 前缀；宽屏为业务组件/日志双栏，窄屏单栏；不得引入 UI Framework。

- [ ] **Step 5: 运行 Task 4 单元测试并确认绿灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/demo/demo-state.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交 Task 4**

```bash
git add packages/react-vue-migration-demo/src/legacy-react packages/react-vue-migration-demo/src/demo
git commit -m "feat: add react migration demo shell"
```

### Task 5: Vue Hosting Adapter 与 Engineering Playground 集成

**Files:**
- Create: `packages/react-vue-migration-demo/src/demo/mount-react-migration-demo.tsx`
- Create: `packages/react-vue-migration-demo/src/demo/mount-react-migration-demo.test.ts`
- Create: `packages/react-vue-migration-demo/src/VueMigrationDemo.vue`
- Modify: `packages/react-vue-migration-demo/src/index.ts`
- Modify: `apps/web/src/types/project.ts`
- Modify: `apps/web/src/data/projects.ts`
- Modify: `apps/web/src/pages/PlaygroundPage.vue`
- Create: `apps/web/src/pages/PlaygroundReactVueMigrationPage.vue`
- Modify: `apps/web/src/app/router/index.ts`

**Interfaces:**
- Consumes: Task 4 的 `ReactMigrationDemo`。
- Produces: 公开 `ReactVueMigrationDemo` Vue 组件；Blog 路由 `/playground/engineering/react-vue-migration`；`engineering` ProjectCategory。

- [ ] **Step 1: 编写 React Root disposer 失败测试**

注入 fake root factory，断言 `mountReactMigrationDemo(container)` render 一次并返回 disposer；disposer 重复调用只 unmount 一次；root 创建或 render 抛错时调用方收到可展示错误且不留下活跃 root。

- [ ] **Step 2: 在获准后运行 Adapter 测试并确认红灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/demo/mount-react-migration-demo.test.ts`

Expected: FAIL，原因是挂载函数尚未实现。

- [ ] **Step 3: 实现 React Root 挂载函数与 Vue Adapter**

函数签名为 `mountReactMigrationDemo(container: HTMLElement): () => void`；Vue Adapter 在 `onMounted` 创建，在 `onBeforeUnmount` 销毁，并用局部状态显示启动错误。

- [ ] **Step 4: 公开唯一 Package API**

`src/index.ts` 只导出：

```ts
export { default as ReactVueMigrationDemo } from './VueMigrationDemo.vue'
```

不得导出 React Shell、Bridge、bootstrap、Platform 或内部 Contract。

- [ ] **Step 5: 集成 Engineering 分类与懒加载页面**

将 `ProjectCategory` 扩展为 `performance | browser | engineering`；增加 Engineering 元数据与 React → Vue 项目；`getProjectPath` 返回固定路径；Router 增加 `engineering` 重定向和懒加载页面。页面只导入 Package 公开组件。

- [ ] **Step 6: 运行 Task 5 单元测试并确认绿灯**

Run: `pnpm --filter @blog/react-vue-migration-demo test -- src/demo/mount-react-migration-demo.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交 Task 5**

```bash
git add packages/react-vue-migration-demo/src apps/web/src
git commit -m "feat: expose migration demo in engineering playground"
```

### Task 6: README、完整诊断与产物核验

**Files:**
- Create: `packages/react-vue-migration-demo/README.md`
- Modify if required by verified duplication only: `apps/web/build/vite/common.ts`
- Inspect: `dist-vite/.vite/manifest.json`

**Interfaces:**
- Consumes: Tasks 1–5 的最终目录、公共入口、路由和日志语义。
- Produces: 可维护迁移说明、用户手工验收步骤、Vite 构建与 Chunk 核验结论。

- [ ] **Step 1: 编写 Package README**

覆盖两层宿主模型、MemoryRouter 原因、迁移判断决策树、五类通信选择、四类代码归属、最终删除清单、启动/构建/类型检查/测试命令，以及 12 个手工验证场景的操作和预期日志。

- [ ] **Step 2: 检查全部触碰文件诊断**

先静态审阅所有新增/修改文件的协议注释、依赖方向、未清理 Listener、公开导出和 CSS 前缀。若发现任务外既有错误，停止扩大范围并报告用户。

- [ ] **Step 3: 请求非页面自动验证授权**

等待用户批准后再依次执行；拒绝时只提供命令和预期结果：

```bash
pnpm --filter @blog/react-vue-migration-demo test
pnpm --filter @blog/react-vue-migration-demo typecheck
pnpm lint
pnpm build:vite
```

预期：测试、子包类型检查、全仓 lint 与 Vite build 均以退出码 0 完成。不得执行 Webpack 命令，不得启动 dev server。

- [ ] **Step 4: 检查 Vite 产物中的 Runtime 与 Chunk**

读取 `dist-vite/.vite/manifest.json` 和生成 Chunk 的 import 关系：Engineering 页面必须为懒加载入口；React、React DOM 与 React Router 只从该入口可达；搜索 Vue Runtime 特征并结合模块/Chunk 报告确认没有第二份 Vue。只有确证重复时才调整 `resolve.dedupe` 或 Chunk 配置并重新构建。

- [ ] **Step 5: 由用户执行页面验收**

提供：

```bash
pnpm dev:vite
```

用户访问 `#/playground/engineering/react-vue-migration`，按 README 的 12 场景操作并反馈结果。Agent 不启动服务、不操作浏览器。

- [ ] **Step 6: 根据用户反馈处理本次实现引入的问题**

只修复本任务直接引入的回归；新发现的既有或额外缺陷先报告位置、现象、影响和建议，再等待授权扩展范围。

- [ ] **Step 7: 最终提交**

```bash
git add packages/react-vue-migration-demo/README.md apps/web/build/vite/common.ts
git commit -m "docs: document react vue migration demo"
```

- [ ] **Step 8: 最终交付报告**

逐项列出新增/修改文件、Package 目录、公开引用方式、页面路径、命令与验证结果、12 场景状态、四类代码归属、最终删除清单、Vue Runtime 是否重复，以及 React/Vue Chunk 情况。未由 Agent 或用户实际验证的项目必须标为“未验证”，不得推断为通过。
