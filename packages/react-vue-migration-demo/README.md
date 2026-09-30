# @blog/react-vue-migration-demo

在现有 Vue Blog 中展示真实 React → Vue 渐进迁移过程的独立技术 Demo Package。

## 两层运行环境

```text
真实展示宿主
apps/web（Vue 3）
  └─ ReactVueMigrationDemo
       └─ VueMigrationDemo.vue          # Demo Hosting Adapter
            └─ ReactDOM.createRoot()

Demo 内部模拟的生产迁移环境
ReactMigrationDemo（Legacy React Shell）
  ├─ ReactOrder                         # Legacy 实现
  └─ ReactLoadVueOrder                  # Migration Temporary Bridge
       └─ bootstrap.mount/update/unmount
            └─ VueOrder                 # 迁移后的业务组件
```

外层 Vue 只负责提供展示容器。真正的迁移案例从 React Root 开始：React Shell 持有路由与 Feature Flag，并通过 Bridge 加载 Vue 模块。

## 为什么使用 MemoryRouter

Demo 嵌入已有 Vue Router 网站，使用 `MemoryRouter` 可以避免 React Router 与 Blog 的顶层 History 竞争。真实迁移项目中，Legacy React Shell 通常拥有 Browser History；这里的 MemoryRouter 只是展示环境隔离手段，不是生产迁移方案的限制。

## 公共 API

Package 只导出一个适合 Vue 宿主使用的组件：

```vue
<script setup lang="ts">
import { ReactVueMigrationDemo } from '@blog/react-vue-migration-demo'
</script>

<template>
  <ReactVueMigrationDemo />
</template>
```

React Shell、React Router、Bridge、bootstrap、Platform 和内部 Contract 均为 Package 私有实现。

## 迁移依赖判断

```text
发现一个原代码依赖
        ↓
脱离原 Framework 还能运行吗？
        │
    YES ┴ NO
     │     │
     ▼     ▼
    不改   是否属于组件边界通信？
              │
          YES ┴ NO
           │     │
           ▼     ▼
    Props / Event   是否必须依赖 React Shell？
                         │
                      YES
                         ↓
                Migration Platform
```

| 原能力 | 迁移方式 | 原因 |
| --- | --- | --- |
| `$route.params.orderId` | React Router `useParams()` → Props | 路由参数是组件输入，不需要 Platform |
| `$emit` | Vue Events → Host → bootstrap callbacks → React | 属于父子组件 Contract |
| `$router` | `MigrationPlatform.router` → React Router `navigate()` | 顶层 Router 仍由 React Shell 拥有 |
| `getOrder()` | Vue 直接 import | 普通 TypeScript API 可脱离 Framework 运行 |
| `formatOrderId()` | React/Vue 直接 import | 纯函数无需适配 |
| mitt EventBus | React/Vue 直接共享 | mitt 与 Framework 无关 |

## 生命周期协议

```text
React mount   → bootstrap.mount()   → Vue createApp()
React props   → bootstrap.update()  → Object.assign(reactiveProps)
React unmount → bootstrap.unmount() → Vue app.unmount()
```

Props 更新不会重新创建 Vue App。Feature Flag 从 Vue 切回 React 时，Bridge 必须卸载 Vue App，并清理 API 请求和 EventBus Listener。

## Platform 路由闭环

```text
VueOrder button
→ platform.router.push('/orders/10002')
→ React Platform
→ React Router navigate()
→ useParams()
→ ReactLoadVueOrder props
→ bootstrap.update()
→ VueOrder watch(orderId)
```

## 代码归属

### Legacy Code

- `src/legacy-react/ReactOrder.tsx`

### Migration Temporary Code

- `src/migration/ReactLoadVueOrder.tsx`
- `src/migration/bridge-lifecycle.ts`
- `src/migration/platform.ts`
- `src/migration/react-platform.ts`
- `src/migrated-vue/order/bootstrap.ts`
- `src/migrated-vue/order/VueOrderHost.vue`

### Permanent Business Code

- `src/migrated-vue/order/VueOrder.vue`
- `src/migrated-vue/order/contract.ts`
- `src/migrated-vue/order/order-state.ts`
- `src/shared/api.ts`
- `src/shared/utils.ts`
- 业务仍需要跨模块消息时的 `src/shared/event-bus.ts`

### Demo Hosting Adapter

- `src/VueMigrationDemo.vue`
- `src/demo/mount-react-migration-demo.tsx`
- `src/demo/ReactMigrationDemo.tsx`
- `src/demo/ReactMigrationDemo.css`
- `src/demo/demo-state.ts`
- `src/shared/migration-log.ts`

React 完全迁移完成后，生产项目删除 Legacy Code 与 Migration Temporary Code。Blog 为了继续展示迁移过程，会保留 Demo Hosting Adapter 和演示 Shell。

## 依赖与构建

- React、React DOM、React Router、mitt、类型与测试工具只声明在本 Package。
- Vue `3.5.13` 同时是精确版本的 peer dependency 与开发依赖。
- Package 不单独生成 `dist`；`apps/web` 的 Vite 沿 Workspace 依赖图编译源码。
- `.vue` 由现有 Vue Vite 插件编译，React `.tsx` 由 Vite 内置 esbuild 编译。
- `src/public.d.ts` 隔离宿主的 Vue JSX 类型环境，`src/index.ts` 仍是运行时入口。
- Engineering 页面由 Vue Router 懒加载，React 相关代码不进入首页首屏执行路径。

## 命令

```bash
# 子包单元测试
pnpm --filter @blog/react-vue-migration-demo test

# 子包类型检查
pnpm --filter @blog/react-vue-migration-demo typecheck

# 全仓 Lint
pnpm lint

# Vite 生产构建
pnpm build:vite

# 用户手动启动页面
pnpm dev:vite
```

访问路径：`#/playground/engineering/react-vue-migration`

## 手工验收场景

页面交互由用户手动完成，预期如下：

1. 打开页面：显示 React Shell、Vue Migrated 和可视化 Migration Log。
2. 选择 React Legacy：显示 `React Order #10001`。
3. 切回 Vue Migrated：日志出现 `[Bridge] mount VueOrder` 与 `[Vue] mounted`。
4. Route 从 10001 切到 10002：日志依次出现 React route changed、Bridge update props、Vue props changed；不得再次出现 Vue mounted。
5. 点击 `emit success`：React received 显示 `Vue success - order 10002`，日志包含 Vue emit、Bridge forward、React received。
6. 点击 `emit close`：React received 显示 `Vue close`。
7. 点击 Vue 的 `router.push → 10001`：React Router 切换到 10001，并经 Props 回流更新 Vue。
8. 点击 `EventBus emit`：React EventBus received 显示 Vue 消息。
9. 点击 `React EventBus emit`：Vue 组件显示 React 消息。
10. 切换订单后等待约 300ms：Vue 显示 `Order 10001` 或 `Order 10002`，API 调用不经过 Platform。
11. 订单标题显示 `#10001`/`#10002`：证明 Vue 直接使用 shared utils。
12. 重复 Vue/React 切换：每轮 Vue mount/unmount 各一次，无重复 EventBus 消息或残留 Vue UI。

若在窄屏验收，业务组件与日志应切换为单列布局。
