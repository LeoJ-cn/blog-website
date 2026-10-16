# blog-website 仓库技术上下文审计与 AI 交接文档

> 审计日期：2026-10-16（Asia/Shanghai）  
> 审计工作目录：`/Users/leojm5/Documents/company/blog-website`  
> 审计基线：分支 `feature/v2-blog-website`，HEAD `27052747e7aaae1926e0ad1fb0bd1e80d49cbce8`  
> 证据原则：除“建议”和“推断”明确标注外，结论均来自本仓库实际源码、配置或文档。本次未读取任何 `.env` 值。

## 01. 仓库基本信息

### 1.1 定位

`blog-website` 不是传统文章型博客，而是面向开发者的 Engineering Showcase / Developer Playground。它用一个 Vue 3 宿主应用承载 GIS、低代码、跨框架迁移、性能监控、图片加载、调度和浏览器 API 等可交互实验。

证据：

- 根包描述为 `Engineering Showcase and Developer Playground frontend monorepo`：`package.json`。
- 首页文案为“前端工程实验场”：`apps/web/src/pages/HomePage.tsx`。
- 项目清单实际注册 7 个实验：`apps/web/src/data/projects.ts`。
- 路由实际注册 GIS、低代码、React→Vue、图片加载、渲染调度、设备性能、文本标注页面：`apps/web/src/app/router/index.ts`。

根 `AGENTS.md` 和 `docs/specifications/engineering-foundation.md` 仍写着“当前阶段只建立工程骨架”，但真实代码已经进入完整 Demo 实现阶段。这是文档基线滞后，而不是代码尚未实现。

### 1.2 核心技术栈

| 领域 | 实际技术 | 证据 |
| --- | --- | --- |
| 应用框架 | Vue `3.5.13`，Composition API、Vue SFC、Vue TSX | `apps/web/package.json`、`apps/web/src/main.ts`、`HomePage.tsx` |
| 路由 | Vue Router `4.5.0`，Hash History，页面懒加载 | `apps/web/src/app/router/index.ts` |
| 状态管理 | Pinia `3.0.1`；目前主要用于 GIS | `apps/web/src/main.ts`、`packages/openlayers-gis-demo/src/stores/gis.ts` |
| UI | Element Plus `2.9.5`；另有最小 `@white55/ui` | `apps/web/package.json`、`packages/ui/src/index.ts` |
| HTTP | Axios `1.7.9` 封装 | `packages/http/src/client.ts` |
| WebSocket | 浏览器原生 WebSocket 封装 | `packages/websocket/src/client.ts` |
| 地图 | OpenLayers `10.10.0` | `packages/openlayers-gis-demo/package.json` |
| 低代码 | AntV G6 `4.7.10`、Blockly `4.20201217.0` | `packages/low-code/package.json` |
| 跨框架实验 | React/React DOM `19.3.0`、React Router DOM `7.14.0`、mitt `3.0.1` | `packages/react-vue-migration-demo/package.json` |
| 构建 | Vite `6.0.11` 为默认；Webpack `5.98.0` 为保留的第二管线 | `package.json`、`apps/web/package.json` |
| 单元测试 | Vitest `3.2.4`；低代码另有 `node:test` 文件 | 各包 `vitest.config.ts`、`packages/low-code/tests/**` |
| E2E | Playwright `1.49.1`，Chromium | `playwright.config.ts`、`apps/web/e2e/**` |
| 规范 | ESLint 9 Flat Config、Prettier、Stylelint、lint-staged、Husky | 根配置与 `.husky/**` |

### 1.3 运行环境与版本约束

- Node：`.node-version` 为 `22.14.0`；`package.json.engines.node` 为 `>=22.14.0 <23`。
- pnpm：`packageManager` 与 CI 均固定 `9.15.5`。
- TypeScript：根依赖固定 `5.6.3`，目标 `ES2022`，`strict: true`、`noEmit: true`、`moduleResolution: Bundler`。
- `.npmrc` 开启 `engine-strict=true`、`strict-peer-dependencies=true`，关闭自动安装 peer。
- 直接依赖均为精确版本；Workspace 协议仍混用 `workspace:*`、`workspace:^` 和 `workspace:2.0.0`。
- 浏览器范围：`> 0.5%`、最近两个版本、Firefox ESR、排除 IE 11，见 `.browserslistrc`。
- 环境文件：存在 `apps/web/.env.example` 和本地 `apps/web/.env.local`。仅确认变量名 `VITE_BASE_PATH`、`VITE_TIANDITU_TOKEN`；本审计未读取值。

### 1.4 Git 实际状态

写入本报告前：

- 当前分支：`feature/v2-blog-website`。
- HEAD：`2705274`，提交主题为 `refactor: rename workspace packages to white55 scope`。
- 相对 `origin/feature/v2-blog-website`：ahead 19。
- 工作树：干净。

本报告创建后，预期只新增本文件为未提交文件；本审计没有修改其他 Git 状态。

## 02. 当前实际目录结构

```text
blog-website/
├── apps/
│   └── web/                       # 唯一可运行宿主应用
│       ├── build/vite/            # Vite 分层配置
│       ├── build/webpack/         # Webpack 5 分层配置
│       ├── e2e/                   # Playwright E2E
│       └── src/
│           ├── app/               # App、Router、运行时服务装配
│           ├── components/        # 展示组件和若干实验核心
│           ├── composables/       # 性能面板适配
│           ├── data/              # Playground 元数据与源码展示
│           └── pages/             # 路由页面
├── packages/
│   ├── config/                    # 浏览器运行时配置与构建信息
│   ├── http/                      # Axios Client 与统一 HttpError
│   ├── indexed-db/                # IndexedDB/Memory Key-Value 抽象
│   ├── low-code/                  # G6 逻辑编辑器与 Blockly 代码生成
│   ├── monitoring/                # 性能采集、Frame Monitor、Reporter
│   ├── openlayers-gis-demo/       # GIS 领域、地图、持久化、空间分析
│   ├── react-vue-migration-demo/  # React Shell 加载 Vue 模块实验
│   ├── shared/                    # framework-agnostic 小工具
│   ├── types/                     # 跨包基础类型
│   ├── ui/                        # 3 个最小 Vue 通用组件
│   └── websocket/                 # WebSocket Client
├── docs/                          # 规范、参考、设计和实施计划
├── scripts/                       # 构建检查、Docker、提交消息脚本
├── infra/                         # Dockerfile 与 Nginx 配置
├── .github/workflows/             # 部署工作流与一个不会生效的 ci.md
├── .husky/                        # pre-commit、commit-msg
├── AGENTS.md                      # 全仓 AI 执行约束
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── tsconfig.json
```

