# A2UI 前端详细使用教程

> 适用分支：`feature/v2-blog-website`
> 适用版本：`@a2ui/react` / `@a2ui/web_core` 0.15.0，协议 v0.9，React 19.2.8，Vite 6.0.11
> 相关代码：`packages/a2ui`、`packages/a2ui-catalog`、`packages/a2ui-ui`

本教程面向三类读者：想跑起来看效果的开发者、要修改现有组件的人、要从零接入一个新组件的人。所有代码片段均取自当前仓库实现，字段名以源码为准。

---

## 1. 这套代码在做什么

A2UI 的核心是**前后端契约**：前端定义"有哪些组件、每个组件收什么字段"，后端只发 JSON 消息，前端负责把消息渲染成界面，用户交互再以 action 回传。

一次完整闭环包含四步：

```
createSurface  →  updateComponents  →  渲染  →  用户点击  →  action 回传后端
  建画布            下发组件树            DOM        交互事件       POST /api/action
```

当前阶段后端未接入，用 Vite 中间件模拟 SSE 假后端，因此整条链路可以在本地独立验证。

### 1.1 三个包的分工

| 包 | 层 | 职责 | 禁止事项 |
|---|---|---|---|
| `packages/a2ui-catalog` | ① 契约层 | 只放 Zod schema，描述组件字段 | 不依赖 React、任何 UI 库、图表库 |
| `packages/a2ui-ui` | ② 实现层 | 唯一的 React 视觉实现，ECharts/Radix 只在这层 | 不知道 A2UI 协议存在，不 import `@a2ui/*` |
| `packages/a2ui` | ③ 适配层 + ④ 应用层 | 字段翻译、SSE 消费、页面布局、mock | `src/a2ui/protocol.ts` 之外禁止直接 import `@a2ui/*` |

第三方运行时（⑤ 协议运行时 `MessageProcessor`、⑥ 渲染器 `A2uiSurface`）由 npm 提供，只被 `packages/a2ui` 直接依赖。

### 1.2 为什么分三个包

- **契约可被后端消费。** `a2ui-catalog` 能单独产出 `catalog.json`，给 Go 后端 `go:embed`，不需要带任何前端代码。
- **实现层可被复用于固定区域。** 左侧聊天区直接使用 `a2ui-ui` 的 `<Button>`，右侧 A2UI 渲染区通过适配器使用同一个 `<Button>`，两边天然同色同交互。
- **换端成本被限制在 ②③。** 将来换框架，契约与产物不用动。

---

## 2. 快速开始

### 2.1 安装依赖

```bash
pnpm install
```

### 2.2 启动开发服务器

```bash
pnpm dev:a2ui
```

打开 `http://localhost:5173/a2ui/`。注意地址是 `/a2ui/`，不是 `/a2ui/a2ui/`（`vite.config.ts` 里 `base: '/a2ui/'`）。

### 2.3 页面构成

- **左侧固定区**：标题、消息列表、输入框、发送按钮。这一段是普通 React 页面，直接使用 `a2ui-ui` 组件，不经过协议。
- **右侧动态区**：顶部两个 tab，下方内容随 tab 切换。
| tab | 渲染方式 | 验证点 |
|---|---|---|
| 基础组件展示 | `BasicDemo.tsx` 直接写 JSX 使用 `a2ui-ui`，**不经过 A2UI** | 组件库本身的视觉、`disabled` / `borderColor` 等变体 |
| 复杂组件展示 | 发送消息后由 `A2uiSurface` 渲染 JSON 下发的组件树 | 契约到渲染链路、数据绑定、自研 Chart / OrderCard、action 回传 |

**这个对照是刻意的**：同一个 `<Button>` / `<Card>` 在「直接写 JSX」和「经适配层渲染」两条路径下必须完全一致。基础页发送消息只会产生对话回显，不会改动右侧内容。

复杂页的消息末尾带一条增量更新，把标题改为「复杂组件展示（已增量更新）」，用于验证 `updateComponents` 只更新目标组件、不重建整棵树。

### 2.4 验证命令

```bash
pnpm --filter @white55/a2ui typecheck
```

```bash
pnpm build:a2ui
```

