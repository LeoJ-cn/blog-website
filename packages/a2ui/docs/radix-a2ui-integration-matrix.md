# Radix UI × A2UI 接入能力清单

> 适用分支：`feature/v2-blog-website`
> 核对日期：2026-11-18
> 相关代码：`packages/a2ui-ui`（实现层）、`packages/a2ui-adapter`（适配层）、`packages/a2ui-catalog`（契约层）
> 外部依据：Radix Primitives 官方组件页、Radix Themes 官方组件页、npm registry 版本查询

本文回答一个问题：**现有 Radix UI 组件能否按「组件模式」接入 A2UI，并完整保留其功能；如果不能，应该换成哪个 TypeScript 库。**

---

## 1. 结论（先看这段）

1. **Radix Primitives 全部是「组件模式」组件，方向正确，不需要替换。** 它是零样式的无样式原语（unstyled primitives），只提供行为、键盘交互和 ARIA，视觉完全由 `--leo-*` / `--a2ui-*` 变量控制，与当前仓库的主题体系天然兼容。
2. **真正需要「引擎模式」的不是 Radix 组件，而是 Radix 根本不提供的那几类能力**：数据表格、图表、富文本、树、虚拟列表、代码编辑器、节点编辑器、地图。你已经替换的 Table 和 Chart 正属于这一类，判断是对的。
3. **Radix Themes 不纳入本项目。** 它自带主题层，会与 `--leo-*` 形成双轨；且其 `Grid` 组件直接违反仓库「禁止 CSS Grid」约束。
4. **接入与否的关键不在 Radix，而在 A2UI 协议的能力边界。** 有 4 类 Radix 组件在协议层无法完整表达：Toast（无副作用通道）、Direction Provider（全局 Provider 不是节点）、Slot（无 asChild 注入）、以及所有「触发器 + 内容」型组件只能降级为由适配层自绘触发器（Modal 已经是这个模式）。
5. 当前仓库只用了 3 个 Radix 原语（Checkbox / Dialog / Tabs），**这 3 个都已经完整接入并通过契约、适配器、实现三层落地**，可作为后续接入的模板。

---

## 2. 判定标准

### 2.1 什么是「组件模式」和「引擎模式」

本仓库在 A2UI 设计中已经使用过这两个词（见 `packages/a2ui/docs/2026-11-17-a2ui-test-app-design.md` 第 5.4 节，Chart 被称为「引擎模式」）。这里明确其边界：

| 模式 | 定义 | 典型特征 | 适合什么 |
|---|---|---|---|
| **组件模式** | 一个 UI 组件对应一个 A2UI 契约组件，字段扁平、可枚举，适配层把字段翻译成 props，React 直接渲染 | 交互原语、有明确状态机、字段少 | Button、Tabs、Select、Switch、Popover |
| **引擎模式** | 一个 A2UI 契约组件 + 少量描述性字段（`kind` / `columns` / `schema`），交给一个渲染引擎解释执行 | 类型多、数据驱动、内部状态复杂、逐类型写 JSX 会爆炸 | Chart、Table、富文本、树、虚拟列表 |

判断规则：

- **组件的能力边界由「字段」决定** → 组件模式。
- **组件的能力边界由「数据 + 渲染引擎」决定**（换一种 `kind` 就等于换一种图形/交互） → 引擎模式。

Radix Primitives 是前者；ECharts、TanStack Table 是后者。

### 2.2 A2UI 接入的三个硬条件

任何组件要走通 A2UI，必须同时满足：

| 层 | 要求 | 违反后果 |
|---|---|---|
| 契约层 `a2ui-catalog` | 只用 Zod + `CommonSchemas` 表达字段，不引 React / UI 库 | 后端拿不到 `catalog.json`，契约不可复用 |
| 适配层 `a2ui-adapter` | 只做字段翻译；`@a2ui/*` 只经 `protocol.ts` 引入；不 import `@radix-ui/*` | 依赖方向被破坏，跨端重写成本上升 |
| 实现层 `a2ui-ui` | 不 import `@a2ui/*`；第三方库只在这里声明；只用 `--leo-*` / `--a2ui-*`；禁 CSS Grid | 主题双轨、实现层与协议耦合 |

命名规则：`basicCatalog` 的 18 个组件**只新增、不覆盖**，所有自建组件必须带 `Leo` 前缀，否则 `assertCatalogConsistency()` 会在开发期抛错。