### 2.1 应用与包职责

| Workspace | 状态 | 真实职责 |
| --- | --- | --- |
| `@white55/web` | 已实现 | Vue 宿主、路由、Playground 展示与各包装配 |
| `@white55/config` | 已实现 | `env`、`buildInfo`；读取 `import.meta.env` |
| `@white55/http` | 部分实现 | Axios 工厂、错误归一化；未实现鉴权、重试、刷新 Token |
| `@white55/indexed-db` | 已实现 | 带 namespace、批处理、Memory 降级的 Key-Value Store |
| `@white55/low-code` | 已实现但复杂 | G6 图编辑、旧协议兼容、流程翻译、Blockly/Page 代码生成 |
| `@white55/monitoring` | 已实现 | 错误监听、Performance 指标、Frame Monitor V2、LoAF |
| `@white55/openlayers-gis-demo` | 已实现 | GIS 领域应用、Pinia、地图、持久化、空间索引与分析 |
| `@white55/react-vue-migration-demo` | 已实现 | React `MemoryRouter` Shell、React→Vue 生命周期桥和 Platform |
| `@white55/shared` | 已实现但很小 | `debounce`、`throttle`、`sleep` |
| `@white55/types` | 已实现但很小 | `Nullable`、`Maybe`、构建和性能类型 |
| `@white55/ui` | 部分实现 | `AppLoading`、`AppError`、`EmptyState` |
| `@white55/websocket` | 部分实现 | 连接、发送、事件、有限次数定时重连 |

源码规模（审计时按源码文件和常见代码扩展名粗略统计）显示复杂度主要集中于：`low-code` 约 25k 行、GIS 约 12k 行、Web 应用约 11k 行。该统计用于相对规模判断，不是质量指标。

## 03. Monorepo 与依赖架构

### 3.1 Workspace 组织

`pnpm-workspace.yaml` 只包含：

```yaml
packages:
  - apps/*
  - packages/*
```

没有 Turborepo、Nx、Changesets 或 Rush。任务编排由根 `package.json` 的 `pnpm --filter` 串联完成。

### 3.2 实际依赖方向

```text
@white55/web
├── @white55/config ──(源码实际导入)──> @white55/types
├── @white55/http ──> axios
├── @white55/websocket ──> Browser WebSocket
├── @white55/monitoring
├── @white55/low-code ──> G6 + Blockly + Vue/Element Plus peers
├── @white55/openlayers-gis-demo ──> @white55/indexed-db + OpenLayers
├── @white55/react-vue-migration-demo ──> React + Vue peer + mitt
└── @white55/ui ──> Vue peer
```

应用依赖公共包，公共包没有反向依赖 `apps/web`。从 manifest 图看未发现 Workspace 循环依赖。

### 3.3 依赖边界问题

1. **未声明 Workspace 依赖（高优先级）**：`packages/config/src/index.ts` 导入 `@white55/types`，但 `packages/config/package.json` 没有 dependencies。当前由根/应用 `tsconfig.paths` 掩盖，独立消费会失败。
2. **展示型内部源码耦合（中优先级）**：`apps/web/src/data/projects.ts` 通过相对路径和 `?raw` 读取 `packages/react-vue-migration-demo/src/**` 内部文件，用于源码面板。运行 API 仍走包根，但展示层破坏了“包可任意移动/独立发布”的假设。
3. **源码即入口**：所有包的 `main/types` 多数直接指向 `src/index.ts`，没有 `exports`、构建产物或 `files` 白名单。适合单仓开发，不具备独立 npm 分发边界。
4. **Workspace 范围协议不统一**：同一个应用对内部包混用 `workspace:*`、`workspace:^`、`workspace:2.0.0`，未来发布替换策略需统一。
5. **直接依赖版本精确，传递依赖仍多版本**：只读 `pnpm list -r --depth Infinity --json` 观察到 137 个多版本依赖名，例如 Vue compiler `3.5.13/3.5.43`、Babel `7.26.7/7.29.7`。多数来自不同工具链/旧 G6/测试生态，不能仅凭多版本认定错误，但应对 bundle 和安全更新做专项治理。
6. **Vite 有专门统一检查**：根 `pnpm.overrides.vite` 固定 `6.0.11`，`scripts/check-vite-version.mjs` 同时检查声明和实际解析树。

### 3.4 公共入口与内部引用

- `indexed-db`、`low-code`、`monitoring`、GIS、React→Vue、UI、HTTP、WebSocket 均有 `src/index.ts` 公共入口。
- GIS 公共入口导出领域协议而不暴露 OpenLayers `Feature`，边界设计较成熟：`packages/openlayers-gis-demo/src/index.ts`。
- `low-code` 公共入口有 `src/index.ts` 与手写 `src/public.d.ts` 两套描述，未来可能发生声明漂移。
- 未发现业务源码通过 `@white55/pkg/src/...` 导入内部模块；已知例外是 Web 源码展示的相对 `packages/.../src` 读取。
- 浏览器运行时代码未发现误导入 Node 内建模块；`node:*` 只出现在构建配置和 Node 测试中。

## 04. 应用启动与运行链路

### 4.1 启动链路

真实启动链路如下：