生产构建产物落在 `dist-vite/a2ui`。生产环境没有 mock 中间件，页面会在发送时提示「后端未接入」，而不是白屏。

---

## 3. 一次请求的完整时序

```
① 用户在左侧输入并点击发送
        ↓
② chat/useChat.ts: fetch POST /api/chat { message }
        ↓
③ mock 中间件按行写 SSE：data: {...}\n\n  ...  data: [DONE]\n\n
        ↓
④ useChat 逐块读取，按 '\n' 切分，保留最后一段不完整的行
        ↓
⑤ processor.processMessages(batch)   ← @a2ui/web_core
        ↓
⑥ processor 触发 onSurfaceCreated / onSurfaceDeleted
        ↓
⑦ useChat setSurfaces([...processor.getSurfaces().values()])
        ↓
⑧ <A2uiSurface surface={surface} />  ← @a2ui/react
        ↓
⑨ 根据 ComponentNode 树查 catalog，调用适配层的实现，渲染成 DOM
        ↓
⑩ 用户点击按钮 → props.action() → processor 的 actionHandler
        ↓
⑪ POST /api/action，控制台打印 action
```

关键约定：**`src/a2ui/protocol.ts` 是 `@a2ui/react` 与 `@a2ui/web_core` 的唯一入口**。其他文件只从它引入，这样将来换渲染器或升级协议只改一个文件。

---

## 4. 协议速查（v0.9）

消息统一带 `version` 字段，取值只能是 `'v0.9'` 或 `'v0.9.1'`。四种消息互斥，每条形如：

```json
{ "version": "v0.9", "createSurface": { ... } }
```

### 4.1 `createSurface`：建画布

```json
{
  "version": "v0.9",
  "createSurface": {
    "surfaceId": "complex-demo",
    "catalogId": "https://leo.example/a2ui/catalog"
  }
}
```

- `surfaceId`：surface 的唯一标识，后续所有消息都要带同一个值。当前 mock 用的是 `complex-demo`（`fixtures.ts` 的 `COMPLEX_SURFACE_ID`）。
- `catalogId`：必须与 `packages/a2ui/src/a2ui/catalog-meta.ts` 的 `CATALOG_ID` 完全一致，否则组件查不到实现。
- 同一 `surfaceId` 重复 `createSurface` 会报错，必须先 `deleteSurface`。