### 2.3 A2UI 协议的 8 条能力边界（决定「能否完整使用功能」）

这 8 条比 Radix 本身更影响结论，逐条列出：

| # | 边界 | 对 Radix 组件的影响 |
|---|---|---|
| 1 | `buildChild` 只能解析组件 id，**不能给子节点注入 `onClick` / `onContextMenu`** | Popover / HoverCard / Tooltip / DropdownMenu / ContextMenu / Collapsible / Accordion 的「触发器」都必须由适配层自己渲染一个按钮或文本区，不能挂到任意已有子组件上 |
| 2 | 没有副作用通道（action 只能上行到后端） | Toast、全局通知、命令式弹层无法作为组件树节点存在 |
| 3 | 没有 asChild / Slot 组合语义 | Radix 的 `asChild` 用法在 A2UI 中不可用，适配器必须渲染具体组件 |
| 4 | 子节点只能是组件 id，不能是任意 React 节点 | 复合组件的「每一项内容」必须拆成独立组件节点，由 `buildChild` 解析 |
| 5 | 受控值通过 `setValue` 回写 dataModel | 表单类组件（Select、Switch、RadioGroup、Slider、OTP）可以完整工作 |
| 6 | 临时 UI 状态（开/关、hover）协议不关心 | 必须由适配器内部 `useState` 维护，参考 `A2uiLeoModal` |
| 7 | 渲染器会插入 `display: contents` 的 custom element 包裹层 | 样式只能挂在组件自身 class 上，禁止父级后代选择器 |
| 8 | 协议 v0.9 无 `formatCurrency` 等 v1.0 函数 | 数值/金额格式化需在契约字段或适配层自行处理 |

---

## 3. Radix Primitives 全量清单（30 个组件）

官方组件页当前列出 30 个组件。判定列含义：✅ 完整接入 / 🟡 可接入但有折损或与已有组件重复 / 🔴 协议层不可用。

