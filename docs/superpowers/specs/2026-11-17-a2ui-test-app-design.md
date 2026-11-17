# A2UI 测试应用设计

> 日期：2026-11-17
> 状态：待审批
> 仓库：blog-website（分支 `feature/v2-blog-website`）

## 01. 意图与为什么

在现有站点下新增 `/a2ui` 子路径，验证「前端定义协议 → 后端发 JSON → 前端渲染」这条前后端协作链路。当前阶段后端未就绪，用本地假后端 + SSE 模拟。

产物与 `/storybook`、`/ideaone` 平级：独立构建、独立子路径、不进入主站 vue-router。

**为什么现在做**：A2UI 的核心价值在于协议是前后端的契约。如果前端不能独立把协议定义、产物、渲染三层打通，后端接入时就无法判断问题出在哪一层。这一步是把前端的责任边界先钉死。

## 02. 目标与非目标

### 目标

- 前端独立跑通 A2UI 闭环：`createSurface` → `updateComponents` → 渲染 → 用户点击 → action 回传。
- 协议定义（Zod）与 React 实现分离，前者可被任何渲染器或后端消费。
- 产出一份可被 Go 后端 `go:embed` 的 `catalog.json` + `VERSION`。
- 验证 SSE 分片、按行缓冲、版本头核对这些真实链路行为。
- 支持 AI 对话生成不同形态的工作台页面（图表、指标卡、表格等）。

### 非目标

- 不接真实 LLM。mock 阶段不涉及 API key、限流、计费。
- 不实现 CI 推送 `protocol` 分支、不建 submodule。等后端仓库就绪再做。
- 不做多轮对话状态管理。
- 不做鉴权、部署。
- **不做小程序**（2026-11-17 明确排除）。
- **第一版不做地图组件**。

### 反目标

- **把 A2UI 塞进 `apps/web` 的 vue-router**。
- **让 `packages/a2ui-catalog` 依赖 React 或任何 UI 库**。
- **用 CSS Grid 实现布局**（违反根 `AGENTS.md`）。
- **让第三方库的概念泄漏进契约**。

## 03. 约束

### 仓库规则

- 依赖使用精确版本，禁止 `^` / `~` / `latest`。
- Vite 版本必须为 `6.0.11`，`pnpm check:vite` 会校验。
- `.npmrc` 为 `auto-install-peers=false` + `strict-peer-dependencies=true`，所有 peer 依赖必须显式声明。
- 仓库自有前端样式禁用 CSS Grid，布局用 Flexbox。
- 默认只运行 Vite；Webpack 相关命令需明确授权。
- 新增测试代码前必须收到口令 `允许添加测试代码`。
- 提交信息遵循 Conventional Commits。

### A2UI 0.15.0 实际约束（已核验 `.d.ts` 与源码）

- `@a2ui/react` 0.15.0 的包根 `@a2ui/react` 是 **version-agnostic 渲染器运行时**（自 0.13.0 起），v0.8 / v0.9 降为次级入口；npm `exports` 为 `.` / `./v0_8` / `./v0_9` / `./styles`，**没有 `./v1_0`**。v1.0 的入口就是包根，不是子路径。
- `@a2ui/react` 的 chunk 只 `import from '@a2ui/web_core/v0_9'` / `v0_9/basic_catalog` / `v0_9/universal`，说明其**类型与工具链仍绑在 v0.9**；对 v1.0 是运行时可消费，不是类型级一等支持。
- v1.0 在 `@a2ui/web_core` 中**是完整的**：`exports` 含 `./v1_0` 与 `./catalogs/basic/v1`，`MessageProcessor` 的 `VersionAdapterFactory` 注册了 `V1Point0Adapter`，v1 basic catalog 同样 18 个组件。
- `basicCatalog` 的组件是 `WebComponentImplementation`（Lit 写的），不是 React 组件。
- `MessageProcessor` **没有** `onAction` 方法；action 监听通过构造参数、`processor.model.onAction.subscribe()` 或 `surface.dispatchAction()`。
- `CommonSchemas.Action` 属性在组件里**已是可调用函数**（`() => Promise<void>`），可直接用作 `onClick`。
- `Catalog` 序列化用 `catalog.toJson()` 或 `serializeCatalogDocument(catalog)`；不存在 `toJSONSchema()`。
- v0.9 的 `basicCatalog.protocolVersion` 是 `'0.9'`（无 `v` 前缀），但消息里 `version` 写 `'v0.9'`。
- `Catalog` 构造使用 `Map.set(name, comp)`，**同名后写覆盖先写**。
- `prepareCatalogs` 会把 React 实现转成 Custom Element（`a2ui-react-<name>`，`display: contents`）。
- 组件必须用 `id: 'root'` 作为 surface 根节点。
- basic catalog 样式全部走 `--a2ui-*` CSS 变量（30+ 个），`theme.primaryColor` 会经 `computeColorVariant` 派生 light/dark/hover。

