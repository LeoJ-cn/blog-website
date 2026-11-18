# DataTable 组件设计方案

> 状态：**待确认**，尚未进入实现。
>
> 目标：用一份契约覆盖截图里 4 处表格（区域产出明细、绩效评审、我的承诺、指标定义），
> 而不是每个表格各造一个组件。

---

## 一、为什么需要单独设计

截图里的 4 张表看起来一样，实际有三处语义差异，必须在契约里表达清楚，
否则实现出来只能覆盖其中一种：

| 截图位置 | 列结构 | 特殊之处 |
|---|---|---|
| 区域产出明细 | 区域 / 实际 / 计划 / 差距 | 差距列是**负数且标红** |
| 绩效评审 | 指标 / 数值 / 对比 / 定义 | 最后一列是**操作链接**（查看数据） |
| 我的承诺 | 任务 / 负责人 / 截止 / 状态 | 状态列是 **Badge**，行可**整行点击** |
| 指标定义 | 指标 / 数值 / 对比 / 定义 | 与「绩效评审」**完全同构**，只是数据不同 |

结论：一个 `Table` + 可配置的列类型，能覆盖全部四处。

---

## 二、契约设计

### 2.1 列定义

```ts
type TableColumn = {
  /** 列标题 */
  title: DynamicString
  /** 取值字段名，对应 data 中每行的 key */
  field: string
  /** 对齐；数字列必须右对齐，否则位数对不齐 */
  align?: 'start' | 'center' | 'end'   // 默认 start
  /** 列宽，CSS 长度字符串；不传则按内容自适应 */
  width?: string
  /** 单元格渲染方式，见 2.2 */
  cell?: 'text' | 'number' | 'badge' | 'link'
  /** cell='badge' 时使用的语义色字段名，行内每个值可以不同 */
  badgeToneField?: string
  /** cell='link' 时的显示文案与触发的 action */
  linkLabel?: DynamicString
  linkAction?: Action
}
```

### 2.2 三种单元格类型的取舍

| cell | 渲染 | 为什么单独成一类 |
|---|---|---|
| `text`（默认） | 纯文本 | —— |
| `number` | 等宽数字 + 可选负数标红 | 表格里数字必须右对齐且位数对齐，靠 CSS 无法从纯文本推断 |
| `badge` | `LeoBadge` | 状态列在截图里全是彩色标签，用纯文本会丢失语义 |
| `link` | `LeoLinkButton` | 最后一列的操作链接不是数据，是行为 |

**为什么不让 cell 直接传 React 节点**：契约要能被后端序列化成 JSON，
传组件会让契约层依赖 React，破坏 `a2ui-catalog` 只依赖 zod 的边界。

### 2.3 行级数据与点击

`Action.event.context` 支持 `DynamicValue`，所以行点击可以传行内字段：

```ts
row: {
  action?: Action   // 点击整行触发
}
```

但 **`context` 里的路径是相对整个数据模型的绝对路径**（如 `/rows/0/id`），
无法表达"当前行"。这意味着：

- ✅ 可以传**固定**的行标识字段名，由适配层在渲染时拼出当前行路径
- ❌ 契约层无法预知"当前行"，所以**行点击的数据注入必须在适配层完成**

这是本设计对协议的一处限制，实现时要在适配层写清楚。

---

## 三、完整 schema 草案

```ts
export const TableApi = {
  name: 'Table',
  schema: z.object({
    /** 表头列定义 */
    columns: z.array(ColumnSchema).min(1),
    /** 行数据，绑定到数据模型里的数组路径 */
    rows: CommonSchemas.DynamicValue,
    /** 空数据时的提示文案 */
    emptyText: CommonSchemas.DynamicString.default('暂无数据').optional(),
  }),
}
```

---

## 四、组件实现（a2ui-ui）

```tsx
export interface LeoTableColumn {
  title: string
  field: string
  align?: 'start' | 'center' | 'end'
  width?: string
  cell?: 'text' | 'number' | 'badge' | 'link'
  badgeToneField?: string
  linkLabel?: string
  onLinkClick?: (row: Record<string, unknown>) => void
}

export interface LeoTableProps {
  columns: LeoTableColumn[]
  rows: Record<string, unknown>[]
  emptyText?: string
  rowAction?: (row: Record<string, unknown>) => void
}
```

### 4.1 不用 `<table>` 的原因

需要支持「整行点击 + 悬停高亮 + 响应式收缩」。用 `<div>` + `role="table"/"row"/"cell"`
的语义化结构，Flexbox 排布，与仓库的禁 Grid 约束一致；
`<table>` 的 `display: table` 无法参与 Flex 布局，做不了这些。

无障碍属性必须齐全：`role="table"` / `role="row"` / `role="columnheader"` /
`role="cell"`，否则读屏器会把整块读成一段连续文本。

---

## 五、实现批次

| 步骤 | 内容 | 验证点 |
|---|---|---|
| 1 | `LeoTable` 组件（a2ui-ui） | 纯组件，LibraryDemo 里写四份数据验证 |
| 2 | `Table.api.ts` 契约 + `A2uiTable` 适配器 | 注册进 `selfBuilt`，一致性断言通过 |
| 3 | mock 里加一份表格数据 | 走 SSE 渲染 |

---

## 六、已知风险

1. **行点击的行上下文注入**：如 2.3 所述，需要适配层做路径拼接，协议本身不支持。
   如果后端将来要下发"点击第 3 行"，得靠适配层在渲染时记录行索引。
2. **列宽自适应**：数字列与文本列混排时，纯 `flex: auto` 会让窄列被挤扁。
   计划用 `flex: <width> 1 auto`，`width` 缺省时按内容基准宽度。
3. **超长内容**：截图里没有截断需求，但真实数据会出现。计划用
   `text-overflow: ellipsis` + `title` 属性兜底，不做多行截断。

---

## 七、需要你确认的点

1. **是否接受 `<div role="table">` 而非原生 `<table>`** —— 为了行点击与 Flex 布局。
2. **行点击的用途**：截图里「我的承诺」整行可点，但没说点了做什么。
   如果只是跳转，`rowAction` 就够了；如果要展开行内详情，契约要另加 `expand`。
3. **是否需要排序**：截图里没有排序控件。如果真实需求有，契约现在就要留
   `sortable` 字段，后补会破坏兼容。
