# React → Vue 渐进迁移完整方案设计

## 1. 目标

在不中断现有 React 项目正常发版的前提下，逐个业务模块迁移到 Vue
3，并支持：

-   React / Vue 长期共存一段时间
-   单模块灰度与快速回滚
-   React Props → Vue Props
-   Vue 事件 → React 父组件
-   React Router → Vue 模块
-   EventBus / API / Utils 等框架无关代码尽量不改
-   Vue 模块内部保持正常 Vue 开发方式
-   最终 React Shell 退出后删除所有迁移桥接代码
-   AI / Skill 可以按照统一规则批量迁移

核心原则：

> **能原样运行的代码不改；不能运行才适配；能通过 Props / Events
> 解决就不扩大 Platform；确实依赖宿主框架能力才进入 Migration
> Platform。**

------------------------------------------------------------------------

# 2. 总体迁移路线

``` text
阶段 0：原 React 项目

React Shell
    │
    ├── ReactA
    ├── ReactB
    ├── ReactC
    └── ReactD


阶段 1：单模块迁移

React Shell
    │
    ├── ReactA
    │
    ├── ReactLoadVueB
    │       ↓
    │   bootstrap
    │       ↓
    │     VueB
    │
    ├── ReactC
    └── ReactD


阶段 2：批量迁移

React Shell
    │
    ├── VueA
    ├── VueB
    ├── VueC
    └── ReactD


阶段 3：业务组件全部 Vue 化

React Shell
    │
    ├── VueA
    ├── VueB
    ├── VueC
    └── VueD


阶段 4：Shell 迁移

Vue Shell
    │
    ├── VueA
    ├── VueB
    ├── VueC
    └── VueD

删除：
- ReactLoadVue*
- bootstrap*
- React Migration Platform 实现
- React Shell
- React Router
- React / ReactDOM（确认无其他用途后）
```

------------------------------------------------------------------------

# 3. 单模块迁移架构

假设：

``` text
ReactA.tsx
```

需要迁移为：

``` text
VueA.vue
```

迁移期间：

``` text
React Parent
      │
      │ Props
      ▼
ReactLoadVueA.tsx
      │
      │ mount / update / unmount
      ▼
bootstrap.ts
      │
      ▼
VueA.vue
```

同时存在两条额外通信链路：

``` text
VueA
 ↓
Component Events
 ↓
bootstrap
 ↓
ReactLoadVueA
 ↓
React Parent
```

以及：

``` text
VueA
 ↓
Migration Platform
 ↓
React Platform Adapter
 ↓
React Router / React Global Environment
```

------------------------------------------------------------------------

# 4. 推荐目录

``` text
src/

├── legacy-react/
│   └── ReactA.tsx
│
├── migrated-vue/
│   └── a/
│       ├── VueA.vue
│       ├── VueAHost.vue
│       ├── contract.ts
│       └── bootstrap.ts
│
├── migration/
│   ├── ReactLoadVueA.tsx
│   ├── platform.ts
│   └── react-platform.ts
│
└── shared/
    ├── api/
    ├── utils/
    ├── event-bus/
    └── domain/
```

代码分类：

  -----------------------------------------------------------------------
  类型                    示例                    最终状态
  ----------------------- ----------------------- -----------------------
  Legacy Code             `ReactA.tsx`            Vue 稳定后删除

  Migration Temporary     `ReactLoadVueA.tsx`     React Shell 退出后删除
  Code

  Migration Temporary     `bootstrap.ts`          React Shell 退出后删除
  Code

  Migration Temporary     `react-platform.ts`     React Shell 退出后删除
  Code

  Permanent Code          `VueA.vue`              保留

  Permanent Code          API / Utils / Domain    保留

  按需删除                Migration Platform      纯 Vue 后逐项处理
                          Contract
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 5. 最重要的迁移判断算法

AI、Codemod 或人工迁移时，每遇到一个依赖，都按下面顺序判断：