## 04. 方案选择

### 已排除

| 方案 | 排除原因 |
|---|---|
| 放进 `apps/a2ui` | 违背 `apps/` 与 `packages/` 分层；协议产物与业务代码混在一起 |
| 硬上 v1.0 协议（2026-11-17 复核后仍排除） | 渲染器**能跑**（`A2uiSurface` 运行时兼容 v1.0 surface），但 `@a2ui/react` 的类型与工具链仍绑 v0.9，适配层要绕开类型系统；且 v1.0 的增量能力（新增函数、`catalogId` 可选、`createSurface` 内联组件）都是给后端 prompt 用的，后端未就绪时收益为零。详见 4.1 |
| 纯前端写死消息序列 | 验证不到 SSE 分片、按行缓冲、版本头 |
| browser history 路由 | GitHub Pages 无 `try_files` 回退，刷新 404 |
| v0.8（纯 React basic 组件） | 协议旧一版，且 v0.8→v0.9 是 breaking change |
| 小程序 | 明确排除 |
| AntD / MUI / Mantine | 自带视觉与 `--a2ui-*` 冲突；体积 8.5~49.5 MB；主题双轨制 |
| shadcn/ui | 强制引入 Tailwind，与仓库 SCSS + stylelint 体系冲突 |
| Recharts | 非引擎模式，需按 `kind` 写 JSX 分支 |
| 每种图表一个组件 | catalog 膨胀、多端成本翻倍、切换类型是破坏性的 |

**Chart.js 曾被列为候选，最终排除**：制造业看板需要 OEE 仪表盘、箱线图、SPC 控制图、车间地图，Chart.js 原生 8 种图表类型均不覆盖（仪表盘无合格插件、箱线图插件已下架、无地理坐标系统）。ECharts 原生 23 种类型全覆盖，体积多 170KB 但换来了业务必需能力。

### 选定方案

| 决策 | 选择 | 理由 |
|---|---|---|
| 协议版本 | **v0.9** | 后端未就绪，v1.0 的增量能力无人消费；渲染器类型与工具链仍绑 v0.9；官方 README 亦推荐新项目用 v0.9。详见 4.1 |
| React | **19.2.8** | 19.2 系列末版，发布 4 个月；React 19 占生态 76.7% |
| 包结构 | `packages/a2ui-catalog` + `packages/a2ui-ui` + `packages/a2ui`（三个包） | 各自独立构建；`a2ui-ui` 不认识 A2UI 协议，左侧固定区域与右侧渲染区共用它 |
| 包依赖 | 单向 `a2ui` → `a2ui-catalog` | catalog 保持框架无关 |
| 路由 | **不引入路由**（单页面） | `/a2ui` 只有一个页面，`App.tsx` 直接渲染 `ChatPage`。hash history 与 browser history 都无意义；将来出现第二个页面时再评估 |
| mock | Vite middleware 假后端 + SSE | 能验证真实链路，切真后端时前端不改 |
| catalog 合并 | 新建 `Catalog` 塞 basic + 自定义 | `derive` 返回 Web Component 类型，塞不进 React 实现 |
| 页面形态 | 聊天式左右布局 | 接近 ideaone 那种完整业务壳 |
| **基础组件库** | **Radix UI（按需）** | 零样式，不干扰 `--a2ui-*`；周下载 55~96M；有 A2UI 社区渲染器先例 |
| **图标** | **不引入图标库，直接用 basic catalog 的 Icon** | 左侧固定区域不需要图标（侧栏只有文字），右侧 basic 的 `Icon` 是 Web Component，颜色走 `--a2ui-*` 与自建组件同源；引入 lucide 需要额外维护 57 个图标名到 lucide 的映射表，未映射的静默渲染为空 |
| **图表库** | **ECharts（引擎模式）** | 制造业看板需要 OEE 仪表盘、箱线图、SPC 控制图、状态矩阵、车间地图；ECharts 23 种类型原生覆盖 |
| **主题方案** | **CSS 变量** | 与 basic catalog 共用同一套，派生色天然一致，切主题零 JS 开销 |
| 根脚本 | 独立 `dev:a2ui` / `build:a2ui` | 不改变现有 dev/build 体验 |
| CI | 只做本地产物脚本 | 后端仓库和 token 尚未就绪 |
| 版本兼容 | **前后端同时发版，不做兼容层** | 无版本交错；多端上线前需重新评估 |

