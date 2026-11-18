# CopilotKit A2UI Playground 实现对照

> 适用分支：`feature/v2-blog-website`
> 核对日期：2026-11-18
> 调研对象：`https://github.com/CopilotKit/CopilotKit/tree/main/examples/showcases/a2ui-playground`
> 相关代码：`packages/a2ui`、`packages/a2ui-catalog`、`packages/a2ui-adapter`、`packages/a2ui-ui`

本文记录官方 Playground 的工程实现，并与本仓库逐项对照，标出**可直接借鉴**、**后端就绪后再做**、**本阶段不需要**三档。

---

## 1. 它是什么

`a2ui.open.bot` 是 A2UI 官网（a2ui.org）的 Playground，实际由 CopilotKit 构建。它是目前最完整的 A2UI 参考实现，技术栈 Next.js + A2UI 1.0 + CopilotKit Gen UI 2.0。

**注意版本差异**：它用 A2UI 1.0，本仓库用 v0.9。绑定语法不同（`{"@path"}` vs `{path}`），字段名不能直接照抄，**但机制与分层可以照搬**。

### 1.1 目录职责

| 目录 | 职责 | 本仓库对应 |
|---|---|---|
| `src/a2ui/catalog/definitions/` | 组件契约，按类别分文件（layout/content/data/charts/maps/inputs/feedback/domain） | `packages/a2ui-catalog/src/components/` |
| `src/a2ui/catalog/renderers/` | 渲染器实现，同样按类别分文件 | `packages/a2ui-adapter/src/adapters/` |
| `src/a2ui/catalog/entries.ts` | 把定义 + 渲染器合成一份注册表 | `a2ui-adapter/src/catalog.ts` |
| `src/a2ui/macros/` | 服务端宏，展开成标准组件 | 无 |
| `src/agent/` | 服务端：prompt 生成、流式解析、输出修复 | 无（后端未接入） |
| `src/design-systems/` | 可切换设计系统（shadcn / material / BYOC） | 无 |
| `src/evals/` + `src/data/evals.json` | 评测任务 | 无 |

**关键观察**：契约与渲染器**按类别拆成多个文件**，而不是一个组件一个文件。类别同时用于组织文档、生成 prompt、页面分组。本仓库目前是「一个组件一个文件」，组件数到 20+ 时值得改成按类别分。

---

## 2. 六处值得借鉴的实现

### 2.1 契约声明 `writable`，引擎据此生成写回函数

契约里显式声明哪些 prop 可写：

```ts
export const writableValue: Pick<Def, "writable"> = { writable: ["value"] };

Switch: def("Inputs", "...", z.object({
  label: z.string(),
  value: z.boolean().optional(),
  description: z.string().optional(),
}), writableValue),
```

渲染器拿到的不是「组件自己的更新事件」，而是引擎按 `writable` 自动生成的 `setValue`：

```tsx
Switch: ({ props }) => {
  const [checked, setChecked] = useBound(props.value, props.setValue, false)
  return <Switch checked={checked} onCheckedChange={setChecked} />
}
```

`useBound` 的价值在于兜底：

```ts
export function useBound<T>(value, setValue, fallback) {
  const [local, setLocal] = useState(value ?? fallback)
  useEffect(() => {
    if (value !== last.current) setLocal(value === undefined ? fallback : value)
  }, [value, fallback])
  const set = (next) => { setLocal(next); setValue?.(next) }
  return [local, set]
}
```

| 场景 | 只有 `setValue` | 加 `useBound` |
|---|---|---|
| 绑定到路径 | ✅ | ✅ |
| 下发的值是**字面量** | ❌ 输入框打不动 | ✅ 本地 state 兜底 |
| 后端中途更新该值 | ✅ | ✅ |
| 后端删除该值 | ⚠️ 行为不确定 | ✅ 重置为 fallback |

**本仓库现状**：`A2uiLeoTextField` / `A2uiLeoCheckBox` 已用 `props.setValue?.(next)`，但**缺本地兜底**。后端下发字面量时输入框不可编辑。**建议补。**

### 2.2 服务端修复 LLM 输出（`agent/repair.ts`）

小模型输出不合规是可预期的。它的做法是逐组件修复后再下发：

```ts
const ALIASES = {
  text: ['title', 'content', 'label', 'value', 'body', 'markdown'],
  title: ['text', 'label', 'heading', 'name'],
  url: ['src', 'href', 'image'],
  data: ['rows', 'items', 'points', 'series'],
  rows: ['data', 'items'],
  markers: ['places', 'points', 'locations'],
}
```

修复范围：

- **字段别名**：`title` 写成 `text`
- **类型强转**：`"3"` → `3`、`"true"` → `true`、`"30%"` → `30`
- **枚举大小写**：`Bar` → `bar`
- **旧版绑定**：v0.9 的 `{ path }` → 1.0 的 `{ "@path" }`
- **结构降级**：`{ nodes, links }` 当成数组时自动解包

原文说明了动机：

> The browser checks every A2UI 1.0 operation against its catalog and drops one that names an unknown prop or holds a value of the wrong type.

**本仓库现状**：无。当前模型输出不合规会静默缺组件或白屏。**这是后端的责任，需写入后端接口契约。**