1. Vite 或 Webpack 都以 `apps/web/src/main.ts` 为入口。
2. `main.ts` 调用 `createApp(App)` 创建 Vue 应用。
3. 调用 `startMonitoring()`：`packages/monitoring/src/index.ts` 注册 `window.error` 与 `unhandledrejection`，默认使用 `ConsoleReporter`。
4. 创建并注册 Pinia：`app.use(createPinia())`。
5. 注册 Router：`app.use(router)`。
6. 挂载到 `#app`：`mount('#app')`。
7. 浏览器环境下用 `setTimeout(..., 0)` 延后调用 `monitoring.collect()`，采集 Navigation/Resource 等性能指标。
8. 根组件 `apps/web/src/app/App.vue` 根据路由控制普通/Playground/全屏壳层，并渲染 `<RouterView />`。
9. Router 使用 `createWebHashHistory()`；所有主要页面组件通过动态 `import()` 懒加载。

启动链路中没有：应用级异步 bootstrap、认证恢复、远程配置加载、全局错误边界组件、Router Guard 或服务端 Hydration。

### 4.2 路由与页面注册

- `/`：首页，懒加载 `HomePage.tsx`。
- `/playground`：Playground 壳层并重定向到 GIS。
- 子路由覆盖 solutions、engineering、performance、browser 四类。
- 兼容旧路径的 redirect 仍存在，例如 `/playground/low-code`。
- `/:pathMatch(.*)*` 指向 `NotFoundPage.vue`。
- 未发现 `beforeEach/afterEach`，因此不存在路由鉴权或埋点守卫。

### 4.3 插件和全局能力

- Pinia 与 Router 是唯一通过 `app.use` 注册的全局插件。
- Element Plus 没有全量 `app.use(ElementPlus)`，但 Web 入口全局导入了 `element-plus/dist/index.css`；低代码按组件导入运行能力。
- `appHttp` 与 `appWebSocket` 在 `apps/web/src/app/services/**` 预装配，但全仓未发现实际业务调用；它们属于已实现基础设施、尚未接入业务。
- `@white55/config` 在模块求值时从 `import.meta.env` 生成配置，不是运行时远程配置。

## 05. 现有业务模块与关键实现

### 5.1 业务模块总览

| 模块 | 实现状态 | 主要证据 |
| --- | --- | --- |
| 城市巡检 GIS | 已实现，最完整业务域 | `packages/openlayers-gis-demo/src/**` |
| 低代码逻辑编辑器 | 已实现，带旧协议迁移负担 | `packages/low-code/src/**` |
| React→Vue 渐进迁移 | 已实现并有集成测试 | `packages/react-vue-migration-demo/src/**` |
| Frame Monitor / 性能面板 | 已实现 | `packages/monitoring/src/performance/**`、Web 性能组件 |
| Advanced Image Loader | 已实现实验 | `apps/web/src/components/advanced-image-loader/**` |
| 协作式任务调度 | 已实现实验 | `apps/web/src/components/task-scheduler/**` |
| 设备性能探针 | 已实现实验 | `apps/web/src/components/test-ua/test-ua.js` |
| 文本标注 | 已实现实验 | `apps/web/src/components/text-labeling/**` |

### 5.2 代表性业务链路：GIS 视口查询与 UI 更新

选择 GIS 是因为它同时覆盖 UI、状态、异步服务、竞态控制、缓存、地图对象和持久化。

真实链路：

1. 路由懒加载 `PlaygroundGisPage.vue`，页面从 `@white55/config` 取天地图 Token，并渲染包根导出的 `GisManagementDemo`。
2. `GisManagementDemo.vue` 创建 `useGisStore()`、`LocalGisApi`、`MapManager`、`ViewportQueryController` 和 `SpatialAnalysisController`。
3. `LocalGisApi.create(scale)` 创建 `GisDatasetRepository`；Repository 通过 `@white55/indexed-db.createKeyValueStore()` 打开按数据量级隔离的 namespace。
4. IndexedDB 不可用/打开失败时，`ResilientKeyValueStore` 切换到 Memory Adapter，并通过 state 暴露“刷新后丢失”语义；UI 在 `GisWorkspaceHeader.vue` 展示提示。
5. `MapManager.mount()` 将唯一 OpenLayers Map 绑定 DOM，监听 `moveend`，把当前 WGS84 BBOX 交给页面。
6. 页面调用 `ViewportQueryController.query()`。Controller 先 abort 旧请求、递增 requestId、发出 loading 状态，再调用注入的 Service。
7. `LocalGisApi.queryViewport()` 委托 `MockViewportEventService`。该服务使用空间网格索引和有容量上限的缓存，结果包含 `cacheHit`、查询耗时和 datasetVersion。
8. Controller 只提交“最新 requestId 且 datasetVersion 与预期相同”的结果，避免旧请求覆盖新视口。
9. 页面 `handleViewportQueryState()` 使用 `mergeViewportQueryState()` 保留仍有效的选择、区域筛选和页码，再调用 Pinia Store 的 `replaceViewportEvents()`。
10. 页面把新业务事件同步到 `MapManager.syncEvents()`；地图层按业务 ID 做 Feature diff，保持未变化 Feature 身份，并通知选择失效。
11. Pinia `computed` 驱动列表、统计和详情 UI；OpenLayers 对象不进入 Store，避免不可序列化运行对象污染业务状态。

该链路当前是本地模拟 API，不是 HTTP 后端。`GisApi` 接口和 `LocalGisApi` 分层为未来远程 Adapter 留出了替换点，但仓库中未发现 `HttpGisApi`。

### 5.3 GIS 用户操作示例：分派事件

1. 用户在 `GisManagementDemo.vue` 选择事件并输入责任人。
2. `assignSelectedEvent()` 先调用 `gisApi.setAssignee()`，由 Repository 持久化详情。
3. 持久化成功后调用 Pinia Store `assignEvent()`，更新 `eventAssignees` 并追加 `ASSIGNED` 活动。
4. 若当前责任人筛选会把该事件排除，页面清空选择并同步可见事件到地图。
5. Vue 响应式状态更新事件列表、详情和工作量统计；地图 Source 只接收必要的可见数据变化。

这是“先持久化、后提交 UI Store”的明确业务顺序；失败只提示，不提交内存业务状态。

### 5.4 低代码链路摘要