### 4.1 为什么选 v0.9 而不是 v1.0

**先纠正一个容易误判的事实：** `@a2ui/react` 的 npm `exports` 里没有 `./v1_0`，这不代表它不支持 v1.0。自 `0.13.0` 起，包根 `@a2ui/react` 被改造为 **version-agnostic 渲染器运行时**，v0.8 / v0.9 降为次级入口；`A2uiSurface` 通过 `surface.availableCatalogs` / `defaultCatalog` 解析 catalog，不关心协议版本。`0.14.0` 的 CHANGELOG 明确写了 `(v1_0) A2uiSurface renders a surface whose createSurface names no default catalog`。

**两个包的 v1.0 支持程度不同：**

| 包 | v1.0 支持 | 证据 |
|---|---|---|
| `@a2ui/web_core@0.15.0` | **完整** | `exports` 含 `./v1_0` 与 `./catalogs/basic/v1`；`VersionAdapterFactory` 注册了 `V1Point0Adapter`（`processing/adapters/factory.js:21`）；v1 basic catalog 同样 18 个组件 |
| `@a2ui/react@0.15.0` | **运行时兼容，类型未跟随** | chunk 只 `import from '@a2ui/web_core/v0_9'` / `v0_9/basic_catalog` / `v0_9/universal`；`.d.ts` 与 `createComponentImplementation` 泛型全部基于 v0.9 |

**v0.9 与 v1.0 的实际差异（逐项比对 schema 得出）：**

| 项 | v0.9 | v1.0 |
|---|---|---|
| `version` 字面量 | `'v0.9'` / `'v0.9.1'` | `'1.0'` |
| 绑定语法 | `{ path: '/x' }` | `{ path }` **或** `{ '@path' }` |
| `createSurface` | `surfaceId` + `catalogId`（必填） | `catalogId` 可选，且可直接内联 `components` 与 `dataModel` |
| `updateDataModel.value` | 可选 | 必填 |
| basic catalog | 18 个组件 | 同样 18 个，字段基本一致 |
| 内置函数 | 少量 | 多出 `formatCurrency` / `formatNumber` / `formatDate` / `pluralize` / `openUrl` / `and` / `or` / `not` |

**对本设计真正有影响的只有三处：** `version` 字面量、绑定语法多一种写法、`createSurface` 可选内联组件。

**为什么当前仍选 v0.9：**

1. **后端未接入，v1.0 的收益为零。** 上述增量能力全部是给后端 prompt 与消息构造用的，Go 侧还没开始，现在选等于为不存在的消费方提前买单。
2. **渲染器的类型级支持仍在 v0.9。** 选 v1.0 意味着 ③ 适配层要绕开 `createComponentImplementation` 的 v0.9 泛型，与「去掉所有 `as never`、让 TypeScript 报真实错误」的决定直接冲突。
3. **`catalog.json` 产物格式会变。** v1.0 的 catalog 文档带 `$defs.anyFunction` 与新的函数集合。这是要 `go:embed` 进 Go 二进制的契约，换版本后端也要跟着换。
4. **官方推荐。** `@a2ui/react` README 第 22 行：「For new projects, it is recommended to use the **v0.9** protocol.」

