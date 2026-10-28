# @white55/ui Dashboard Theme and Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task in the current session. Do not use subagent-driven development, Builder Check, or independent code review unless the user explicitly authorizes them in the current request.

**Goal:** 将 `@white55/ui` 重构为浅色默认、明暗同源的 Dashboard 主题，重校 11 个现有组件并新增 12 个组件及其完整公共出口和 Storybook 展示。

**Architecture:** `tokens.css` 提供稳定基础值，`theme.css` 映射浅色默认与深色语义 Token，并单向映射 Element Plus variables。组件保持薄封装：常用协议显式类型化，其余 attributes/listeners 透传；强依赖 Element Plus 上下文的子组件直接别名导出，自建组件仅承担无状态展示。

**Tech Stack:** Vue 3.5.13、TypeScript 5.6.3、Element Plus 2.9.5、Vite 6.0.11、Storybook 10.6.0、CSS custom properties、Flexbox。

**Spec:** `docs/superpowers/specs/2026-10-28-ui-dashboard-theme-components-design.md`

## Global Constraints

- 在当前目录与 `feature/v2-blog-website` 分支实施，不创建 worktree。
- 不安装依赖，不新增运行时依赖，所有现有依赖继续使用精确版本。
- 不执行任何 Webpack 命令；只保留现有 Webpack 能力。
- 自有样式禁止 CSS Grid；布局只使用 Flexbox、媒体查询或合理定位。
- 浅色主题为默认；`data-ui-theme="dark"` 提供同源深色主题。
- 未收到准确口令 `允许添加测试代码`，不得新增、修改或生成任何测试代码，也不得执行 TDD。
- 未收到准确口令 `允许自动启动页面测试`，不得启动 Storybook、操作浏览器或执行页面调试。
- 非页面测试、类型检查和构建在执行前必须先询问用户是否需要自动执行。
- 不使用 Builder Check、`superpowers:requesting-code-review` 或独立审查代理。
- 新增复杂逻辑、边界规则和非直观公开协议必须使用准确的简体中文注释。
- 保留用户已有未提交改动，不修改 `apps/web/**`、`packages/ui/figma/**`、`figma-node.json` 或其他任务外文件。

## Review Focus

- 局部 `.ui-theme` 与 Teleport 浮层：浮层必须使用触发器最近主题，而不是固定跟随根主题。
- `UiTrend` 冲突输入：显式 `direction` 必须优先于 `value` 正负号，零值默认推断为 `flat`。
- `UiList` key 与泛型：只接受 `string | number` 稳定 key，业务字段必须原样交给 scoped slot。
- 包装组件透传：ARIA attributes、未显式收口的 Element Plus props/listeners 和 slots 不得被包装层吞掉或重复触发。
- 主题完整性：浅色默认、显式浅色和深色必须覆盖 hover、active、focus-visible、disabled、loading、empty 和 overlay 状态。

> 由于测试代码尚未获授权，上述风险不创建自动化测试；分别在对应任务中以类型诊断、静态检查和待授权的 Storybook 人工检查固定验证方式。

---

### Task 1: 建立 Dashboard 主题基础

**Files:**
- Modify: `packages/ui/src/styles/tokens.css`
- Modify: `packages/ui/src/styles/theme.css`
- Modify: `packages/ui-playground/.storybook/preview.ts`
- Modify: `packages/ui-playground/src/storybook.css`

**Interfaces:**
- Produces: 浅色默认与深色共用的 `--ui-*` 语义 Token；所有后续组件 CSS 只消费这些语义 Token。
- Produces: `:root`、`.ui-theme`、显式 light 与显式 dark 四种稳定作用域。