``` text
发现外部依赖
     │
     ▼
脱离原 Framework 后还能直接运行吗？
     │
 ┌───┴────┐
 │        │
YES       NO
 │        │
 ▼        ▼
保持原样   属于 Parent ↔ Component 通信吗？
              │
          ┌───┴────┐
          │        │
         YES       NO
          │        │
          ▼        ▼
      Props/Event   Vue 模块内部能独立解决吗？
                       │
                   ┌───┴────┐
                   │        │
                  YES       NO
                   │        │
                   ▼        ▼
                Vue内部实现  是否依赖 React Shell？
                                │
                               YES
                                │
                                ▼
                        Migration Platform
```

典型映射：

  原能力                         处理方式
  ------------------------------ ----------------------------------------------
  普通 API Service               原样保留
  Utils                          原样保留
  Domain Logic                   原样保留
  纯 JS/TS `mitt` EventBus       原样保留
  React Parent → Vue 数据        Props
  Vue → React Parent 事件        Component Event Contract
  `$router.push()`               Migration Platform
  `$route.params.orderId`        优先 Props
  完整 `$route` 上下文           `platform.route`
  Vue 模块内部状态               Vue `ref/reactive` / Pinia
  React/Vue 必须共享的全局状态   Migration Adapter / Platform
  Vue 插件                       能在 Vue 子 App 自己安装则不适配；否则再判断

------------------------------------------------------------------------

# 6. Props Contract

业务组件公开输入应该结构化定义：

``` ts
export interface AModuleProps {
  orderId: string
  readonly: boolean
  mode: 'view' | 'edit'
}
```

Vue：

``` vue
<script setup lang="ts">
import type { AModuleProps } from './contract'

const props = defineProps<AModuleProps>()
</script>
```

迁移期间：

``` text
React Props
    ↓
ReactLoadVueA
    ↓
bootstrap.mount / update
    ↓
Vue reactiveProps
    ↓
defineProps
```

最终纯 Vue：

``` text
Vue Parent
    ↓
Props
    ↓
VueA
```

因此业务 Props Contract 可以长期保留。

------------------------------------------------------------------------

# 7. bootstrap 协议

`bootstrap.ts` 不是业务组件，而是临时的跨框架生命周期入口。

接口：

``` ts
export interface MountOptions<TProps, TEvents> {
  container: HTMLElement
  props: TProps
  events: TEvents
  platform: MigrationPlatform
}

export interface ModuleInstance<TProps> {
  update(props: Partial<TProps>): void
  unmount(): void
}
```

核心实现：

``` ts
import {
  createApp,
  reactive,
} from 'vue'

export function mount(options: MountOptions) {
  const reactiveProps = reactive({
    ...options.props,
  })

  const app = createApp(
    VueAHost,
    {
      moduleProps: reactiveProps,
      events: options.events,
    },
  )

  app.provide(
    'migrationPlatform',
    options.platform,
  )

  app.mount(options.container)

  return {
    update(nextProps) {
      Object.assign(
        reactiveProps,
        nextProps,
      )
    },

    unmount() {
      app.unmount()
    },
  }
}
```

生命周期：

``` text
React Mount
   ↓
bootstrap.mount()
   ↓
createApp()
   ↓
Vue mounted


React Props Change
   ↓
bootstrap.update()
   ↓
Object.assign(reactiveProps)
   ↓
Vue Reactive Update


React Unmount
   ↓
bootstrap.unmount()
   ↓
app.unmount()
```

### 禁止

Props 每次变化都：

``` text
unmount
 ↓
createApp
 ↓
mount
```

否则会导致：

-   Vue 内部状态丢失
-   重复初始化
-   生命周期反复执行
-   Event Listener 更容易泄漏
-   性能浪费

------------------------------------------------------------------------

# 8. ReactLoadVueA 适配层

职责只有：

> React Component Lifecycle → Vue App Lifecycle