### 4.2 `updateComponents`：下发/更新组件树

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "complex-demo",
    "components": [
      { "id": "root", "component": "Column", "children": ["title"] },
      { "id": "title", "component": "Text", "text": "生产绩效", "variant": "h2" }
    ]
  }
}
```

规则：

- **必须有一个 `id` 为 `root` 的组件**作为树根。
- 同 `id` 再次下发即覆盖该组件；只发变化的部分就是增量更新（`fixtures.ts` 最后一条消息只重发了 `title`）。
- 组件的引用关系通过 `child`（单个）或 `children`（数组）写**组件 id 字符串**，不能内联对象。
- `children` 还支持模板形式，用于从数据数组批量生成：

```json
{ "componentId": "rowTemplate", "path": "/rows" }
```

### 4.3 `updateDataModel`：写数据模型

```json
{
  "version": "v0.9",
  "updateDataModel": {
    "surfaceId": "complex-demo",
    "path": "/",
    "value": {
      "order": { "no": "SVPC-PRO-2410", "amount": 128.5 },
      "outputByArea": [{ "area": "A 区", "actual": 6420, "planned": 6845 }]
    }
  }
}
```

- `path` 是 JSON Pointer（如 `/order/no`），省略或写 `/` 表示整个数据模型。
- `value` 把该位置替换为新值；**省略 `value` 表示删除该键**。
- 组件里用 `{ "path": "/order/no" }` 绑定的字段，会随数据模型更新自动重渲染。

### 4.4 `deleteSurface`：销毁画布

```json
{ "version": "v0.9", "deleteSurface": { "surfaceId": "complex-demo" } }
```

用途：同一 `surfaceId` 要重新建画布时，必须先删后建；否则 `createSurface` 会因 surface 已存在而报错。当前页面的两个 tab 不再共用 surface（基础页根本不走 A2UI），所以此时不会触发这一步；将来若出现「同一 surface 重放一组消息」的场景，需要它。

### 4.5 动态值的三种写法

A2UI 的字段（如 `text`、`value`、`label`）通常声明为 `DynamicString` / `DynamicNumber` / `DynamicValue`，可写三种形态：

| 写法 | 示例 | 说明 |
|---|---|---|
| 字面量 | `"生产绩效"` / `128.5` | 直接渲染 |
| 数据绑定 | `{ "path": "/order/no" }` | 读取数据模型，数据变了自动更新 |
| 函数调用 | `{ "call": "formatNumber", "args": { ... } }` | 由 basic catalog 的内置函数在本地求值 |

### 4.6 `Action`：按钮点击怎么回传

`Action` 有两种形态：

```json
{ "event": { "name": "view-order", "context": { "id": { "path": "/order/no" } } } }
```

```json
{ "functionCall": { "call": "openUrl", "args": { "url": "https://example.com" } } }
```

- `event` 会**上行到后端**：适配层拿到的 `props.action` 是可调用函数，调用后 `processor` 的 `actionHandler` 收到 payload 并 `POST /api/action`。
- `functionCall` 在客户端本地求值，不上行，行为与 `event` 不同。

回传的 action payload 结构（`A2uiClientActionSchema`）：

```json
{
  "name": "view-order",
  "surfaceId": "complex-demo",
  "sourceComponentId": "orders",
  "timestamp": "2026-11-17T10:00:00.000Z",
  "context": { "id": "SVPC-PRO-2410" }
}
```

### 4.7 校验与双向绑定

组件 schema 里含 `checks` 的（Button / TextField / CheckBox / Slider / ChoicePicker / DateTimeInput）会得到：

- `props.isValid`：校验是否通过
- `props.validationErrors` / `props.validationResults`：失败原因
- 动态属性会自动生成同名 setter，如 `value: DynamicString` → `props.setValue(next)`

适配器里通常这样写：

```tsx
invalid={props.isValid === false}
onChange={(next) => props.setValue?.(next)}
```

---

## 5. 可用组件清单

### 5.1 basic catalog（18 个）

这些组件由 `@a2ui/web_core` 以 Lit Web Component 形式提供，不需要自己实现就能用：

| 组件 | 关键字段 |
|---|---|
| `Text` | `text`（必填）、`variant`：`h1`~`h5` / `caption` / `body` |
| `Row` | `children`（必填）、`justify`、`align` |
| `Column` | `children`（必填）、`justify`、`align` |
| `List` | `children`（必填）、`direction`：`vertical` / `horizontal`、`align` |
| `Card` | `child`（必填，单个组件 id） |
| `Button` | `child`（必填）、`variant`：`default` / `primary` / `borderless`、`action`（必填）、`checks` |
| `TextField` | `label`（必填）、`value`、`variant`：`shortText` / `longText` / `number` / `obscured`、`validationRegexp`、`checks` |
| `CheckBox` | `label`（必填）、`value`（必填 boolean） |
| `Tabs` | `tabs`：`[{ title, child }]` |
| `Divider` | `axis`：`horizontal` / `vertical` |
| `Image` | `url`（必填）、`description`、`fit`、`variant` |
| `Icon` | `name`（内置图标名，或 `{ svgPath }`） |
| `Video` | `url`（必填） |
| `AudioPlayer` | `url`（必填）、`description` |
| `Slider` | `value`（必填）、`max`（必填）、`min`、`label` |
| `ChoicePicker` | `options`、`value`、`variant`、`displayStyle`、`filterable` |
| `DateTimeInput` | `value`、`enableDate`、`enableTime`、`min`、`max`、`label` |
| `Modal` | `trigger`、`content` |

> `Icon` 的内置名包括 `add` / `check` / `close` / `search` / `settings` / `delete` / `edit` / `favorite` 等；未列出的图标用 `{ "svgPath": "..." }` 自绘。

### 5.2 本仓库覆盖或新增的组件

| 组件名 | 来源 | 说明 |
|---|---|---|
| `Text` / `Button` / `Card` / `TextField` / `CheckBox` | 覆盖 basic | 用 `a2ui-ui` 的 React 实现替换同名 basic 组件，保证与左侧固定区同源 |
| `Chart` | 自研新增 | 一个组件 + `kind` 枚举，覆盖 bar / hbar / line / area |
| `OrderCard` | 自研新增 | 业务示例组件，演示数据绑定 + action |

覆盖关系写在 `packages/a2ui/src/a2ui/catalog.ts` 的 `OVERRIDDEN` 集合里；开发期会校验它与 `selfBuilt` 实现是否一一对应（见 7.5）。

### 5.3 `Chart` 字段

```ts
kind: 'bar' | 'hbar' | 'line' | 'area'
data: DynamicValue            // 绑定到数据模型中的数组
xField: string                // 分类轴字段名
series: Array<{ field: string; label: DynamicString; color?: string }>  // 至少 1 组
height?: number               // 默认 240
showLegend?: boolean          // 默认 true
showValueLabel?: boolean      // 默认 false
optimize?: 'none' | 'large' | 'sampling'   // 默认 none
```

消息示例：

```json
{
  "id": "stats",
  "component": "Chart",
  "kind": "bar",
  "height": 260,
  "data": { "path": "/outputByArea" },
  "xField": "area",
  "series": [
    { "field": "actual", "label": "实际" },
    { "field": "planned", "label": "计划", "color": "#c5cfe0" }
  ],
  "showValueLabel": true
}
```

配套数据模型：

```json
{
  "outputByArea": [
    { "area": "A 区", "actual": 6420, "planned": 6845 },
    { "area": "B 区", "actual": 5880, "planned": 6189 }
  ]
}
```

`hbar` 只是把 `xAxis` / `yAxis` 对调，数据字段不变；切换类型只需重发 `kind` 一个字段。

### 5.4 `OrderCard` 字段

```ts
orderNo: DynamicString
amount: DynamicNumber
onView: Action
checks?: CheckRule[]     // 来自 CommonSchemas.Checkable
```

消息示例：

```json
{
  "id": "orders",
  "component": "OrderCard",
  "orderNo": { "path": "/order/no" },
  "amount": { "path": "/order/amount" },
  "onView": { "event": { "name": "view-order" } }
}
```

---

## 6. 页面接入：把 surface 渲染出来

如果只想在别的页面用这套渲染能力，最小代码是：

```tsx
import { A2uiSurface } from './a2ui/protocol'
import { processor } from './a2ui/processor'