- 宿主页 `PlaygroundLowCodePage.vue` 创建 compatibility context、方法和数据集合。
- `LogicEditor` 在 G6 上维护方法列表、方法详情和变量列表三类 GraphData。
- 保存时，各 Method 自己的详情图进入 `LogicEditorService`，翻译为 `SimpleProcessData[]` 和 `blockData`。
- Blockly Code Generator 再把已提交 `blockData` 转为方法/页面代码；宿主页不会把方法列表图误当详情图。
- 完整快照、方法、变量、生命周期绑定和翻译产物写入 `localStorage`，支持显式恢复。
- 权威行为基线：`docs/references/logic-editor-original-implementation.md`。

### 5.5 React→Vue 迁移链路摘要

`VueMigrationDemo.vue`（Vue 宿主适配）→ 挂载 React Root → `ReactMigrationDemo.tsx`（`MemoryRouter`）→ Feature Flag 选择 React 旧实现或 `ReactLoadVueOrder` → `createBridgeLifecycle` → `mountVueOrder()` → Vue `createApp(VueOrderHost)`。

- Props 更新通过 `Object.assign(reactiveProps)`，不会反复重建 Vue App。
- Vue 事件经 bootstrap/Bridge 回传 React。
- Router 操作通过 `MigrationPlatform` 委托 React Router。
- mitt EventBus 保持框架无关。
- React Shell 使用 MemoryRouter，不接管外层 Vue Router History。

## 06. 已有前端基础设施

### 6.1 能力状态矩阵

| 类别 | 子项 | 状态 | 证据与说明 |
| --- | --- | --- | --- |
| SDK | 独立统一 SDK 包 | 未发现 | 没有名为 sdk 的包或统一 Client 门面 |
| SDK | HTTP 工厂/Class | 部分实现 | `createHttpClient()` 返回 AxiosInstance；无鉴权/重试/插件 |
| SDK | WebSocket Class | 部分实现 | `WebSocketClient` 有状态、事件、重连；协议为字符串事件名 |
| SDK | 生命周期管理 | 部分实现 | WebSocket `connect/close`、Monitoring `start/stop`、Store `close` |
| SDK | 请求拦截/鉴权 | 部分实现/未发现 | HTTP 有空 request interceptor 和 error interceptor；无鉴权 |
| SDK | 事件系统 | 已实现于局部 | WebSocket listeners、mitt migration EventBus、low-code dispatcher |
| SDK | 插件机制 | 未发现 | 无统一 `use(plugin)`、Hook pipeline 或能力注册协议 |
| SDK | 跨框架支持 | 部分实现 | HTTP/WS/IndexedDB/Monitoring 框架无关；未形成统一 SDK |
| SDK | 独立发布 | 未发现 | 包均 private，源码入口，无发布配置 |
| CLI | `bin`、可执行入口 | 未发现 | 所有 manifest 均无 `bin` |
| CLI | 模板/初始化/交互命令 | 未发现 | 没有模板目录、命令解析或 prompts 依赖 |
| CLI | 更新/迁移/独立发布 | 未发现 | 无实现 |
| 组件库 | 公共组件 | 部分实现 | `@white55/ui` 仅 3 个基础组件 |
| 组件库 | Props/Slots | 部分实现 | 组件有运行时 Props；`EmptyState` 有默认 slot |
| 组件库 | Emits/受控协议 | 未形成 | UI 包无规范化 Emits 或 v-model 组件 |
| 组件库 | 样式隔离 | 已实现基础 | SFC scoped styles |
| 组件库 | 主题/Token | 未发现 | 无 CSS Variables Token、主题 Provider |
| 组件库 | 类型导出 | 部分实现 | 组件默认导出；无独立 Props 类型 |
| 组件库 | 文档/Storybook | 未发现 | 无组件站点或 Storybook |
| 组件库 | 独立构建/按需发布 | 未发现 | 源码入口、private |
| 工具链 | Monorepo | 已实现 | pnpm Workspace + filter scripts |
| 工具链 | 双构建 | 已配置 | Vite 默认，Webpack 5 保留 |
| 工具链 | 静态检查 | 已实现 | ESLint、TypeScript、Stylelint 配置；根脚本未单独提供 stylelint 命令 |
| 工具链 | Git Hooks | 已实现 | pre-commit lint-staged；commit-msg 只警告 |
| 工具链 | CI/CD | 部分实现 | GitHub Pages 部署有效；完整 CI 文件扩展名错误 |
| 工具链 | 发布/回滚 | 未发现 | 无 Changesets、tag、registry、回滚流程 |
| 性能 | Frame Monitor | 已实现 | rAF、p95、目标预算、可注入 Runtime、LoAF |
| 性能 | 图片加载 | 已实现实验 | scheduler、并发/取消、Canvas/ImageBitmap、缓存 |
| 性能 | 虚拟列表 | 未发现 | 未发现虚拟滚动实现 |
| 性能 | 调度器 | 已实现实验 | task scheduler 与 React scheduler 图片加载实验 |
| 性能 | 大数据渲染 | 已实现 GIS 场景 | 视口查询、空间网格索引、Cluster、Feature diff |
| 性能 | Worker | 仅配置预留 | Vite 有 worker 输出配置，未发现业务 Worker 文件 |
| 性能 | 内存管理 | 部分实现 | 显式 destroy/abort/revokeObjectURL/有界缓存；无统一内存观测 |
| 性能 | 分包 | 已配置 | 路由懒加载，Vite framework manual chunk，Webpack splitChunks |
| 性能 | 缓存 | 已实现多处 | IndexedDB、LRU 查询缓存、样式缓存、Webpack FS cache |
| AI | AGENTS 分层规则 | 已实现 | 根、应用、packages、多个包、docs 均有规则 |
| AI | Prompt/过程记录 | 已实现但分散 | `项目开发prompt.md`、`.superpowers/sdd/**`、plans/specs |
| AI | Codex 项目配置 | 未发现 | 仓库内无 `.codex/**` |
| AI | Skills 目录 | 未发现 | 仓库内无专用 Skills 包 |
| AI | 安全边界 | 已实现规则 | 安装、测试、浏览器、Webpack、敏感信息均有限制 |
| AI | 自动验收 | 部分实现 | 有 lint/typecheck/build/test 命令，但 CI 未全部启用 |

## 07. 工程化、测试、构建与发布

### 7.1 npm scripts 执行关系