``` tsx
export function ReactLoadVueA(props: AModuleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ModuleInstance<AModuleProps> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    instanceRef.current = mount({
      container: containerRef.current,
      props,
      events: {
        onSuccess(data) {
          // 转发给 React Parent
        },
        onClose() {
          // 转发给 React Parent
        },
      },
      platform,
    })

    return () => {
      instanceRef.current?.unmount()
      instanceRef.current = null
    }
  }, [])

  useEffect(() => {
    instanceRef.current?.update(props)
  }, [
    props.orderId,
    props.readonly,
    props.mode,
  ])

  return <div ref={containerRef} />
}
```

### 禁止放入

``` text
业务 API
业务计算
业务 Store
订单规则
权限业务逻辑
格式转换
Domain Logic
```

原因：

> `ReactLoadVueA` 是明确的 Disposable Code，最终必须能够直接删除。

------------------------------------------------------------------------

# 9. `$emit`：Component Contract，不进入 Platform

原 Vue：

``` ts
const emit = defineEmits<{
  success: [data: Order]
  close: []
}>()

emit('success', order)
```

迁移链路：

``` text
VueA
 ↓
emit('success')
 ↓
VueAHost
 ↓
bootstrap events
 ↓
ReactLoadVueA
 ↓
React Parent
```

定义：

``` ts
export interface AModuleEvents {
  onSuccess(order: Order): void
  onClose(): void
}
```

因此：

``` text
Props  = Parent → Component
Events = Component → Parent
```

两者共同属于：

``` text
Component Contract
```

不要：

``` ts
platform.emit(...)
```

------------------------------------------------------------------------

# 10. 为什么需要 VueAHost

如果 VueA 是 `createApp()` 的 Root
Component，为了让业务组件仍然保持正常：

``` vue
<VueA
  ...
  @success="..."
  @close="..."
/>
```

可以增加一个非常薄的：

``` text
VueAHost.vue
```

它只负责：

``` text
bootstrap
   ↓
VueAHost
   ↓
VueA
```

例如：

``` vue
<script setup lang="ts">
import VueA from './VueA.vue'

const props = defineProps<{
  moduleProps: AModuleProps
  events: AModuleEvents
}>()
</script>

<template>
  <VueA
    v-bind="moduleProps"
    @success="events.onSuccess"
    @close="events.onClose"
  />
</template>
```

Host 不能放业务逻辑。

------------------------------------------------------------------------

# 11. Migration Platform 的准确定位

这里的 Platform 是：

> **Migration Platform / Compatibility Platform**

它不是万能 Application Platform。

只解决：

> Vue 模块因为运行在 React Shell 中，原有代码无法正常执行的宿主能力。

判断：

``` text
原代码
 ↓
React Shell + Vue Bridge 下能执行？
 ↓
YES → 不进入 Platform
NO  → 再判断 Props/Event/内部实现
      都不适合才进入 Platform
```

------------------------------------------------------------------------

# 12. Router 与 Route

必须区分：

``` text
router = 路由操作能力
route  = 当前路由状态
```

## 12.1 `$router`

例如：

``` ts
$router.push(...)
$router.replace(...)
$router.back()
```

迁移期间 Vue 不拥有顶层 Browser History。

因此：

``` text
VueA
 ↓
platform.router.push()
 ↓
React Platform
 ↓
React Router navigate()
```

Contract：

``` ts
export interface MigrationRouter {
  push(path: string): void
  replace(path: string): void
  back(): void
}
```

------------------------------------------------------------------------

## 12.2 `$route`

不要简单规定：

``` text
$route → Platform
```

也不要简单规定：

``` text
$route → Props
```

而是判断语义。

### 明确业务输入

例如：

``` ts
$route.params.orderId
```

而组件本质就是：

``` text
OrderDetail(orderId)
```

那么：

``` text
React Router
 ↓
orderId
 ↓
Props
 ↓
VueOrder
```

更合理。

### 完整路由上下文

如果组件大量依赖：

``` text
route.path
route.params
route.query
route.hash
route.name
route.meta
route.fullPath
```

再进入：

``` ts
platform.route
```

最终规则：

``` text
$route
  │
  ├─ 明确业务参数
  │     ↓
  │    Props
  │
  └─ 完整路由上下文
        ↓
   Platform.route
```

------------------------------------------------------------------------