**将来切 v1.0 的触发条件与改动面：**

触发：后端接入且明确需要 v1.0 的内置函数或 `catalogId` 可选能力。

改动面（按 5.2 的层号）：

| 层 | 改动 |
|---|---|
| ① 契约层 | `Catalog` 构造的 protocolVersion 改 `'1.0'`；basic catalog 从 `catalogs/basic/v1` 取 |
| ③ 适配层 | 若 `@a2ui/react` 届时仍未提供 v1 类型，需按新工厂签名调整 |
| ⑤ 协议运行时 | `MessageProcessor` 无需改（`VersionAdapterFactory` 已支持） |
| ⑥ 渲染器 | 无需改（运行时已兼容） |
| 后端 | `catalog.json` 换新格式，prompt 与消息构造的 `version` 改为 `'1.0'` |
| 消息 | `version: 'v0.9'` → `'1.0'`；`{ path }` 可保留（v1.0 仍接受） |

**关键前提是 ⑥：等 `@a2ui/react` 把类型也迁到 v1.0。** 在此之前升级会让适配层失去类型保护。这一点应在升级前重新核对 `@a2ui/react` 的 `exports` 是否出现 `./v1_0` 或 `.d.ts` 是否改绑 `web_core/v1_0`。

## 05. 详细设计

### 5.1 目录结构

```
packages/a2ui-catalog/
├── AGENTS.md
├── package.json          # 仅依赖 zod + @a2ui/web_core
├── tsconfig.json
├── src/
│   ├── index.ts
│   └── components/
│       ├── Chart.api.ts
│       └── OrderCard.api.ts
└── scripts/
    └── export.ts         # 产出 dist/catalog.json + dist/VERSION

packages/a2ui-ui/
├── AGENTS.md
├── package.json          # 依赖 react, echarts, @radix-ui/react-dialog
└── src/
    ├── styles/
    │   └── tokens.css    # 品牌变量 + --a2ui-* 映射
    ├── Button.tsx / Button.css
    ├── Text.tsx / Text.css
    ├── TextField.tsx
    ├── Card.tsx
    ├── CheckBox.tsx
    ├── Chart.tsx
    └── chart/
        └── echarts-registry.ts

packages/a2ui/
├── AGENTS.md
├── package.json
├── tsconfig.json         # 应用源码类型检查
├── tsconfig.config.json  # 仅检查 vite.config.ts，不扫描应用源码
├── vite.config.ts        # base: '/a2ui/'，含 mock SSE middleware
├── index.html
└── src/
    ├── main.tsx              # ④ 入口：挂载 App，引入 tokens.css
    ├── app/
    │   └── App.tsx           # ④ 应用外壳，直接渲染 ChatPage（单页面，不引入路由）
    ├── chat/                 # ④ 应用层：界面与传输
    │   ├── ChatPage.tsx      # 聊天式左右布局
    │   ├── ChatPage.css
    │   ├── Sidebar.tsx       # 左侧固定区域
    │   ├── MessageList.tsx
    │   ├── ChatInput.tsx
    │   └── useChat.ts        # SSE 消费 + processMessages
    ├── a2ui/                 # ③ 适配层 + ⑤ 实例化
    │   ├── protocol.ts       # ⑤⑥ 唯一入口
    │   ├── catalog.ts        # ③ 产物聚合
    │   ├── processor.ts      # ⑤ MessageProcessor 单例
    │   └── adapters/         # ③ 适配层（字段翻译）
    │       ├── Button.tsx
    │       ├── Text.tsx
    │       ├── TextField.tsx
    │       ├── Card.tsx
    │       ├── CheckBox.tsx
    │       ├── Chart.tsx
    │       └── OrderCard.tsx
    └── mock/
        ├── fixtures.ts
        └── middleware.ts
```

**为什么不按 `app` / `pages` / `widgets` / `features` / `shared` 组织：** 那是 `apps/web` 的 FSD 约定，适用于多页面、多 Feature 的主站。`/a2ui` 只有一个页面、一个功能（对话生成界面），按层号组织比按 Feature 组织更贴合 5.2 的分层，也更容易核对「这个文件属于第几层」。