```text
dev -> dev:vite -> @white55/web dev:vite
build -> build:vite -> check:vite -> @white55/web build:vite
typecheck -> @white55/web typecheck -> @white55/low-code typecheck
check:config -> check:vite -> web tsconfig.config -> react-vue package typecheck
check:editor -> check:config -> typecheck -> lint
lint -> lint:script -> eslint .
test:monitoring -> @white55/monitoring test
test:e2e -> @white55/web e2e -> Playwright（自动启动 Vite）
```

注意：根 `typecheck` 没有覆盖 indexed-db、GIS、React→Vue 的包级 typecheck；根测试也没有聚合 GIS、React→Vue 和 low-code 测试。

### 7.2 Vite

- 分层：`vite.config.ts` + `build/vite/{common,development,production}.ts`。
- Vue SFC、Vue JSX；专用 pre-plugin 把 React 迁移包 TSX 编译为 React automatic JSX runtime。
- 路由/源码展示依赖 `?raw`。
- 生产启用 Legacy 插件和可选 visualizer。
- 输出 `dist-vite`，生成 manifest、CSS 分割、framework manual chunk。
- `VITE_BASE_PATH` 控制部署 base；`loadEnv(..., 'VITE_')` 限制公开前缀。
- 配置了 Worker 输出，但仓库未发现实际 Worker 实现。

### 7.3 Webpack 5

- 真实入口同样是 `apps/web/src/main.ts`，符合“双管线共享源码”。
- 配置 Vue Loader、Babel TypeScript/Vue JSX、CSS/Sass/PostCSS、资源模块、FS cache。
- 生产使用 Terser、CSS Minimizer、MiniCssExtract、splitChunks；可选 Bundle Analyzer。
- 默认被仓库规则关闭，本审计未执行。
- 风险：Webpack TSX loader 使用 Vue JSX 插件处理全部 TSX，没有看到与 Vite 等价的 React 迁移包定向 React JSX 规则；两条管线对 React TSX 的等价性无法确认。

### 7.4 测试现状

| 区域 | 文件数 | 框架/环境 | 根门禁覆盖 |
| --- | ---: | --- | --- |
| Web E2E | 3 | Playwright Chromium | 有脚本，但 CI 未执行 |
| low-code | 3 | `node:test`/类型测试文件 | 无 package test script，根不执行 |
| monitoring | 4 | Vitest Node | 根仅有 `test:monitoring` |
| GIS | 10 | Vitest Node | 包有 test，根不聚合 |
| React→Vue | 8 | Vitest jsdom | 包有 test，根不聚合 |

Monitoring 单独配置 V8 coverage，阈值 statements/lines 95%、branches 90%、functions 100%。其他包未发现覆盖率阈值。

### 7.5 CI/CD 与 Docker

- 有效 GitHub Actions：`.github/workflows/deploy02.yml`，在目标分支 push/手动触发时安装冻结锁文件、执行 Vite build，并部署 `dist-vite` 到 `static-pages`。
- 该部署工作流的 typecheck 被注释，Lint 和测试也未执行。
- `.github/workflows/ci.md` 内容像 CI YAML，但扩展名为 `.md`，GitHub Actions 不会识别；其 YAML 缩进看起来也不合法。
- Dockerfile 固定 Node `22.14.0-alpine`、pnpm `9.15.5`、Nginx `1.27.3-alpine`，runtime/ci 都只执行 Vite build。
- `docs/specifications/docker-ci.md` 声称 CI 目标执行 Vite 和 Webpack，但真实 `infra/Dockerfile` 只执行 `pnpm build:vite`，文档与实现不一致。
- Nginx 使用 `try_files ... /index.html`，但应用实际是 Hash Router；该回退无害但不是 Hash Router 必需条件。

### 7.6 发布现状

当前没有 npm 发布体系：

- 所有包 `private: true`。
- 无 `bin`、`publishConfig`、`files`、`exports`、license/repository 元数据。
- 无 library mode 包构建、类型声明产物、语义版本自动化、Changesets、tag/release workflow。
- GitHub Pages 部署仅发布 Web 静态站点，不发布 Workspace 包。

### 7.7 本次实际检查记录

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `git status --short --branch` | 成功 | 写报告前工作树干净，分支 ahead 19 |
| `git diff --check` | 成功 | 写报告前无 diff whitespace 错误 |
| `pnpm lint` | 成功 | ESLint 无输出错误 |
| `pnpm check:vite` | 成功 | 实际解析 Vite 统一为 `6.0.11` |
| `pnpm typecheck` | 失败 | `PlaygroundAdvancedImagePage.vue:110` 将不含 `metrics` 的联合类型与 `metrics` 比较；low-code 阶段未执行 |
| 单元测试 | 跳过 | 仓库要求非页面测试先询问；本任务未取得本任务范围授权 |
| Playwright | 跳过 | 会启动页面，且未取得 `允许自动启动页面测试` |
| Vite build | 本次跳过 | 会生成/清理 `dist-vite`，违反本次“只生成报告”要求 |
| Webpack build/benchmark | 跳过 | 用户未明确授权，且规则默认禁止 |
| Docker | 跳过 | 可能拉镜像、安装、构建并生成状态 |

用户在本审计前提供过一次 `pnpm build:vite` 成功日志（3373 modules，约 18 秒），同时有 Legacy target、React Router `use client`、low-code `eval` 和大 chunk 警告。该记录是用户提供的环境结果，不是本次审计执行结果。

## 08. AI 工程化与 AGENTS 约束

### 8.1 已有能力

- 根 `AGENTS.md` 定义目录边界、精确版本、双构建、禁止 CSS Grid、测试授权、浏览器授权、注释语义和错误扩展范围。
- `apps/web/AGENTS.md` 建立 runtime、低代码、性能监控文档路由。
- `packages/AGENTS.md` 定义公共入口和依赖方向；IndexedDB、low-code、monitoring、React→Vue 有专属规则。
- `docs/AGENTS.md` 区分 specification/reference/spec/plan，禁止无目的通读文档。
- `.superpowers/sdd/**` 保存若干阶段的任务 brief、progress、review diff 和测试日志，具备过程可追溯性。
- 根有 Prompt 和 AGENTS 路由测试文档；VS Code 配置也存在。