| # | Radix 组件 | 当前仓库状态 | 接入判定 | 建议契约形态 | 折损或注意事项 |
|---|---|---|---|---|---|
| 1 | Accordion | 未使用 | ✅ | `items[{title, child}]` + `type` + `collapsible` + `defaultValue` | 触发器由 title 渲染，不能包裹任意子节点（边界 1） |
| 2 | Alert Dialog | 未使用 | ✅ | `label` + `title` + `description` + `confirm/cancel` 两个 Action | 与 `LeoModal` 同法：适配层渲染入口按钮，不能用 `trigger` 字段 |
| 3 | Aspect Ratio | 未使用 | ✅ | `ratio` + `child` | 无 |
| 4 | Avatar | 未使用 | ✅ | `src` + `alt` + `fallback` | 加载失败回退由组件内部处理，无需字段 |
| 5 | Checkbox | **已接入** `LeoCheckBox` | ✅ | 已实现，含 `indeterminate` | 已用 `setValue` 回写，可直接复用模板 |
| 6 | Collapsible | 未使用 | ✅ | `title` + `child` + `defaultOpen` | 触发器只能自绘（边界 1）；`open` 状态在适配器内维护 |
| 7 | Context Menu | 未使用 | 🟡 | `label` + `items[{label, action}]` | 只能对自绘区域右键；无法挂到任意已有组件上；键盘 Shift+F10 仍保留 |
| 8 | Dialog | **已接入** `LeoModal` | ✅ | 已实现，无 `trigger` 字段 | 契约层已明确「不降级」：`trigger` 机制在 A2UI 中做不到 |
| 9 | Dropdown Menu | 未使用 | ✅ | `label` + `items[{label, action, disabled, separator}]` | 子菜单需要嵌套 child；checkbox/radio item 需扩展 `value` + `setValue` |
| 10 | Form | 未使用 | 🟡 | — | 不建议接入：`validationRegexp` + `checks` 已覆盖同一能力，新增会形成两套校验 |
| 11 | Hover Card | 未使用 | ✅ | `label` + `child` | 触屏无 hover，Radix 本身也不处理；触发器只能自绘 |
| 12 | Label | 未使用 | 🟡 | — | 无独立价值，用 basic `Text` 即可 |
| 13 | Menubar | 未使用 | 🟡 | `menus[{title, items}]` | 属应用外壳，不是 LLM 生成内容的典型形态；技术上可接 |
| 14 | Navigation Menu | 未使用 | 🟡 | `items[{title, action}]` | A2UI 无路由语义；链接跳转只能走 `openUrl` 函数 |
| 15 | One-Time Password Field | 未使用 | 🟡 | `length` + `value` + `onComplete` Action | 分格输入最终是拼接字符串；「填满自动提交」需要 action 才能回传 |
| 16 | Password Toggle Field | 未使用 | 🟡 | — | basic `TextField` 已有 `variant: obscured`，重复；不建议新增 |
| 17 | Popover | 未使用 | ✅ | `label` + `child` | 触发器只能自绘（边界 1） |
| 18 | Progress | 未使用 | ✅ | `value` + `max` + `label` | `a2ui-ui` 目前没有实现，需新建 `LeoProgress` |
| 19 | Radio Group | 未使用 | 🟡 | `options[{value,label}]` + `value` | basic `ChoicePicker` 已覆盖单选；仅在需要 Radix 语义时新增 |
| 20 | Scroll Area | 未使用 | ✅ | `height` + `child` | 滚动区高度必须由契约给出，否则无法计算视口 |
| 21 | Select | 未使用 | 🟡 | `options` + `value` + `placeholder` | 与 `ChoicePicker` 重叠；优势是分组与搜索；搜索词不进入 dataModel |
| 22 | Separator | 未使用 | 🟡 | — | basic `Divider` 已覆盖 |
| 23 | Slider | 未使用 | 🟡 | — | basic `Slider` 已覆盖（Web Component 实现） |
| 24 | Switch | 未使用 | ✅ | `label` + `value` + `onChange` 回写 | **无 basic 对等物，是值得新增的真实缺口** |
| 25 | Tabs | **已接入** `LeoTabs` | ✅ | 已实现，含 `variant: line / pill` | 面板内容由 `buildChild` 解析 |
| 26 | Toast | 未使用 | 🔴 | — | 无副作用通道（边界 2）；只能由宿主壳在 action 返回后调用，不能进 catalog |
| 27 | Toggle | 未使用 | ✅ | `label` + `value` | 可与 `Button` 合并为 `pressed` 变体，避免契约膨胀 |
| 28 | Toggle Group | 未使用 | ✅ | `options` + `value`（数组）+ 单选/多选 | 等价于分段控件；数组值需 `setValue` 支持 |
| 29 | Toolbar | 未使用 | 🟡 | — | 纯布局容器，用 basic `Row` / `Column` 即可 |
| 30 | Tooltip | 未使用 | ✅ | `label` + `text` 或 `child` | 触发器只能自绘；不能包裹任意现有节点 |

### 3.1 Radix Primitives Utilities（5 个）

| # | 工具 | 接入判定 | 说明 |
|---|---|---|---|
| 1 | Accessible Icon | 🟡 | basic `Icon` + `aria-label` 已覆盖 |
| 2 | Direction Provider | 🔴 | 全局 Provider，不是渲染树节点；属应用层配置 |
| 3 | Portal | 🟡 | Dialog / Popover 内部依赖，不是契约组件 |
| 4 | Slot | 🔴 | `asChild` 语义在 A2UI 中不存在（边界 3） |
| 5 | Visually Hidden | 🟡 | 可折叠为 `Text` 的 `srOnly` 变体，不必独立组件 |

### 3.2 统计

计数包含 Primitives 30 个与 Utilities 5 个，合计 35 个：

| 判定 | 数量 | 组件 |
|---|---|---|
| ✅ 完整可接入 | 17 | Accordion、Alert Dialog、Aspect Ratio、Avatar、Checkbox、Collapsible、Dialog、Dropdown Menu、Hover Card、Popover、Progress、Scroll Area、Switch、Tabs、Toggle、Toggle Group、Tooltip（含 3 个已接入） |
| 🟡 有折损或重复 | 15 | Context Menu、Form、Label、Menubar、Navigation Menu、OTP Field、Password Toggle Field、Radio Group、Select、Separator、Slider、Toolbar、Accessible Icon、Portal、Visually Hidden |
| 🔴 不可用 | 3 | Toast、Direction Provider、Slot |

> 口径说明：✅ 中 Checkbox / Dialog / Tabs 为已落地，其余 14 个是「可直接排期」的候选。🟡 中多数是「已有 basic 覆盖，不必新增」，只有 Context Menu 属于真实的协议折损。

---

## 4. Radix Themes（不纳入本项目）