**`chat/` 与 `a2ui/` 的分界：** `chat/` 处理网络与界面状态（fetch、SSE 分片、消息列表），`a2ui/` 处理协议与渲染适配。`useChat.ts` 属于前者 —— 它不 import 任何组件，只调用 `processor.processMessages`。

### 5.2 分层结构（核心）

前四层只描述**我方代码**，后两层是**第三方提供**的运行时。分开画是为了让人一眼看出「哪部分出了问题是我们的责任」。

```
① 契约层   packages/a2ui-catalog                  [我方]  Zod schema，无 React、无 UI 库、无图表库
② 实现层   packages/a2ui-ui                       [我方]  唯一视觉实现；echarts / radix 只在这层
③ 适配层   packages/a2ui/src/a2ui/adapters       [我方]  字段翻译，5~15 行；不 import 任何第三方库
④ 应用层   packages/a2ui/src/{app,chat,mock}     [我方]  入口、SSE 消费、聊天布局、mock 后端

                    ↓ ③ 的产物交给 ↓

⑤ 协议运行时  @a2ui/web_core@0.15.0               [第三方] MessageProcessor、Catalog、SurfaceModel
⑥ 渲染器      @a2ui/react@0.15.0                  [第三方] A2uiSurface、createComponentImplementation
```

**③ 到 ⑥ 的实际数据流：**

```
组件实现 A2uiXxx  ──►  塞进 Catalog  ──►  MessageProcessor  ──►  <A2uiSurface>  ──►  DOM
(createComponentImplementation 产出)      (处理 JSON 消息)        (按 ComponentNode 树渲染)
```

**依赖方向严格单向：**

```
a2ui            → a2ui-catalog
a2ui            → a2ui-ui
a2ui            → @a2ui/react（⑥ 渲染器）
a2ui            → @a2ui/web_core（⑤ 协议运行时）
a2ui-catalog    → zod + @a2ui/web_core
a2ui-ui         → react + 第三方 UI/图表库

a2ui-catalog 与 a2ui-ui 互不依赖
@a2ui/react 与 @a2ui/web_core 只被 a2ui 直接依赖，不下沉到 a2ui-catalog / a2ui-ui
```

**唯一耦合点：** `packages/a2ui/src/a2ui/protocol.ts`。⑤⑥ 的所有导出都从这里转出，其余文件禁止直接 import `@a2ui/*`。

**护栏**（建议加 ESLint `no-restricted-imports`）：

- `a2ui/src/a2ui/adapters/**` 禁止 import `echarts` / `@radix-ui/*`
- `a2ui/src/**` 除 `a2ui/protocol.ts` 外禁止 import `@a2ui/react/*` 与 `@a2ui/web_core/*`
- `a2ui-catalog/**` 禁止 import `react` / 任何 UI 库
- `a2ui-ui/**` 禁止 import `@a2ui/*`

### 5.2.1 多端演进时改哪一层

**契约层 ① 不动。** `catalog.json` 是同一份产物，后端 Go 侧 `go:embed` 的也是它。

| 目标端 | 需要重写的部分 | 不需要动的部分 |
|---|---|---|
| React（当前） | — | — |
| 其他前端框架 | ② 实现层（换成该框架的组件）+ ③ 适配层（换用该框架的 `createComponentImplementation` 等价物）+ ⑥ 渲染器 | ① 契约层、④ 应用层的 SSE / mock 协议部分 |
| 原生 App | ② ③ 全部重写 + ⑥ 换成该平台的渲染器 | ① 契约层、后端 |

**关键约束：`createComponentImplementation` 是 React 专用工厂。** 它把 Zod schema 推断出的 props、动态绑定、`setValue`、`isValid` 等能力通过 React 的 `FC` 签名提供出来。适配层不是「写一次就能跑多个端」的抽象层 —— 每个端都要按该端的渲染器 API 重写一遍。这正是把契约层独立出来的原因：重写成本被限制在 ②③，协议和产物不用改。

**为什么现在不做这层抽象：** 第一版只针对 PC 浏览器，且小程序已明确排除。为尚不存在的端提前设计跨端适配抽象层，会引入没有真实消费方的间接层。等第二个端真正立项时再评估。

### 5.3 组件接入策略