- [ ] **Step 1:** 在 `tokens.css` 建立中性色、蓝/紫强调色、状态色、间距、字号、控件高度、圆角和阴影基础值；保留“组件不得直接依赖基础层”的中文注释。
- [ ] **Step 2:** 在 `theme.css` 将 `:root` 与 `.ui-theme` 改为浅色默认，并让显式 light 复用相同语义值。
- [ ] **Step 3:** 在 `theme.css` 定义同名 dark 语义 Token，并统一映射 Element Plus 的 primary、text、background、overlay、border、fill、disabled、mask、radius 与状态变量。
- [ ] **Step 4:** 更新 Storybook preview，使根节点默认浅色，并保留 story 内局部 `.ui-theme[data-ui-theme]` 的嵌套能力。
- [ ] **Step 5:** 更新 `storybook.css` 的页面、story 容器、行、字段与主题对照容器；所有排列使用 Flexbox。
- [ ] **Step 6:** 静态检查本任务文件不存在 `display: grid` 或 `grid-*`，并确认组件样式尚未直接引用新增基础 Token。

### Task 2: 重校现有组件样式

**Files:**
- Modify: `packages/ui/src/styles/button.css`
- Modify: `packages/ui/src/styles/input.css`
- Modify: `packages/ui/src/styles/select.css`
- Modify: `packages/ui/src/styles/dialog.css`
- Modify: `packages/ui/src/styles/loading.css`
- Modify: `packages/ui/src/styles/empty-state.css`
- Modify: `packages/ui/src/styles/form.css`
- Modify: `packages/ui/src/styles/table.css`
- Modify: `packages/ui/src/styles/checkbox.css`
- Modify: `packages/ui/src/styles/rate.css`
- Modify: `packages/ui/src/styles/icon.css`

**Interfaces:**
- Consumes: Task 1 的语义 Token。
- Produces: 11 个现有组件统一的尺寸、层级和交互状态；不改变现有 Vue 公共 API。

- [ ] **Step 1:** 重校 Button、Input、Select、Checkbox、Rate 与 Icon 的高度、圆角、边框、字体、hover、active、focus-visible、disabled 和 loading 状态。
- [ ] **Step 2:** 重校 Dialog、Table、Form、Loading 与 EmptyState 的面板、遮罩、表头、条纹行、错误、空状态和明暗主题层级。
- [ ] **Step 3:** 检查每个 CSS 文件只消费语义 Token 或 Element Plus variables，不直接消费 `--ui-base-*`。
- [ ] **Step 4:** 静态扫描全部触碰样式，确认没有 CSS Grid，也没有为了主题分别复制组件结构规则。

### Task 3: 新增基础展示组件

**Files:**
- Create: `packages/ui/src/components/UiCard.vue`
- Create: `packages/ui/src/components/UiAvatar.vue`
- Create: `packages/ui/src/components/UiStatistic.vue`
- Create: `packages/ui/src/components/UiTrend.vue`
- Create: `packages/ui/src/components/UiProgress.vue`
- Create: `packages/ui/src/components/UiList.vue`
- Create: `packages/ui/src/styles/card.css`
- Create: `packages/ui/src/styles/avatar.css`
- Create: `packages/ui/src/styles/statistic.css`
- Create: `packages/ui/src/styles/trend.css`
- Create: `packages/ui/src/styles/progress.css`
- Create: `packages/ui/src/styles/list.css`

**Interfaces:**
- `UiTrend`: `value: number`；`direction?: 'up' | 'down' | 'flat'`；`format?: 'percent' | 'number' | ((value: number) => string)`，默认 `percent`。
- `UiListItem`: `{ key: string | number }`；`UiList` 接受只读 items、`density?: 'compact' | 'default' | 'comfortable'` 和 `divided?: boolean`。
- Produces: 六个 Vue SFC 及其稳定 `ui-*` 样式类，供 Task 5 公共导出。