Radix Themes 是带样式的成品组件库，共约 56 个组件。**整体排除**，理由与设计文档中排除 AntD / MUI / Mantine 一致：

| 问题 | 说明 |
|---|---|
| 主题双轨 | 自带 `<Theme>` Provider 与自有 CSS 变量，与 `--leo-*` / `--a2ui-*` 冲突，派生色会不一致 |
| 违反布局约束 | 提供 `Grid` 组件（`display: grid`），直接违反仓库「前端样式禁止 CSS Grid」 |
| 渲染器包裹层 | 其样式依赖父级作用域，A2UI 的 `display: contents` 包裹层会破坏部分选择器 |
| 体积 | 引入整包才能获得样式一致性，与「按需原语 + 自有 token」策略相反 |

Themes 中 `Table`、`Data List`、`Segmented Control`、`Skeleton`、`Badge` 等看似有用的组件，**在 Primitives 侧都能用原语 + Flexbox 自绘，或在第 5 节用引擎库替代**。

---

## 5. Radix 不提供、必须走「引擎模式」的能力

这一节回答「需要替换换成什么 TS 库」。版本均为 2026-11-18 查询 npm registry 的最新稳定版；**仅为候选，未安装**，安装前需按仓库规则单独确认。

| 能力 | 推荐库（精确版本） | 为什么是引擎模式 | 契约建议 |
|---|---|---|---|
| **数据表格** | `@tanstack/react-table` 9.3.1 + `@tanstack/react-virtual` 3.14.26 | headless：只输出行模型、排序、筛选、分组状态，渲染完全自绘，天然适配 A2UI 的「契约 → 适配器 → DOM」链路 | `columns[{key,title,align,width,format}]` + `data`（DynamicValue）+ `sortable/paginated`；一个 `LeoTable` 覆盖全部形态 |
| 数据表格（重交互备选） | `ag-grid-community` 36.3.0 | 内置渲染与编辑、分组、聚合；适合 Excel 级需求 | 同上，但包体积与主题接管成本显著更高 |
| **图表** | `echarts` 6.1.0（**已接入**） | 23 种图表类型由 `kind` + `series` 驱动，不需要为每种图表写一个组件 | 已实现，见 `LeoChart.api.ts` |
| **富文本编辑** | `@tiptap/react` 3.34.0 | 编辑器是状态机 + ProseMirror schema，不可能拆成一个字段一个 prop | `LeoTiptapEditor`：`value`（HTML/JSON）+ `toolbar` 布尔 + `onChange` 回写 |
| **树形控件** | `react-arborist` 4.0.1 | 需要扁平化、展开态、虚拟滚动、拖拽重排，属于数据驱动引擎 | `LeoTree`：`nodes` + `expandedIds` + `selectedId` + `onSelect` Action |
| **长列表虚拟滚动** | `@tanstack/react-virtual` 3.14.26（或 `react-virtuoso` 4.18.23） | 渲染策略由数据量决定，不能靠字段开关 | 作为 `LeoList` 的 `virtual` 实现细节，不单独开契约 |
| **命令面板 / 可搜索选择** | `cmdk` 1.1.1 | 过滤、分组、键盘导航是内部算法 | `LeoCommand`：`items` + `onSelect` Action；也可作为 `Select` 的搜索实现 |
| **日期选择** | `react-day-picker` 10.0.2 + Radix Popover | 日历的月视图状态、范围选择、禁用日期规则由引擎计算 | `LeoDatePicker`：`mode(single/range)` + `value` + `min/max` |
| **拖拽排序** | `@dnd-kit/core` 6.3.1 | 碰撞检测与拖拽状态无法用字段表达 | 作为 `LeoList` / `LeoTable` 的 `sortable` 内部实现 |
| **轮播** | `embla-carousel-react` 8.6.0 | 手势、吸附、循环是内部物理状态 | `LeoCarousel`：`items` + `autoplay` + `loop` |
| **地图** | `maplibre-gl` 6.19.0 | 渲染器独立于 React（WebGL 画布） | `LeoMap`：`center` + `zoom` + `layers`；仓库已有 OpenLayers 基座可复用 |
| **代码编辑器** | `@uiw/react-codemirror` 4.25.12 | 语法高亮、补全、编辑历史是编辑器内核 | `LeoCodeEditor`：`language` + `value` + `readOnly` |
| **节点/流程图编辑** | `@xyflow/react` 13.0.2 | 节点位置、连线、视口变换是图结构状态 | `LeoFlow`：`nodes[]` + `edges[]` + `onNodeClick` Action |
| **全局通知** | `sonner` 2.0.8 | 命令式 API，不进组件树 | **不接入 catalog**；由宿主壳订阅 action 结果后调用（见边界 2） |