**basic catalog 18 个组件的处理：**

| 处理 | 组件 | 说明 |
|---|---|---|
| **自建共享** | Text / Button / TextField / Card / CheckBox | 左侧也用，接口窄，约 200 行 |
| **直接用 basic** | Row / Column / List / Tabs / Divider / Image / Video / AudioPlayer / Slider / ChoicePicker / DateTimeInput / Icon | 左侧用不上或接口宽，靠 CSS 变量统一视觉 |
| **不实现** | Modal | `trigger` 机制与 React dialog 冲突，第一版跳过 |
| **新增** | Chart | 引擎模式，见 5.4 |

**自建 5 个，其余用 basic。**

### 5.4 图表组件（引擎模式）

**契约**（`Chart.api.ts`）：

```ts
kind: z.enum(['bar', 'hbar', 'line', 'area'])
data: CommonSchemas.DynamicValue      // 绑定到 dataModel 数组
xField: z.string()
series: z.array(z.object({ field, label, color? })).min(1)
height / showLegend / showValueLabel
```

**关键设计：**

- **一个组件 + `kind` 枚举**，不是「BarChart / LineChart / PieChart 各一个组件」
- 横向条形图用 `kind: 'hbar'`，ECharts 侧只需对调 `xAxis` / `yAxis`
- 切换图表类型只发一个字段的增量更新，组件实例不重建
- 字段结构不同的图表（饼图需要 `nameField` + `valueField`、仪表盘需要 `min`/`max`/`value`）将来单独做 `PieChart` / `GaugeChart` 组件

**实现要点：**

| 问题 | 处理 |
|---|---|
| 生命周期 | `echarts.init(el)` 一次；`setOption(option, { notMerge: true })` 更新；`dispose()` 必调 |
| 尺寸 | ECharts 不跟随容器尺寸，必须用 `ResizeObserver` 调 `resize()` |
| 动画 | `setOption(..., { notMerge: true })` 后 `chart.setOption({ animation: false })` 或初始化时统一关闭 |
| 主题色 | ECharts 不认 `var()`，用 `getComputedStyle` 读 `--a2ui-*` 后写入 option |
| 主题切换 | `MutationObserver` 监听 `[data-theme]`，重设 option |
| 体积 | 只 `echarts.use([...])` 注册用到的 chart 与 component，不用全量 `echarts` |
| 数据量 | 建议后端限制 500 行以内；超过时启用 `large: true` |
| 隐藏容器 | `clientWidth === 0`（Modal / 非激活 Tab）时不要 init，否则得到空白图 |

**LLM 输出示例：**

```json
{ "id": "chart1", "component": "Chart", "kind": "bar", "data": { "path": "/outputByArea" },
  "xField": "area",
  "series": [{ "field": "actual", "label": "实际" }, { "field": "planned", "label": "计划" }] }
```

### 5.5 左侧固定区域与右侧动态区域的一致性

**核心原则：不是「两个要同步的按钮」，而是「同一个按钮的两条使用路径」。**

```tsx
// 唯一实现，落在 ② 实现层（a2ui-ui/src/Button.tsx）
export function Button({ variant, onClick, children }: ButtonProps) { ... }

// 路径一：左侧固定区域（④ 应用层）直接使用
<Button variant="primary" onClick={send}>发送</Button>

// 路径二：右侧动态区域，经 ③ 适配层包装后交给渲染器
export const A2uiButton = createComponentImplementation(ButtonApi, ({ props, buildChild }) => (
  <Button variant={props.variant} onClick={props.action}>{buildChild(props.child)}</Button>
))
```

**为什么这样能保证一致：**

- 样式：两边都是 `<Button>`，CSS 只写一处
- 交互：同一个 `onClick` 实现
- 无障碍：同一个 DOM 结构
- 主题：都读 `--a2ui-*` 变量

**样式纪律：**

- 样式只挂在组件自己的 class 上，不依赖父级选择器（右侧多一层 custom element）
- 所有颜色/间距/圆角走 token，不写魔法值

### 5.6 设计 Token