- [ ] **Step 1:** 实现 `UiCard`、`UiAvatar`、`UiStatistic` 与 `UiProgress` 的 Element Plus 薄封装，显式声明常用 props/events/slots，并将其余 attrs 透传到根组件。
- [ ] **Step 2:** 实现 `UiTrend` 的纯派生显示：未传 direction 时按正、负、零推断，显式 direction 优先；自定义 formatter 接收原始 value；为这些非直观规则添加简体中文注释。
- [ ] **Step 3:** 实现 `UiList` 的语义列表、稳定 key、typed scoped slot、默认 empty、可覆盖 empty slot、三档 density 和默认开启的 divided；不持有选择、分页或业务状态。
- [ ] **Step 4:** 为六个组件编写只依赖语义 Token 的样式，使用图形、文本和颜色共同表达 Trend 方向。
- [ ] **Step 5:** 检查所有 SFC 顺序为 `<script setup lang="ts">`、`<template>`、`<style>`（如存在），公开联合类型与边界规则具备简体中文注释。
- [ ] **Step 6:** 静态核对 Review Focus 中 Trend 冲突输入和 List key/泛型行为均由实现明确覆盖。

### Task 4: 新增上下文组件与浮层主题传播

**Files:**
- Create: `packages/ui/src/components/UiMenu.vue`
- Create: `packages/ui/src/components/UiBreadcrumb.vue`
- Create: `packages/ui/src/components/UiTabs.vue`
- Create: `packages/ui/src/components/UiDropdown.vue`
- Create: `packages/ui/src/components/UiTooltip.vue`
- Create: `packages/ui/src/composables/useUiFloatingTheme.ts`
- Create: `packages/ui/src/styles/menu.css`
- Create: `packages/ui/src/styles/breadcrumb.css`
- Create: `packages/ui/src/styles/tabs.css`
- Create: `packages/ui/src/styles/dropdown.css`
- Create: `packages/ui/src/styles/tooltip.css`

**Interfaces:**
- `useUiFloatingTheme(anchor: Readonly<ShallowRef<HTMLElement | null>>)` returns `{ popperClass: Readonly<Ref<string>>, refreshTheme: () => void }`。
- `UiSubMenu`、`UiBreadcrumbItem`、`UiTabPane`、`UiDropdownMenu`、`UiDropdownItem` 直接别名导出 Element Plus 子组件，不创建复制状态的 SFC。
- Produces: 五个父组件包装层、浮层主题传播 composable 和五个样式文件。

- [ ] **Step 1:** 实现 `useUiFloatingTheme`：从 anchor 最近 `.ui-theme` 或根节点解析 light/dark，在浮层显示前刷新并返回稳定 Popper theme class；为局部主题、根主题回退和 DOM 生命周期添加简体中文注释及清理逻辑。
- [ ] **Step 2:** 实现 `UiMenu`、`UiBreadcrumb` 与 `UiTabs` 薄封装，显式收口常用协议并透传其余 attrs、listeners 与 slots，不复制父子注册状态。
- [ ] **Step 3:** 实现 `UiDropdown` 与 `UiTooltip`，保持 Element Plus Teleport，并通过 `useUiFloatingTheme` 把触发器最近主题 class 传给 Popper。
- [ ] **Step 4:** 编写菜单层级、面包屑、标签页、下拉浮层和 Tooltip 样式；所有状态只消费语义 Token。
- [ ] **Step 5:** 核对子组件仍由 Element Plus 管理 provide/inject、command、tab 注册、展开和键盘交互。
- [ ] **Step 6:** 静态核对 aria attributes、透传 listeners、默认/named slots 和浮层主题 class 不被包装层吞掉或重复触发。

### Task 5: 补齐公共出口、独立子路径与 catalog

**Files:**
- Create: `packages/ui/src/entries/card.ts`
- Create: `packages/ui/src/entries/avatar.ts`
- Create: `packages/ui/src/entries/menu.ts`
- Create: `packages/ui/src/entries/sub-menu.ts`
- Create: `packages/ui/src/entries/breadcrumb.ts`
- Create: `packages/ui/src/entries/tabs.ts`
- Create: `packages/ui/src/entries/dropdown.ts`
- Create: `packages/ui/src/entries/statistic.ts`
- Create: `packages/ui/src/entries/trend.ts`
- Create: `packages/ui/src/entries/progress.ts`
- Create: `packages/ui/src/entries/list.ts`
- Create: `packages/ui/src/entries/tooltip.ts`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/catalog.ts`
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/vite.config.ts`