### 8.2 后续 AI 必须遵守的关键边界

1. 开始分析/修改前，主动查找从根到目标目录的全部 `AGENTS.md` 并向用户报告。
2. 未收到当前任务精确口令 `允许添加测试代码`，不得新增或修改测试。
3. 未收到当前页面测试范围的精确口令 `允许自动启动页面测试`，不得自动启动页面或操作浏览器。
4. 非页面测试自动执行也必须先询问。
5. 默认只允许 Vite；不得执行 Webpack dev/build/analyze/benchmark，除非当前请求明确要求。
6. 自有前端样式禁止 CSS Grid；触碰旧 Grid 区域时必须迁移为 Flexbox。
7. 不得自动安装依赖；必须先给出命令并等待确认。
8. 发现任务外错误要先报告并询问，不能扩大范围。
9. 复杂逻辑、协议成员、坐标/时间/比例/容量/offset 必须有简体中文语义注释。
10. `.env` 真值、Token 和敏感配置不得输出。

### 8.3 缺口

- 规则没有机器可执行的统一审计器，依赖 AI 自觉读取。
- 根规则“当前只建立骨架”已与真实实现冲突，容易误导新 AI。
- 部分文档仍保留旧 `@blog/*` 历史名称；历史计划可以保留，但当前规范应保持一致。
- 没有仓库内 `.codex`/Skills 作为可复用自动化能力。
- CI 没有落实 AGENTS 中的完整门禁：类型检查、Lint、单测、E2E 均未成为有效必跑工作流。

## 09. 技术债务与架构风险

| 优先级 | 风险 | 证据 | 影响 | 建议（不在本次实施） |
| --- | --- | --- | --- | --- |
| P0 | Typecheck 当前失败 | `PlaygroundAdvancedImagePage.vue:110` | 根类型门禁不可用；CI 也注释了 typecheck | 单独修复 tabs 联合类型/模板分支并恢复 CI typecheck |
| P0 | 有效 CI 不跑类型、Lint、单测 | `deploy02.yml` | 回归可直接部署 | 建立真实 `ci.yml`，部署依赖 CI 成功 |
| P1 | config 未声明 types 依赖 | `config/src/index.ts` vs manifest | 独立消费/发布失败 | 增加精确 Workspace dependency，并补包级边界检查 |
| P1 | 根 typecheck/test 覆盖不完整 | 根 scripts | 公共包回归不被主门禁发现 | 建立 `check:packages`/递归任务，显式排除 soak |
| P1 | 包无独立构建发布契约 | 所有 package manifests | 无法成为 SDK/CLI/UI 产品 | 设计 exports、types、dist、files、sideEffects、版本策略 |
| P1 | Webpack 与 React TSX 规则疑似不等价 | Vite 专用 React transform，Webpack 只有 Vue JSX Babel | 第二管线可能无法正确运行迁移 Demo | 获授权后做配置级验证，补 React TSX include/exclude |
| P1 | 文档与实现漂移 | engineering foundation、docker-ci、Vite 介绍 | AI/开发者形成错误判断 | 将“当前规范”与“历史阶段文档”明确分开并更新现行规范 |
| P1 | 大 bundle 与 low-code `eval` 警告 | 用户提供 Vite build 日志 | 性能、安全审查和 CSP 风险 | 对 G6/Blockly/GIS 分包；评估去 eval 或隔离迁移区 |
| P2 | Web 源码展示跨包内部路径 | `apps/web/src/data/projects.ts` | 包移动/独立构建困难 | 由包导出 demo source manifest，或构建时生成安全快照 |
| P2 | `public.d.ts` 与源码导出双轨 | low-code、React→Vue | 声明可能漂移 | 用构建器从源码生成 `.d.ts`，减少手写镜像 |
| P2 | HTTP/WS 服务已装配但无业务调用 | `apps/web/src/app/services/**` | 容易被误报为已落地后端架构 | 文档标为基础设施；真实后端接入时再增加 auth/retry |
| P2 | WebSocket `close()` 永久修改 reconnect | `packages/websocket/src/client.ts` | 关闭后同实例无法重新启用自动重连 | 明确一次性生命周期或重构用户关闭/网络断开语义 |
| P2 | UI 包缺乏设计系统能力 | `packages/ui/**` | 不足以支撑组件库项目 | 先定义 token、Props/Emits、可访问性和构建协议 |
| P2 | Stylelint 忽略整个 Web components | `stylelint.config.mjs` | 大量组件样式不受门禁保护 | 缩小迁移豁免范围，新增 CSS Grid 机器检查 |
| P2 | tracked 垃圾/机器状态 | `.DS_Store`、`.pnpm-store/v11/index.db`、`test-results/.last-run.json` | 仓库噪声、平台耦合 | 另行清理并完善 `.gitignore`，勿混入功能提交 |
| P3 | Conventional Commits 不阻断 | `check-commit-message.mjs` | 版本自动化前提交语义不可靠 | 引入 release 流程时改为阻断或 Changesets 驱动 |

### 9.1 安全与隐私观察

- `.gitignore` 正确忽略真实 `.env` 并保留 `.env.example`。
- GitHub Actions 通过 Secret 注入 `VITE_TIANDITU_TOKEN`。
- 浏览器 Token 进入前端 bundle 后无法成为真正秘密；应限制域名/配额，文档不能把它描述成服务端密钥。
- low-code 迁移区存在 `eval`，用户提供的构建日志已报警；需结合旧协议兼容性专项评估，不能在普通清理任务中直接删除。

## 10. SDK / CLI / 组件库扩展建议

以下为架构建议，不代表仓库已实现。

### 10.1 是否沿用现有 Monorepo

建议沿用。当前已有明确 `apps/`/`packages/` 边界、pnpm Workspace、精确版本规则、公共入口约束和可运行 Showcase。SDK、CLI、UI 都可以在一个仓库共享类型、测试基础设施和演示应用，但必须建立独立构建和发布边界，不能继续仅靠源码入口。

### 10.2 推荐新增包