// processor 是模块级单例，消息处理完 surface 会挂在它身上
processor.processMessages(messages)   // messages: A2uiMessage[]

function Preview() {
  return (
    <>
      {[...processor.getSurfaces().values()].map((surface) => (
        <A2uiSurface key={surface.id} surface={surface} />
      ))}
    </>
  )
}
```

实际页面里必须订阅 surface 变化，否则 React 不会重渲染。`useChat` 的做法：

```ts
const [surfaces, setSurfaces] = useState<SurfaceModel<ReactCatalogComponent>[]>(() => [
  ...processor.getSurfaces().values(),
])

useEffect(() => {
  const sync = () => setSurfaces([...processor.getSurfaces().values()])
  const created = processor.onSurfaceCreated(sync)
  const deleted = processor.onSurfaceDeleted(sync)
  sync()
  return () => {
    created.unsubscribe()
    deleted.unsubscribe()
  }
}, [])
```

类型必须显式写成 `SurfaceModel<ReactCatalogComponent>`，否则 `A2uiSurface` 的入参会因方差报错。

### 6.1 SSE 消费要点

`useChat` 的读流逻辑有四个必须保留的细节：

1. **按 `\n` 切分，保留最后一段**：`buffer.split('\n')` 后 `lines.pop()` 留给下一轮，避免半行被当 JSON 解析。
2. **容忍 `data:` 前缀**：同时兼容裸 JSON 行。
3. **`[DONE]` 跳过**：不代表消息。
4. **非法 JSON 只跳过该行**，不能让整个流中断。

版本头核对只告警不阻断：

```ts
const serverVersion = res.headers.get('X-A2UI-Version')
if (serverVersion && serverVersion !== CATALOG_VERSION) {
  console.warn(`[a2ui] 版本不一致：前端 ${CATALOG_VERSION} / 后端 ${serverVersion}`)
}
```

> 注意：这里比的是 **catalog 产物版本**（当前 `0.1.0`），不是协议版本（`v0.9`）。两者不要混淆。

### 6.2 surface 生命周期与单例状态

`processor` 是模块级单例，surface 状态不会因为 React 组件卸载而清空。由此产生两条实践规则：

1. **同一 `surfaceId` 要重放消息时，先 `deleteSurface` 再 `createSurface`**。当前 mock 的 surface id 是 `complex-demo`，只在「复杂组件展示」页使用，整页生命周期内只建一次，因此不需要删除。
2. **切 tab 不清 surface 是安全的**，因为基础页不渲染 `A2uiSurface`；切回复杂页时原先的 surface 仍在，直接复用。若将来两个 tab 都渲染 surface 且共用一个 id，就必须在切换时清理，否则 `updateComponents` 会把两组的组件树混在一起。

---

## 7. 教程：从零新增一个自定义组件

以新增 `Metric`（指标卡）为例，完整走一遍五步。文件名、命名风格与现有 `Chart` 保持一致。

### 7.1 第一步：写契约（`a2ui-catalog`）

新建 `packages/a2ui-catalog/src/components/Metric.api.ts`：

```ts
import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