### 2.3 流式增量解析（`agent/stream-parse.ts`）

A2UI 中间件要等整个 `components` 数组闭合才渲染。它自己写了个解析器，从流式 JSON 里**逐个提取已闭合的组件对象**，让界面边写边画：

```ts
class ComponentStreamParser {
  push(delta: string): Array<Record<string, unknown>>
  // 内部维护 inString / escaped / depth，遇到 depth 归零就 JSON.parse 这一段
  // 另外用正则先读出正在流的那个组件的 id + component，
  // 让占位框能在对象闭合前就显示组件名
}
```

**本仓库现状**：mock 是整批发。接真实后端后，长页面会让用户干等。**后端就绪后再做。**

### 2.4 契约压成 token 廉价的 prompt（`agent/catalog-prompt.ts`）

完整 JSON Schema 对 120 个组件太长，压成一行一个签名：

```
Stat(label:S, value:S|N, delta?:S, trend?:up|down|flat): One KPI ...
```

- `S` / `N` / `B` 分别是 string / number / boolean
- `#id` 是组件 id，`#ids` 是 id 列表
- 按 catalog 内容做 sha256 缓存，命中 prompt caching

**本仓库现状**：无。12 个组件时 schema 直接塞给模型尚可，30+ 时必须用这个技巧。

### 2.5 服务端宏（`src/a2ui/macros/`）

模型只写一个高层调用，服务端展开成标准组件树：

```
模型写：  WeatherReport("Lisbon")        ← 30 字符
服务端展开：Card + Row×3 + Column×4 + Icon×2 + Caption×6 + Chart + List
客户端收：普通 A2UI 组件树               ← 零渲染代码
```

约束：

- 展开后保留 macro 的 id 作为根节点，子节点命名 `<id>__<type>_<n>`
- 支持嵌套，上限 16 层
- 可带 `load` 函数在服务端取数（`WeatherReport` 自己拉天气）

**本仓库现状**：无。`LeoOrderCard` 这类业务组件将来可以改为 macro，避免「加一个业务卡片就要改契约+适配器+实现+注册」四处。**后端就绪后再评估。**

### 2.6 设计与行为分离（`src/design-systems/`）

同一份 A2UI 消息可以用 shadcn / material / 自带组件三套设计系统渲染。`shared.tsx` 保证行为一致：

```ts
/** 标准 Button 的点击：链接和复制留在浏览器，其余才是模型的事件 */
export function pressButton(props, event) {
  if (props.submit) return
  const href = props.href?.trim()
  if (href) { window.open(href, '_blank', 'noopener,noreferrer'); return }
  if (props.copy) { navigator.clipboard?.writeText(props.copy); return }
  props.onClick?.({})
}
```

**设计原则**：组件的行为（点击后做什么）与外观（长什么样）必须分离。本仓库的 `LeoButton` 把两者写在一起，这是单设计系统下的合理取舍；若将来要多主题，需要先拆。

---

## 3. 逐项对照

| 能力 | 本仓库现状 | 官方实现 | 建议 |
|---|---|---|---|
| 契约定义（Zod） | ✅ 三层分离清晰 | ✅ | 保持 |
| 组件渲染 | ✅ 适配层 | ✅ renderer map | 保持 |
| 双向绑定 | ⚠️ 有 `setValue`，缺本地兜底 | ✅ `useBound` | **补** |
| 交互事件 | ⚠️ `processor` 里 if 链 | ✅ 统一入口 | **分层** |
| 组件目录页 | ✅ 三个 Tab | ✅ 自动生成 | 保持 |
| 文档生成 | ❌ 手写，易与代码脱节 | ✅ 从 Zod 生成 | 可补 |
| 流式解析 | ❌ | ✅ | 后端就绪后 |
| 输出修复 | ❌ | ✅ | 后端就绪后（必须） |
| 契约转 prompt | ❌ | ✅ | 30+ 组件时 |
| 服务端宏 | ❌ | ✅ | 后端就绪后评估 |
| 多设计系统 | ❌ | ✅ | 本阶段不需要 |
| 评测 | ❌ | ✅ | 产品化后 |

---

## 4. 行动建议

### 现在可做

1. **补 `useBound` 等价物**：修掉「字面量值不可编辑」的真实缺陷，改 2 个适配器。
2. **抽出本地动作注册表**：把 `processor.ts` 里的 `if (action.name === 'navigate')` 特判改成查表，避免后续动作继续堆 if。

### 需要用户确认

3. **`LeoTabs` 补 `value`**：属于公开契约变更。若 tab 选中态是查询维度，必须绑定才能让后端在 action 里拿到。

### 写入后端接口契约（现在不实现）

4. `repair`（输出修复）、`stream-parse`（增量解析）、`catalog-prompt`（提示词生成）应由后端承担。前端只需保证：**收到不合法消息时不崩溃、不白屏，并在控制台报告**。

---

## 5. 一句话结论

官方 Playground 的核心价值不在组件数量（69 个标准 + 52 个自有），而在**把 LLM 的不确定性挡在后端**：修复输出、流式解析、宏展开、提示词压缩。本仓库的三层契约架构方向正确，下一步应先补齐前端侧的绑定兜底与事件分层，其余等后端就绪。