### 5.1 关于你已经替换的 Table

补充一个当前仓库的事实，避免误判：

- `packages/ui/src/components/UiTable.vue` 是 **Vue + Element Plus** 的 `ElTable` 薄封装，只服务主站（Vue 应用）。
- `packages/a2ui-ui` 是 **React** 实现层，**不能复用 Element Plus**（它是 Vue 组件库）。
- 因此 a2ui 侧目前**没有 Table**。要接入必须新写 `LeoTable` + `LeoTable.api.ts` + `A2uiLeoTable.tsx`，渲染引擎用 `@tanstack/react-table`，不能包 `ElTable`。

---

## 6. `a2ui-ui` 已有但尚未接入 A2UI 的组件

这三个组件不是 Radix 组件，但属于同一批「实现层已完成、契约层缺失」的缺口，一并列出：

| 组件 | 文件 | 接入判定 | 说明 |
|---|---|---|---|
| `LeoBadge` | `packages/a2ui-ui/src/LeoBadge.tsx` | ✅ | `tone` 枚举 + `dashed`，字段完全可枚举，直接可写契约 |
| `LeoStatCard` | `packages/a2ui-ui/src/LeoStatCard.tsx` | ✅ | `label` / `value`（字符串）/ `caption` / `highlight`，适合看板类输出 |
| `LeoLinkButton` | `packages/a2ui-ui/src/LeoLinkButton.tsx` | ✅ | `action` + `arrow`，与 `Button` 同构 |

接入时同样需要同步三处：`a2ui-catalog/src/index.ts`、`a2ui-catalog/scripts/export.ts`、`a2ui-adapter/src/catalog.ts` 的 `selfBuilt`。

---

## 7. 接入优先级建议

| 优先级 | 组件 | 理由 |
|---|---|---|
| **P0** | `LeoSwitch`、`LeoBadge`、`LeoStatCard`、`LeoLinkButton` | 无 basic 对等物或已有实现，改动最小，收益直接 |
| **P1** | `LeoSelect`（搜索/分组）、`LeoPopover`、`LeoTooltip`、`LeoAccordion`、`LeoDropdownMenu` | 高频交互原语，需先确定「触发器自绘」的统一模式 |
| **P2** | `LeoTable`、`LeoDatePicker`、`LeoTree`、`LeoRichText` | 引擎模式，工作量最大，需先确认后端消息形态与数据量上限 |
| **不接入** | Toast、Direction Provider、Slot、Form、Label、Separator、Slider、Password Toggle Field | 协议不可表达或已被 basic catalog 覆盖 |

---

## 8. 接入检查清单

新增一个 Radix 组件时逐项核对：

- [ ] 契约写在 `a2ui-catalog/src/components/Leo<Name>.api.ts`，只用 Zod + `CommonSchemas`
- [ ] `a2ui-catalog/src/index.ts` 与 `scripts/export.ts` 都已登记
- [ ] 适配器写在 `a2ui-adapter/src/adapters/A2uiLeo<Name>.tsx`，只做字段翻译，不写样式、不 import `@radix-ui/*`
- [ ] 已加入 `a2ui-adapter/src/catalog.ts` 的 `selfBuilt`
- [ ] 组件名带 `Leo` 前缀，未与 basic catalog 的 18 个组件重名
- [ ] 受控值通过 `setValue` 回写；临时状态（开/关）在适配器内 `useState`
- [ ] 「触发器 + 内容」型组件由适配层自绘触发器，未假设可以给子节点注入事件
- [ ] 实现层样式只用 `--leo-*` / `--a2ui-*` 变量，未使用 CSS Grid，未依赖父级后代选择器
- [ ] 复杂字段、枚举成员、坐标/单位/边界语义已写简体中文注释

---

## 9. 一句话回答

**Radix Primitives 全部符合 A2UI 的组件模式，不需要为了接入而替换；需要替换成引擎库的是 Radix 根本不提供的 Table / Chart / 富文本 / 树 / 虚拟列表 / 编辑器 / 地图这几类。** 你现在换掉的 Table 和图表，正好落在应该走引擎模式的区间，判断是对的；Radix Themes 则应整体排除。