export const METRIC_TRENDS = ['up', 'down', 'flat'] as const

export const MetricApi = {
  name: 'Metric',
  schema: z.object({
    // 指标名，如「OEE」。允许绑定数据模型。
    label: CommonSchemas.DynamicString,
    // 指标值，允许绑定数据模型。
    value: CommonSchemas.DynamicNumber,
    // 单位后缀，直接拼在数值后，如 "%"。
    unit: z.string().optional(),
    // 趋势方向，只影响箭头样式，不影响数值。
    trend: z.enum(METRIC_TRENDS).default('flat').optional(),
  }),
}
```

在 `packages/a2ui-catalog/src/index.ts` 补导出：

```ts
export { ChartApi, CHART_KINDS } from './components/Chart.api'
export { OrderCardApi } from './components/OrderCard.api'
export { MetricApi, METRIC_TRENDS } from './components/Metric.api'
```

同时把 `MetricApi` 加进 `packages/a2ui-catalog/scripts/export.ts` 的合并列表，否则 `catalog.json` 里不会有它：

```ts
const merged = new Catalog(
  CATALOG_ID,
  '0.9',
  [...basicCatalog.components.values(), ChartApi, OrderCardApi, MetricApi],
  [...basicCatalog.functions.values()],
)
```

### 7.2 第二步：写 UI 实现（`a2ui-ui`）

新建 `packages/a2ui-ui/src/Metric.tsx`：

```tsx
import './Metric.css'

export interface MetricProps {
  label: string
  value: number
  unit?: string
  trend?: 'up' | 'down' | 'flat'
}

export function Metric({ label, value, unit, trend = 'flat' }: MetricProps) {
  return (
    <div className={`leo-metric leo-metric--trend-${trend}`}>
      <span className="leo-metric__label">{label}</span>
      <span className="leo-metric__value">
        {value}
        {unit ? <span className="leo-metric__unit">{unit}</span> : null}
      </span>
      <span className="leo-metric__arrow" aria-hidden="true" />
    </div>
  )
}
```

新建 `packages/a2ui-ui/src/Metric.css`。三条硬约束：只用 token 变量、Flexbox、样式只挂自身 class（不能写 `.parent .leo-metric`）：

```css
.leo-metric {
  display: flex;
  flex-direction: column;
  gap: var(--leo-space-1);
  padding: var(--leo-space-4);
  background: var(--a2ui-color-surface);
  border-radius: var(--a2ui-border-radius);
  box-shadow: inset 0 0 0 1px var(--a2ui-color-border);
  font-family: var(--a2ui-font-family-title);
}

.leo-metric__label {
  font-size: 13px;
  color: var(--a2ui-color-on-surface);
  opacity: 0.7;
}

.leo-metric__value {
  font-size: 26px;
  font-weight: 600;
  color: var(--a2ui-color-on-surface);
}