# 13. Router 完整闭环

``` text
VueOrder

点击：
跳转订单 10002
       ↓
platform.router.push('/orders/10002')
       ↓
React Platform
       ↓
React Router navigate()
       ↓
React Route Changed
       ↓
useParams()
       ↓
orderId = 10002
       ↓
ReactLoadVueOrder Props Changed
       ↓
bootstrap.update()
       ↓
reactiveProps.orderId = 10002
       ↓
Vue watch(props.orderId)
       ↓
加载 Order 10002
```

Vue 不直接控制顶层 Browser History。

------------------------------------------------------------------------

# 14. EventBus

EventBus 是否进入 Platform，取决于实现。

## 框架无关 EventBus

例如：

``` ts
import mitt from 'mitt'

export const eventBus = mitt()
```

React：

``` ts
eventBus.on(...)
```

Vue：

``` ts
eventBus.emit(...)
```

都能工作。

因此：

> **不改，不进入 Platform。**

------------------------------------------------------------------------

## 框架绑定 EventBus

如果原 EventBus 依赖：

``` text
Vue Instance
Vue Plugin
globalProperties
provide/inject
```

React Shell 下不能工作。

这时候才做兼容适配。

所以不是：

``` text
EventBus → Platform
```

而是：

``` text
EventBus
 ↓
框架无关？
 ├─ YES → 原样
 └─ NO  → Migration Adapter
```

------------------------------------------------------------------------

# 15. API / Utils / Domain

例如：

``` ts
import { getOrder } from '@/api/order'
import { formatMoney } from '@/utils/money'
import { calculatePrice } from '@/domain/order'
```

如果都是普通 TS/JS：

``` text
React 能运行
Vue 能运行
```

则：

> **全部保持原样。**

禁止为了迁移改成：

``` ts
platform.api.getOrder()
platform.utils.formatMoney()
platform.domain.calculatePrice()
```

否则会把 Migration Platform 变成 God Object。

------------------------------------------------------------------------

# 16. Vue 内部状态

Vue 模块自己的状态：

``` ts
const count = ref(0)
const loading = ref(false)
```

正常使用 Vue。

如果需要模块 Store：

``` text
VueA
 ↓
Pinia
```

只要这个 Pinia 可以跟随 Vue 子 App 初始化：

``` ts
const pinia = createPinia()

app.use(pinia)
```

就不需要 Platform。

只有 React/Vue 必须共享同一份全局状态时，才需要专门设计 State Adapter。

------------------------------------------------------------------------

# 17. Feature Flag 与回滚

迁移不能一次性替换。

推荐：

``` text
Feature Flag

useVueA = false
     ↓
ReactA

useVueA = true
     ↓
ReactLoadVueA
     ↓
VueA
```

页面：

``` tsx
return useVueA
  ? <ReactLoadVueA {...props} />
  : <ReactA {...props} />
```

Vue 出现线上问题：

``` text
Feature Flag
 ↓
Vue OFF
 ↓
React ON
```

不需要重新发布整个 React 版本。

生产环境 Feature Flag 应使用 Runtime 配置，而不是 Build-time 常量。

------------------------------------------------------------------------

# 18. 灰度顺序

建议：

``` text
开发环境
 ↓
测试环境
 ↓
内部用户
 ↓
5%
 ↓
20%
 ↓
50%
 ↓
100%
 ↓
观察稳定周期
 ↓
删除 ReactA
```

观察：

``` text
JS Error Rate
API Error Rate
页面成功率
核心操作成功率
性能指标
用户反馈
```

------------------------------------------------------------------------

# 19. AI / Skill 批量迁移

不要直接：

``` text
整个 React 项目
 ↓
AI
 ↓
整个 Vue 项目
```

应该：

``` text
挑一个代表性模块
 ↓
人工 + AI 完成迁移
 ↓
沉淀迁移规则
 ↓
沉淀 Skill
 ↓
测试
 ↓
Reviewer
 ↓
再批量迁移
```

Skill 至少需要识别：