```text
packages/
├── sdk/                  # @white55/sdk：统一公开门面与插件/生命周期
├── sdk-core/             # 可选：完全 framework-agnostic 内核
├── cli/                  # create-white55-app 或独立 unscoped CLI 包
├── ui/                   # 现有包演进，不另造重复 UI 包
├── eslint-config/        # 共享 ESLint Flat Config
├── tsconfig/             # 共享 TS 配置预设
├── build-config/         # 可选：库构建公共函数，不承载业务
└── test-utils/           # 仅在真实重复出现后创建
```

### 10.3 SDK 边界

- 复用：`@white55/http` 的错误归一化、`@white55/websocket` 的连接能力、`@white55/monitoring` 的 Reporter/Frame Monitor、`@white55/types` 的基础类型。
- 不重复封装：IndexedDB 继续是独立存储能力；GIS/low-code 领域不能进入通用 SDK。
- 新增 SDK 应定义：实例生命周期、配置快照、插件 Hook、事件类型、transport 接口、鉴权注入点、错误分类、AbortSignal。
- SDK Core 不依赖 Vue、Pinia、Element Plus；Vue 适配若需要，另建 `sdk-vue`，不要污染核心。
- 首次就建立独立 `dist`、ESM（是否 CJS 由目标决定）、`.d.ts`、exports map、sideEffects、API 文档和包级测试。

### 10.4 CLI 边界

- CLI 必须与 SDK/UI 完全解耦，只在模板中选择依赖它们。
- Node 运行时与浏览器包分离；CLI 包可以依赖 Node 内建模块，不能反向被浏览器包依赖。
- 建议命令层、文件系统层、模板渲染层、包管理器 Adapter 分层。
- 模板放独立可版本化目录或包；初始化必须支持 dry-run、冲突检测、非交互参数和可测试文件系统。
- 发布名若为 `create-company-app`，需确认 npm 命名/组织策略；当前仓库没有 registry 或发布凭据设计。

### 10.5 UI 组件库边界

- 在现有 `@white55/ui` 演进，避免再造第二套通用组件目录。
- 首先建立 Design Token、CSS Variables、无 Grid 布局约束、可访问性规范、Props/Emits/Slots 类型导出。
- 组件库不得依赖应用、GIS、low-code；Element Plus 是选择性 peer 还是完全不依赖，需要先决策。
- 需要独立 library build、按需入口、样式入口、类型声明、组件文档和视觉/交互验收。

### 10.6 推荐依赖方向

```text
apps/web
├── sdk-vue? ──> sdk ──> http / websocket / monitoring / types
├── ui ──> Vue peer + tokens
├── GIS ──> indexed-db + OpenLayers + Vue/Pinia peers
├── low-code ──> G6/Blockly + Vue peer
└── migration-demo ──> React/Vue peers

cli ──> templates/manifest/build metadata
cli -X-> sdk runtime
sdk -X-> Vue/Pinia/UI/feature packages
ui  -X-> apps/web/feature packages
```

### 10.7 独立构建与发布

1. 先定义统一 package contract，而不是先取消 `private`。
2. 为发布包生成 `dist/index.js`、`dist/index.d.ts`，禁止 npm 包入口指向 `src`。
3. 为每个包定义 `exports`（root/subpath）、`files`、`sideEffects`、engines、license、repository。
4. 使用 Changesets 或等价机制管理独立版本和变更说明。
5. CI 顺序：install frozen → lint/typecheck/test → package build → pack smoke test → Web 集成 → 经批准 publish。
6. `npm pack --dry-run`/临时消费项目验证包边界；发布凭据只存在 CI Secret。
7. Web 继续通过 Workspace 消费待发布包，作为真实集成样板。

### 10.8 如何不破坏现有博客

- 新能力先在独立 package 完成，不直接改宿主页核心。
- 通过新的 lazy route 接入实验页，避免增加首屏 bundle。
- 保持 Pinia Store 和业务 Feature 局部化，不将实验状态放全局。
- Vite 是唯一常规门禁；Webpack 只在明确兼容任务中验证。
- 每个新增包先通过 package test/typecheck/build，再接 Web。
- 使用 Feature Flag 或独立路由隔离未稳定实验，不改现有默认 GIS 跳转。

## 11. 后续从 0 到 1 实战路线

### Phase 0：修复门禁与包契约基线

- 修复当前 Typecheck 错误。
- 建立真实 `ci.yml`，纳入 lint、全包 typecheck、单测和 Vite build。
- 补 `config -> types` 依赖声明。
- 建立 `@white55/tsconfig`、`@white55/eslint-config` 或等价共享配置。
- 定义“内部源码包”与“可发布包”的 manifest 模板。

验收：干净 clone 的冻结安装后，所有非页面门禁可单命令运行；不执行 Webpack 默认门禁。

### Phase 1：企业级 TypeScript SDK

- 以 `http/websocket/monitoring` 为复用基础，建立 SDK Core。
- 实现 config、transport、plugin、event、lifecycle、error、AbortSignal 协议。
- 提供 Fake Transport 和确定性测试。
- 建立第一个独立 library build 与 pack smoke test，作为后续包模板。

### Phase 2：Node.js CLI 脚手架

- 建立独立 CLI 包、`bin`、命令解析、dry-run、冲突策略。
- 模板至少覆盖 Vue app、SDK consumer、UI consumer。
- 使用临时目录做端到端生成测试；安装步骤需可注入/跳过。

### Phase 3：Vue 3 组件库

- 先建立 token、主题、公共类型、可访问性和样式策略。
- 将现有 Loading/Error/EmptyState 迁移为规范样板。
- 增加少量高价值受控组件，展示 v-model、Slots、Emits 和表单边界。
- 建立独立文档/示例，不把 Playground 当唯一组件文档。

### Phase 4：工程工具链与发布体系

- Changesets、release workflow、provenance/registry、回滚文档。
- API Extractor 或等价公开 API 审查。
- 包图循环依赖和 undeclared dependency 检查。
- 把 Vite/库构建职责分开，不用 Web 应用 Vite 配置硬套 SDK/UI。

### Phase 5：性能和底层机制实验深化