```css
/* a2ui-ui/src/styles/tokens.css */
:root {
  /* 品牌层 */
  --leo-brand: #1a73e8;
  --leo-bg: #ffffff;
  --leo-text: #1f1f1f;
  --leo-radius: 8px;
  --leo-font: 'Inter', system-ui, sans-serif;

  /* 映射层：让 basic catalog 也用同一套值 */
  --a2ui-color-primary: var(--leo-brand);
  --a2ui-color-surface: var(--leo-bg);
  --a2ui-color-on-surface: var(--leo-text);
  --a2ui-border-radius: var(--leo-radius);
  --a2ui-font-family-title: var(--leo-font);
}

[data-theme='dark'] {
  --leo-brand: #4a9eff;
  --leo-bg: #121212;
  --leo-text: #e8e8e8;
}
```

**为什么选 CSS 变量而非 JS 主题对象：**

- basic catalog 的 hover/light/dark 由 `color-mix(in oklab, ...)` 从 `--a2ui-color-primary` 派生
- 如果 UI 库用自己的 JS 主题（AntD `generate` / MUI `lighten` / Mantine 色板），会得到**不同的派生色**
- CSS 变量方案下两边读同一个 `--a2ui-color-primary-hover`，天然一致
- 切主题只需改一个 attribute，零 JS 计算

### 5.7 catalog 合并

```ts
const SELF_BUILT = new Set(['Text', 'Button', 'TextField', 'Card', 'CheckBox'])

export const APP_CATALOG = new Catalog(
  'https://leo.example/a2ui/catalog',
  '0.9',
  [
    ...basicCatalog.components.values().filter(c => !SELF_BUILT.has(c.name)),
    ...selfBuiltComponents,   // 含 A2uiChart
  ],
  [...basicCatalog.functions.values()],
)
```

**命名注意：** 自建的实现变量名不能和 basic 的导出冲突。

### 5.8 协议版本单一来源

```ts
// packages/a2ui/src/a2ui/protocol.ts
// ⑥ 渲染器
export { A2uiSurface, createComponentImplementation } from '@a2ui/react/v0_9'
export type { ReactA2uiComponentProps, ReactCatalogComponent } from '@a2ui/react/v0_9'
// ⑤ 协议运行时
export { MessageProcessor, Catalog, CommonSchemas } from '@a2ui/web_core/v0_9'
export type { ActionPayload, ComponentApi, A2uiMessage, SurfaceModel } from '@a2ui/web_core/v0_9'
export { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog'
```

其余代码只从这里引入。**换渲染器（⑥）或升级协议（⑤）只改这一个文件**，③ 适配层最多按新的工厂签名调整一次。

### 5.9 mock 后端

`vite.config.ts` 的 `server.middlewares` 挂 `/api/chat` 和 `/api/action`：

- Header：`Content-Type: text/event-stream`、`X-A2UI-Version`、`X-A2UI-Hash`
- 按行 `data: {...}\n\n` 下发，结束 `data: [DONE]\n\n`
- 每行之间加小延迟模拟流式
- `/api/action` 返回 `204`，console 打出收到的 action

**mock 覆盖的流程：** `createSurface` → `updateComponents`（两次，第二次只改一个组件）→ `updateDataModel` → action 往返。

### 5.10 构建与部署

- **脚手架**：`pnpm create vite packages/a2ui --template react-ts` 生成骨架，再按仓库约定覆盖
- 模板产物中 `eslint.config.js`、`.gitignore`、`public/`、`src/assets/`、`src/index.css`、`src/App.css`、`tsconfig.app.json`、`tsconfig.node.json` 一律删除 —— 仓库根已提供统一的 ESLint 与 `.gitignore`，TypeScript 配置用本包自带的 `tsconfig.json` + `tsconfig.config.json` 两分法
- 模板给的 `^` 范围版本必须替换为精确版本，并补 `workspace:*` 依赖
- `base: '/a2ui/'`
- `build.outDir: '../../dist-vite/a2ui'`
- 根 `package.json` 新增 `dev:a2ui` / `build:a2ui`，不改动 `dev:vite` / `build:vite`
- 不修改 `copyOtherSitePlugin`

### 5.11 仓库规则接入