``` text
Props
State
Effect
Router
Route
Event
API
Utils
Store
Global Dependency
Component Dependency
Framework-specific Dependency
```

然后按迁移判断算法分类。

------------------------------------------------------------------------

# 20. 推荐迁移流水线

``` text
React Component
      ↓
Dependency Analysis
      ↓
分类：
Framework Independent
Props
Events
Internal State
Host Capability
      ↓
AI Transform
      ↓
Vue Component
      ↓
Generate Bridge
      ↓
TypeCheck
      ↓
Unit Test
      ↓
Component Test
      ↓
E2E
      ↓
Reviewer
      ↓
Feature Flag
      ↓
Gray Release
```

------------------------------------------------------------------------

# 21. 测试要求

## Props

验证：

``` text
10001
 ↓
10002
```

Vue：

``` text
不重新 mount
只 update props
```

## Event

验证：

``` text
Vue emit
 ↓
React Parent
```

## Router

验证：

``` text
Vue
 ↓
Platform Router
 ↓
React Router
 ↓
Props
 ↓
Vue
```

## EventBus

验证：

``` text
Vue → React
React → Vue
```

并检查 unsubscribe。

## 生命周期

反复：

``` text
React
 ↓
Vue
 ↓
React
 ↓
Vue
```

确认：

``` text
无重复 Listener
无重复 Vue App
无残留 DOM
无明显 Heap 持续增长
```

------------------------------------------------------------------------

# 22. 内存泄漏检查

React → Vue 桥接最容易出现：

``` text
Vue App 未 unmount
EventBus 未 off
window listener 未 remove
Timer 未 clear
Observer 未 disconnect
第三方 SDK listener 未销毁
```

React cleanup：

``` ts
useEffect(() => {
  const instance = mount(...)

  return () => {
    instance.unmount()
  }
}, [])
```

Vue：

``` ts
onBeforeUnmount(() => {
  eventBus.off(...)
  clearInterval(...)
  observer.disconnect()
})
```

使用 Chrome DevTools：

``` text
Memory
 ↓
Heap Snapshot

切换 React/Vue 多次
 ↓
再次 Snapshot
 ↓
Comparison
```

重点观察：

``` text
Detached DOM
Vue Component Instance
Closure
Event Listener
```

------------------------------------------------------------------------

# 23. Build 与发布

迁移期间仍然只有一个 React 应用版本。

``` text
React Source
+
Vue Migrated Source
      ↓
Vite / Existing Build
      ↓
同一个 Artifact
      ↓
同一个 Release
```

不是：

``` text
React 单独发布
Vue 单独发布
```

Vue 只是 React 应用中的一部分代码。

可以对 Vue 模块做 Dynamic Import：

``` text
React Shell
 ↓
import()
 ↓
Vue Migration Chunk
```

降低未开启 Feature Flag 用户的初始成本。

------------------------------------------------------------------------

# 24. 最终 Shell 迁移

当：

``` text
ReactA → VueA
ReactB → VueB
ReactC → VueC
...
```

所有主要业务模块完成后，再迁 Shell。

以前：

``` text
React Shell
 ↓
ReactLoadVueA
 ↓
bootstrap
 ↓
VueA
```

最终：

``` text
Vue Shell
 ↓
Vue Parent
 ↓
VueA
```

------------------------------------------------------------------------

# 25. 最终删除什么

删除：

``` text
ReactLoadVueA.tsx
ReactLoadVueB.tsx
ReactLoadVueC.tsx

bootstrap.ts
react-platform.ts

React Shell
React Router
React / ReactDOM

Legacy React Components
```

业务组件：

``` text
VueA.vue
VueB.vue
VueC.vue
```

尽量保持不变。

------------------------------------------------------------------------

# 26. Migration Platform 最终怎么处理

由于这里的 Platform 明确定义为：

``` text
Migration Compatibility Layer
```

所以纯 Vue 后可以逐项删除。

例如：

``` text
platform.router.push()
 ↓
useRouter().push()
```

``` text
platform.route
 ↓
useRoute()
```

React Store Adapter：

``` text
platform.state
 ↓
Pinia
```