**Interfaces:**
- Produces: 根入口与 12 个新增独立 JS 子路径；`sub-menu` 单独导出 `UiSubMenu`，`menu` 子路径也可同时导出 `UiSubMenu`，其他附属子组件随父组件导出。
- Produces: 12 个新增 catalog slug；除明确要求的 `UiSubMenu` 外，附属子组件不单列 slug。

- [ ] **Step 1:** 创建独立 entry 文件，12 个明确要求的组件均提供 kebab-case JS 子路径；父组件子路径同时导出关联附属子组件。
- [ ] **Step 2:** 更新根入口，导出全部 12 个组件、必要子组件和 `UiListItem` 等公共类型。
- [ ] **Step 3:** 更新 catalog，追加 `card`、`avatar`、`menu`、`sub-menu`、`breadcrumb`、`tabs`、`dropdown`、`statistic`、`trend`、`progress`、`list`、`tooltip` 共 12 个 slug；其他附属子组件不新增独立 slug。
- [ ] **Step 4:** 更新 `package.json exports`，为新增 JS 与 CSS 提供独立路径；不改变依赖版本。
- [ ] **Step 5:** 更新 `vite.config.ts` library entries，并继续 externalize Vue 与全部 Element Plus imports。
- [ ] **Step 6:** 静态逐项比对组件、entry、CSS、exports、Vite entry 和 catalog，确认不存在缺项或命名漂移。

### Task 6: 更新 Storybook 展示

**Files:**
- Modify: `packages/ui-playground/src/button.stories.ts`
- Modify: `packages/ui-playground/src/input.stories.ts`
- Modify: `packages/ui-playground/src/select.stories.ts`
- Modify: `packages/ui-playground/src/dialog.stories.ts`
- Modify: `packages/ui-playground/src/loading.stories.ts`
- Modify: `packages/ui-playground/src/empty-state.stories.ts`
- Modify: `packages/ui-playground/src/form.stories.ts`
- Modify: `packages/ui-playground/src/table.stories.ts`
- Modify: `packages/ui-playground/src/checkbox.stories.ts`
- Modify: `packages/ui-playground/src/rate.stories.ts`
- Modify: `packages/ui-playground/src/icon.stories.ts`
- Create: `packages/ui-playground/src/card.stories.ts`
- Create: `packages/ui-playground/src/avatar.stories.ts`
- Create: `packages/ui-playground/src/menu.stories.ts`
- Create: `packages/ui-playground/src/sub-menu.stories.ts`
- Create: `packages/ui-playground/src/breadcrumb.stories.ts`
- Create: `packages/ui-playground/src/tabs.stories.ts`
- Create: `packages/ui-playground/src/dropdown.stories.ts`
- Create: `packages/ui-playground/src/statistic.stories.ts`
- Create: `packages/ui-playground/src/trend.stories.ts`
- Create: `packages/ui-playground/src/progress.stories.ts`
- Create: `packages/ui-playground/src/list.stories.ts`
- Create: `packages/ui-playground/src/tooltip.stories.ts`

**Interfaces:**
- Consumes: Task 5 的公共子路径与 CSS exports。
- Produces: 23 个组件的浅色默认展示、关键状态展示和可复用深色主题对照。

- [ ] **Step 1:** 更新现有 stories 的示例数据、状态组合和布局，使其展示 Dashboard 主题且只从 `@white55/ui` 公共入口或独立子路径导入。
- [ ] **Step 2:** 为基础展示组件创建 stories，覆盖 Card slots、Avatar fallback、Statistic formatting、Trend 三方向与冲突输入、Progress 状态、List density/empty/scoped slot。
- [ ] **Step 3:** 为上下文组件创建 stories；`UiMenu` 与 `UiSubMenu` 各自拥有 catalog story，同时覆盖 BreadcrumbItem、TabPane、Dropdown 子组件和 Tooltip content slot。
- [ ] **Step 4:** 为代表性组件增加局部 dark 容器，与默认浅色并列展示；Dropdown/Tooltip story 必须覆盖深色局部容器中的 Teleport 浮层。
- [ ] **Step 5:** 静态检查 stories 不引用组件内部路径、不使用 CSS Grid，并与 catalog slug 一一对应。