- 对现有大 chunk 做可复现实验和预算门禁。
- 增加 Worker 实验时使用真实 Worker，而不是只保留配置。
- 将 GIS 十万级数据、Frame Monitor、图片调度形成统一性能实验方法论：基线、指标、干预、结果、限制。

### Phase 6：AI 工程化与质量保障

- 更新根 AGENTS 的实际阶段。
- 为 package scaffolding、审计、release 建立仓库内 Skills/脚本。
- 将“AI 修改清单”映射成可执行检查，但保留人工协议审查。
- 记录每次 AI 任务的输入、证据、命令、结果和未确认事项。

## 12. 面试项目价值

### 12.1 可以诚实作为已有经验展示

- pnpm Monorepo 与应用/能力包边界。
- Vite 主构建和 Webpack 5 第二管线配置设计。
- Vue Router 懒加载、Pinia 局部状态、公共服务装配。
- GIS 中的 OpenLayers 生命周期、业务对象与 Feature 解耦、空间网格、视口竞态、IndexedDB 降级、持久化和空间分析。
- G6 低代码编辑器迁移、图协议、翻译链、Blockly 代码生成和旧系统兼容治理。
- React Shell 渐进加载 Vue 模块的 mount/update/unmount、Props/Events/Platform/EventBus 边界。
- Frame Monitor 的可注入 Runtime、目标预算、LoAF、可见性和确定性测试设计。
- 浏览器性能、图片调度、文本 Range/offset 持久化等实验。
- 分层 AGENTS、严格授权与专题文档路由等 AI 辅助研发约束。

### 12.2 只能说“部分具备”，不能包装成完整产品

- `@white55/http`/WebSocket/Monitoring 是 SDK 基础能力，不是完整企业 SDK。
- `@white55/ui` 是基础组件集合，不是成熟组件库。
- 双构建有配置，但本次未验证 Webpack，且存在 React TSX 等价性疑问。
- 有测试文件不等于主 CI 已覆盖；当前有效 CI 未跑测试。
- 有 Dockerfile 不等于已建立镜像发布、扫描和回滚体系。

### 12.3 仍属于未来规划，不能算已有经验

- 可发布的企业 TypeScript SDK。
- 可执行并发布的 Node CLI 脚手架。
- 有主题、文档、按需构建和版本治理的组件库。
- 完整 npm release/rollback/Changesets 流程。
- Worker、SSR/SSG、PWA、Module Federation；它们仅在 TODO/配置位中出现。

## 13. 未确认事项

1. 未执行任何单元测试，因此不能声称测试通过。
2. 未启动页面或 Playwright，无法确认当前交互和视觉回归。
3. 未执行 Vite build；只有用户提供的先前成功日志。
4. 未执行 Webpack，无法确认第二管线当前可用，尤其 React TSX 转换。
5. 未执行 Docker，无法确认当前机器的 Docker、网络和镜像构建。
6. 未访问远程 GitHub，无法确认 Actions 最近运行状态、Pages 状态或 Secrets 配置。
7. 未读取 `.env.local` 值，无法确认 Token 可用性；只记录变量名。
8. 未连接真实后端；HTTP/WebSocket 客户端没有业务调用证据。
9. 未做浏览器 bundle profile；多版本依赖和大 chunk 的实际归因仍需专项分析。
10. 未做许可证、安全漏洞、供应链和 secret scanning；这需要专门工具和可能的网络数据。
11. 未证明所有公开类型与运行时导出一致；low-code 手写声明尤其需要 API diff。
12. 未发现认证/RBAC 实现；无法确认它是否计划在外部后端仓库完成。

## 14. AI 交接摘要

```yaml
repository:
  purpose: "Vue 3 Engineering Showcase / Developer Playground"
  branch: "feature/v2-blog-website"
  package_manager: "pnpm 9.15.5 workspace"
  runtime: "Node 22.14.0"
actual_capabilities:
  app: "Vue 3 + Router + Pinia 宿主，页面懒加载"
  packages:
    - "config/http/websocket/monitoring/shared/types/ui"
    - "IndexedDB + Memory 降级存储"
    - "G6 + Blockly 低代码编辑器"
    - "OpenLayers GIS 业务工作台"
    - "React Shell 渐进加载 Vue 模块"
  build: "Vite 默认；Webpack 5 保留但默认禁止执行"
  tests: "Vitest、node:test、Playwright 文件存在，但主 CI 未完整覆盖"
current_gate:
  lint: "通过"
  vite_version: "通过，6.0.11"
  typecheck: "失败：PlaygroundAdvancedImagePage.vue:110"
  tests: "本次未执行"
  builds: "本次未执行"
must_not_assume:
  - "不存在完整企业 SDK"
  - "不存在 CLI"
  - "UI 包不是成熟组件库"
  - "不存在 npm 发布和回滚体系"
  - "HTTP/WebSocket 已装配但没有业务使用证据"
constraints:
  - "修改前读取并报告适用 AGENTS.md"
  - "安装、测试代码、页面自动化、Webpack 分别需要明确授权"
  - "自有 CSS 禁止 Grid"
  - "依赖版本必须精确"
  - "复杂协议和边界必须有简体中文语义注释"
next_target:
  recommendation: "先以 @white55/sdk 作为第一个可独立构建产品"
  prerequisite: "先恢复 Typecheck/CI，并建立共享 TS/ESLint 与 package build contract"
  reuse: "http、websocket、monitoring、types"
  exclude: "GIS、low-code、Vue UI 不进入 SDK Core"
start_here:
  - "AGENTS.md"
  - "package.json"
  - "apps/web/src/main.ts"
  - "apps/web/src/app/router/index.ts"
  - "packages/*/src/index.ts"
  - "本交接文档的 09、10、11 节"
```

推荐首先实施的产品模块是 `@white55/sdk`：它可以复用仓库已有的 HTTP、WebSocket、Monitoring 和类型能力，同时强制解决独立构建、公开 API、生命周期、插件、测试和发布契约，能够成为后续 CLI 模板与 Web 实验页共同消费的第一条“从源码包到产品包”样板。前置工作必须先修复当前 Typecheck 并建立可靠 CI，不能在红色门禁上直接扩展。