但不要在 React → Vue 主迁移过程中同时做这次清理。

推荐：

``` text
React → Vue Migration
 ↓
稳定
 ↓
React 完全退出
 ↓
独立 Platform Cleanup
```

这样减少变量和回归风险。

------------------------------------------------------------------------

# 27. 最终代码分类

``` text
Legacy Code
────────────────────
ReactA.tsx
ReactB.tsx
...
最终删除


Migration Temporary Code
────────────────────
ReactLoadVue*.tsx
bootstrap.ts
react-platform.ts
Migration Platform
最终删除


Permanent Code
────────────────────
VueA.vue
VueB.vue
Domain
API
Utils
框架无关 EventBus
长期保留
```

------------------------------------------------------------------------

# 28. 最终完整架构图

## 迁移期间

``` text
                        React Shell
                             │
                     React Router
                             │
            ┌────────────────┴─────────────────┐
            │                                  │
     业务 Route 参数                       导航能力
            │                                  │
            ▼                                  ▼
          Props                       Migration Platform
            │                                  │
            ▼                                  │
   ReactLoadVueA.tsx                           │
            │                                  │
      mount/update/unmount                     │
            │                                  │
            ▼                                  │
        bootstrap.ts                           │
            │                                  │
            ▼                                  │
        VueAHost.vue                           │
            │                                  │
            ▼                                  │
         VueA.vue ◄────────────────────────────┘
            │
      ┌─────┼───────────────┐
      │     │               │
      ▼     ▼               ▼
     API   Utils         EventBus
      │     │               │
      └─────┴───────────────┘
       Framework Independent

VueA Event
    │
    ▼
VueAHost
    │
    ▼
bootstrap callbacks
    │
    ▼
ReactLoadVueA
    │
    ▼
React Parent
```

------------------------------------------------------------------------

## 最终纯 Vue

``` text
                   Vue Shell
                       │
                  Vue Router
                       │
             ┌─────────┴─────────┐
             │                   │
           Props             Router/Route
             │                   │
             ▼                   ▼
           VueA.vue         Vue Native APIs
             │
      ┌──────┼────────┐
      │      │        │
     API   Utils   EventBus
```

中间的：

``` text
ReactLoadVueA
bootstrap
React Platform
```

全部消失。

------------------------------------------------------------------------

# 29. 面试时的核心回答

如果面试官问：

> React 和 Vue 技术栈怎么通过 AI 逐步统一？

可以回答：

> 我不会直接让 AI 全仓把 React 翻译成
> Vue。首先会选择一个边界清晰、风险可控的业务模块建立迁移模板。React
> 仍然作为 Shell，通过一个临时 Adapter 调用 Vue 模块暴露的
> `mount / update / unmount` 生命周期协议。
>
> 对原组件依赖逐项分类：普通 API、Utils、Domain、纯 JS EventBus 如果脱离
> React/Vue 仍能运行，就完全不动；父子组件通信转成 Props 和 Event
> Contract；只有
> Router、框架绑定的全局状态等因为宿主切换无法继续工作的能力，才进入
> Migration Platform。
>
> 每个模块同时保留 React 和 Vue 两种实现，通过 Runtime Feature Flag
> 灰度。如果 Vue 出问题可以立即切回
> React。第一个模块跑通以后，把依赖识别、React/Vue API 映射、测试规则和
> Review 规则沉淀成 AI Skill，再批量迁移后续模块。
>
> 等业务模块全部 Vue 化以后再迁 Shell。最后删除 ReactLoadVue
> Adapter、bootstrap 和 React Platform 等临时代码，Vue
> 业务组件本身基本不需要二次修改。Migration Platform
> 再作为独立技术债治理，逐项恢复成 Vue Router、Pinia 等原生能力。

------------------------------------------------------------------------

# 30. 一句话原则

> **React → Vue
> 迁移不是"翻译代码"，而是先识别框架边界，再用最小兼容层维持新旧模块共存；能不改的代码不改，必须适配的能力才适配，并保证所有迁移桥接代码最终可删除。**