### Task 7: 完整诊断与授权内验证

**Files:**
- Review: 本计划所有触碰文件。

**Interfaces:**
- Consumes: Tasks 1–6 的完整实现。
- Produces: 可核对的诊断、协议、布局和验证结果；不创建测试代码。

- [ ] **Step 1:** 检查所有触碰文件的完整 TypeScript/Vue/CSS 诊断，不只检查修改行；先修复本批引入的问题。
- [ ] **Step 2:** 人工审查实现逻辑和公开声明协议，重点核对 Trend、List、主题传播、联合类型、默认值、时间单位和边界语义的简体中文注释。
- [ ] **Step 3:** 使用精准静态搜索确认自有源码不存在 CSS Grid，新增组件不存在内部路径消费，公共出口不存在缺项。
- [ ] **Step 4:** 在执行前询问用户是否需要自动运行非页面验证；获准后运行仓库既有 `@white55/ui` typecheck 和允许的 Vite library build，记录真实输出。
- [ ] **Step 5:** 在执行前询问并取得准确口令 `允许自动启动页面测试`；仅在获准后启动 Storybook，检查浅色默认、显式浅色、深色、局部主题浮层和关键交互状态。
- [ ] **Step 6:** 若未获某项授权，提供用户可直接执行的命令、操作步骤和预期结果，并明确标记该项尚未验证。
- [ ] **Step 7:** 汇总所有触碰文件、验证状态、既有错误与未授权检查；未满足完成清单前不得宣称本批完成。

### Task 8: 扩展完整图标库

**Files:**
- Modify: `packages/ui/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/ui/src/components/UiIcon.vue`
- Create: `packages/ui/src/entries/icons.ts`
- Modify: `packages/ui/vite.config.ts`
- Modify: `packages/ui-playground/src/icon.stories.ts`
- Modify: `packages/ui-playground/src/storybook.css`
- Modify: 本设计文档与实施计划

**Interfaces:**
- Consumes: `@element-plus/icons-vue@2.3.2` 的官方具名组件出口。
- Produces: `@white55/ui/icons` 完整具名图标入口，以及 `UiIcon` 的 `icon` 属性和默认插槽两种消费方式。

- [x] **Step 1:** 以精确版本声明图标 peer/dev dependency；安装由用户自行执行。
- [x] **Step 2:** 为 `UiIcon` 增加 `icon` 组件属性，并固定“默认插槽优先”的冲突行为。
- [x] **Step 3:** 新增独立 `icons` entry、package export 和 Vite library entry；不污染根入口，构建时继续 externalize 官方图标包。
- [x] **Step 4:** 更新 Icon stories，同时展示属性与插槽写法，并用 Flexbox 提供可搜索的完整图标图鉴。
- [x] **Step 5:** 用户已手动完成依赖安装、现有类型检查、Vite 构建和 Storybook 页面验证，并反馈没有报错；未新增测试代码，未执行 Webpack。

## Plan Self-Review

- Spec coverage: Tasks 1–8 覆盖主题、现有组件、新组件、完整图标入口、浮层主题、出口、catalog、Storybook 与验证边界。
- Step scan: 每个步骤只承担一类可核对动作；没有把测试、构建或页面授权隐含在实施步骤中。
- Type consistency: `UiTrend`、`UiListItem`、density、子组件别名和 `useUiFloatingTheme` 的名称在生产、出口和 stories 中保持一致。
- Review Focus: 五项高风险分别固定到 Tasks 1、3、4、6、7 的静态或待授权人工检查。
- Proportion: 计划只锁定文件、公共协议、任务边界和验证条件，不展开可由实现者直接完成的组件函数体。