- 新增 `packages/a2ui/AGENTS.md`、`packages/a2ui-catalog/AGENTS.md`、`packages/a2ui-ui/AGENTS.md`
- `pnpm typecheck` 需追加三个包（当前逐个点名）
- 根 ESLint flat config 已覆盖 `tsx`，需新增上述 `no-restricted-imports` 规则

## 06. 遗留与风险

### 已知风险

**1. `display: contents` 与样式继承**

basic 组件和自建组件都会被包进 `<a2ui-react-*>` custom element。依赖父级后代选择器的样式在右侧会失效。**必须实测**，且样式只挂组件自身 class。

**2. `Action` 属性可直接 `onClick`**

已核验 `ResolveA2uiProp` 类型：`Action` 解析为 `() => Promise<void>`。但 `functionCall` 类型的 action 是本地求值、不上行，行为与 `event` 不同。

**3. `base: '/a2ui/'` 的 URL 形态**

不引入路由，因此没有 hash 片段。需实测开发服务器地址是 `http://localhost:5173/a2ui/`，构建产物中资源路径以 `/a2ui/` 开头而非 `/a2ui/a2ui/`。

**4. mock 中间件只应在 dev 生效**

生产构建时 `/api/chat` 不存在，页面会报错。需要在页面上给出明确的「后端未接入」提示，而不是白屏。

**5. ECharts 在隐藏容器内初始化得到空白图**

Modal、非激活 Tab 等隐藏状态下容器宽度为 0，ECharts 初始化会得到空白图。必须在 `clientWidth > 0` 时再初始化，或用 `ResizeObserver` 首次有尺寸时补初始化。

**6. 主题切换时图表不自动更新**

需要 `MutationObserver` 监听 `[data-theme]` 手动重设。

### 版本演进

**前后端同时发版，不做兼容层。** 契约可直接修改，不需要考虑版本交错。

**多端上线前需重新评估** —— 原生 App 和小程序发版不可控，那时必须回到「只加可选字段 + 版本协商」的规则。小程序已在 2026-11-17 明确排除，原生 App 如立项则按 5.2.1 重写 ②③ 并更换 ⑥ 渲染器，① 契约层与产物格式保持不变。

### 明确不做

- 双向函数调用（`callRendererFunction`）
- 多 surface 管理
- 自定义 functions
- 对话历史持久化
- 地图组件
- 小程序
- 表格组件（DataGrid）—— 如需要单独评估

## 07. 交付物清单

| 交付物 | 位置 |
|---|---|
| catalog 包 | `packages/a2ui-catalog/` |
| UI 库 | `packages/a2ui-ui/` |
| 应用包 | `packages/a2ui/` |
| catalog 产物 | `packages/a2ui-catalog/dist/` |
| 构建产物 | `dist-vite/a2ui/` |
| 规则文件 | 三个 `AGENTS.md` |
| 根脚本 | `package.json` 中 `dev:a2ui` / `build:a2ui` |

## 08. 依赖清单

```json
// packages/a2ui/package.json
{
  "dependencies": {
    "@a2ui/react": "0.15.0",
    "@a2ui/web_core": "0.15.0",
    "@white55/a2ui-catalog": "workspace:*",
    "@white55/a2ui-ui": "workspace:*",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@types/react": "19.2.8",
    "@types/react-dom": "19.2.7",
    "@vitejs/plugin-react": "<latest>",
    "vite": "6.0.11"
  }
}

// packages/a2ui-ui/package.json
{
  "dependencies": {
    "@radix-ui/react-dialog": "1.3.1",
    "echarts": "6.1.0"
  },
  "peerDependencies": {
    "react": "19.2.8",
    "react-dom": "19.2.8"
  }
}

// packages/a2ui-catalog/package.json
{
  "dependencies": {
    "@a2ui/web_core": "0.15.0",
    "zod": "3.25.76"
  }
}
```

**注意：** `zod` 版本需与 `@a2ui/web_core` 的 peer 要求一致（`^3.25.76`）。

**待补充：** `@vitejs/plugin-react` 的精确版本需在实施时确认。

## 09. 待办

- `packages/react-vue-migration-demo/package.json` 的 React 版本从 `19.3.0` 改为 `19.2.8`（`@types/react-dom` 改为 `19.2.7`），与新包统一