.leo-metric__unit {
  margin-left: var(--leo-space-1);
  font-size: 14px;
  font-weight: 400;
  opacity: 0.7;
}

.leo-metric__arrow {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
}

.leo-metric--trend-up .leo-metric__arrow {
  border-bottom: 8px solid var(--a2ui-color-primary);
}

.leo-metric--trend-down .leo-metric__arrow {
  border-top: 8px solid var(--a2ui-color-border);
}

.leo-metric--trend-flat .leo-metric__arrow {
  border-top: 4px solid var(--a2ui-color-border);
}
```

在 `packages/a2ui-ui/src/index.ts` 导出：

```ts
export { Metric, type MetricProps } from './Metric'
```

### 7.3 第三步：写适配器（`packages/a2ui/src/a2ui/adapters`）

新建 `Metric.tsx`。适配器只做字段翻译，不写样式、不 import 图表库或 Radix：

```tsx
import { MetricApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { Metric } from '@white55/a2ui-ui'

export const A2uiMetric = createComponentImplementation(
  MetricApi,
  ({ props }) => (
    <Metric
      label={typeof props.label === 'string' ? props.label : ''}
      value={typeof props.value === 'number' ? props.value : 0}
      unit={props.unit}
      trend={props.trend}
    />
  ),
)
```

`createComponentImplementation` 的回调收到三样东西：

- `props`：已经解析过的属性，绑定值变成实际值，`Action` 变成可调用函数；
- `buildChild(child)`：把子组件 id 或节点渲染成 ReactNode；
- `context`：组件上下文（一般用不到）。

### 7.4 第四步：注册进 catalog

修改 `packages/a2ui/src/a2ui/catalog.ts`：

```ts
import { A2uiMetric } from './adapters/Metric'

const selfBuilt: ReactCatalogComponent[] = [
  A2uiText,
  A2uiButton,
  A2uiCard,
  A2uiTextField,
  A2uiCheckBox,
  A2uiChart,
  A2uiOrderCard,
  A2uiMetric,     // 新增
]
```

`Metric` 不是 basic 里的名字，所以**不要**加进 `OVERRIDDEN`。

### 7.5 第五步：发送消息并验证

在 `packages/a2ui/src/mock/fixtures.ts` 的 `complexMessages` 里加一条：

```json
{
  "id": "metric",
  "component": "Metric",
  "label": "OEE",
  "value": { "path": "/oee" },
  "unit": "%",
  "trend": "up"
}
```

再把 `root` 的 `children` 补上 `metric`，并在 `updateDataModel` 的 value 里加 `"oee": 87.4`。

验证顺序：

1. `pnpm --filter @white55/a2ui typecheck` 通过；
2. `pnpm dev:a2ui`，切到「复杂组件展示」，发送后出现指标卡；
3. 把 `oee` 改成别的数字重新发送，卡片数值跟着变（说明绑定生效）；
4. 改 `trend`，箭头样式改变。

### 7.6 覆盖 basic 同名组件时的差异

如果新组件想替换 basic 的某个同名实现（例如重做 `Image`）：

1. 契约**复用** basic 的 `ImageApi`，不要自己重写，否则 `catalog.json` 与官方不一致；
2. 适配器用 `createComponentImplementation(ImageApi, ...)`；
3. 把名字加进 `OVERRIDDEN`，同时 `selfBuilt` 里要有同名实现。

`catalog.ts` 在开发模式下会做双向校验：`OVERRIDDEN` 里的名字必须有实现，`selfBuilt` 里与 basic 重名的组件必须登记在 `OVERRIDDEN`。任一处拼错会直接抛错，因为 `Catalog` 内部是 `Map.set`，同名会静默覆盖。

### 7.7 检查清单

新增组件后逐项确认：

- [ ] `a2ui-catalog` 的 `index.ts` 与 `scripts/export.ts` 都加了；
- [ ] 适配器只从 `../protocol` 引入 `@a2ui/*`；
- [ ] 适配器没有 import `echarts` / `@radix-ui/*`；
- [ ] UI 组件样式只用 `--a2ui-*` / `--leo-*`；
- [ ] 没有 CSS Grid；
- [ ] 动态字段有 `undefined` 兜底（`typeof x === 'string' ? x : ''`）；
- [ ] 复杂逻辑或边界条件补了简体中文注释。

---

## 8. 样式、主题与排版约束

### 8.1 设计 token

`packages/a2ui-ui/src/styles/tokens.css` 分两层：

- 品牌层 `--leo-*`：颜色、间距、圆角、字体；
- 映射层 `--a2ui-*`：把品牌值映射给 basic catalog。

```css
:root {
  --leo-brand: #1a73e8;
  --a2ui-color-primary: var(--leo-brand);
  --a2ui-color-primary-hover: color-mix(in oklab, var(--a2ui-color-primary) 85%, black);
}
```

`--a2ui-color-primary-hover` 必须用与 basic catalog 相同的 `color-mix` 算法，否则左右两侧同名按钮的 hover 色会不一致。

### 8.2 切主题

主题靠根元素属性切换，不经过 JS 计算：

```js
document.documentElement.setAttribute('data-theme', 'dark')
```

图表例外：ECharts 已渲染的 canvas 不会自动重绘，`Chart.tsx` 用 `MutationObserver` 监听 `data-theme` 后重设 option；颜色从 CSS 变量读：

```ts
const textColor = readVar('--a2ui-color-on-surface', '#1f1f1f')
```

### 8.3 `display: contents` 包裹层

React 实现最终会被渲染进 `<a2ui-react-*>` custom element，basic 组件本身也是 custom element。因此：

- **样式只能挂在组件自身 class 上**，写 `.chat-page .leo-btn` 这类后代选择器在右侧会失效；
- 不要假设某个 DOM 层级一定存在；
- 尺寸依赖父容器时（如图表 `width: 100%`），父级必须有确定宽度。

### 8.4 禁止 CSS Grid

仓库自有前端样式一律用 Flexbox。检查命令：

```bash
grep -rn "display:\s*grid\|grid-template\|grid-column\|grid-row\|grid-area" packages/a2ui packages/a2ui-ui packages/a2ui-catalog --include="*.css" --include="*.tsx"
```

预期无输出。修改既有页面时若触碰区域仍有 Grid，必须在同一批修改里改掉，不能加兼容回退。

---

## 9. mock 后端与切换到真实后端

### 9.1 mock 结构

`packages/a2ui/src/mock/middleware.ts` 是一个只对 dev 生效的 Vite 插件（`apply: 'serve'`）：

- `POST /api/chat`：读取请求体后忽略其内容（只用于触发），固定返回复杂组件那一组消息；按行写 SSE，每条之间 `await sleep(80)` 模拟流式，结束写 `data: [DONE]`；
- `POST /api/action`：打印收到的 body，返回 `204`。

响应头：

| Header | 值 | 用途 |
|---|---|---|
| `Content-Type` | `text/event-stream` | 浏览器按流读取 |
| `X-A2UI-Version` | `CATALOG_VERSION`（`0.1.0`） | 前端核对 catalog 产物版本 |
| `X-A2UI-Hash` | `dev` | 预留，将来校验产物 hash |

`vite.config.ts` 通过 `mockApiPlugin()` 挂载。它依赖的 `catalog-meta.ts` 只放纯字符串常量，因为 Vite 配置在 Node 侧加载，不能反向拉进 React 或 `@a2ui/*`。

### 9.2 切到真实后端要满足什么

前端代码不需要改，只要后端满足：

1. `POST /api/chat` 返回 `text/event-stream`，每行 `data: <JSON>\n\n`，结束 `data: [DONE]`；
2. JSON 是 v0.9 四种消息之一；
3. 带上 `X-A2UI-Version`，值与前端 `CATALOG_VERSION` 对齐（不一致只告警，但应视为发版事故）；
4. `POST /api/action` 接收 action payload，返回 2xx；
5. 同源或配置代理，避免 CORS。

切之前先确认后端已就绪，再移除或关闭 mock 插件；生产构建本来就不含 mock。

### 9.3 给后端的 catalog 产物

```bash
pnpm --filter @white55/a2ui-catalog build
```

产出：

- `packages/a2ui-catalog/dist/catalog.json`：合并 basic 与自定义组件后的完整契约；
- `packages/a2ui-catalog/dist/VERSION`：`version`、`sha256` hash、`protocolVersion`、`generatedFrom`。

`dist/` 是构建产物，不进版本控制。后端可 `go:embed` 这两个文件，并在启动时校验 hash，避免前端与后端契约漂移。

---

## 10. 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 右侧一直是「等待生成…」 | 没发消息，或 SSE 没返回可解析消息 | 看 Network 里 `/api/chat` 状态码与响应体 |
| 控制台报「后端未接入」 | 生产构建或 mock 插件未启用 | 用 `pnpm dev:a2ui`，确认 `mockApiPlugin` 在 `vite.config.ts` |
| 某个组件完全不出现且不报错 | 名字拼错，或 `catalogId` 与 `CATALOG_ID` 不一致，或该名字既不在 basic 也不在 `selfBuilt` | 核对 `catalog.ts` 与消息里的 `catalogId` |
| 图表空白 | 容器宽度为 0（隐藏 tab / modal）时初始化 | 先切到可见 tab；`ResizeObserver` 首次有尺寸时会 resize |
| 图表颜色不随主题变 | 只改了 CSS 变量，canvas 已渲染 | 确认 `Chart.tsx` 的 `MutationObserver` 未失效 |
| 增量更新后整个界面重建 | 发了完整组件列表而非只发变更 id | 增量消息只发变化的那几条组件 |
| 右侧组件样式丢失 | 用了父级后代选择器，被 custom element 隔断 | 样式只挂组件自身 class |
| 切 tab 后组件错乱 | 未清理旧 surface | 先 `deleteSurface` 再发新消息 |
| 输入框打字不回写数据模型 | 适配器没接 `props.setValue` | 参照 `TextField.tsx` / `CheckBox.tsx` |
| 类型报 `SurfaceModel` 不兼容 | 联合类型推断导致方差问题 | 显式写 `SurfaceModel<ReactCatalogComponent>` |

---

## 11. 交付前检查

```bash
pnpm --filter @white55/a2ui typecheck
```

```bash
pnpm build:a2ui
```

```bash
grep -rn "display:\s*grid\|grid-template\|grid-column\|grid-row\|grid-area" packages/a2ui packages/a2ui-ui packages/a2ui-catalog --include="*.css" --include="*.tsx"
```

另外：

- 只运行 Vite 相关命令，未授权不执行任何 Webpack 命令；
- 新增或修改测试代码前必须先取得口令 `允许添加测试代码`；
- 页面验证默认由人工完成；需要自动启动页面测试时先取得口令 `允许自动启动页面测试`；
- 新增文件的复杂逻辑、边界条件与非直观取舍需补简体中文注释。

---

## 附：文件索引

| 想看什么 | 文件 |
|---|---|
| 协议与渲染器唯一入口 | `packages/a2ui/src/a2ui/protocol.ts` |
| catalog 合并与覆盖校验 | `packages/a2ui/src/a2ui/catalog.ts` |
| catalog 版本常量（Node 侧安全） | `packages/a2ui/src/a2ui/catalog-meta.ts` |
| MessageProcessor 单例与 action 回传 | `packages/a2ui/src/a2ui/processor.ts` |
| 字段翻译 | `packages/a2ui/src/a2ui/adapters/*.tsx` |
| SSE 消费 | `packages/a2ui/src/chat/useChat.ts` |
| 页面布局 | `packages/a2ui/src/chat/ChatPage.tsx` / `ChatPage.css` |
| 演示消息 | `packages/a2ui/src/mock/fixtures.ts` |
| mock 中间件 | `packages/a2ui/src/mock/middleware.ts` |
| 契约 | `packages/a2ui-catalog/src/components/*.api.ts` |
| 契约产物脚本 | `packages/a2ui-catalog/scripts/export.ts` |
| React 组件实现 | `packages/a2ui-ui/src/*.tsx` |
| 设计 token | `packages/a2ui-ui/src/styles/tokens.css` |
| 构建配置 | `packages/a2ui/vite.config.ts` |
