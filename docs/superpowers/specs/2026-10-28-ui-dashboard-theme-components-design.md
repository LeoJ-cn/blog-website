# @white55/ui Dashboard 主题与组件扩建设计

## 1. 背景与意图

`@white55/ui` 当前以深色 Slate + Mint 为默认视觉，已有组件主要承担 Element Plus 的薄封装与样式收口。本次改造以用户提供的 Dashboard 截图为视觉基准，将组件库统一为浅色、克制、面向数据产品的 Dashboard 风格，同时保留同一语义体系下重新校准的深色模式，并新增 12 个组件。

目标使用者是仓库内需要快速组合管理后台、技术展示和 Developer Playground 页面的人。成功标准不是逐像素复制截图，而是抽取其中稳定、可复用的视觉语言：白色页面与面板、柔和灰色层级、淡蓝与淡紫强调面、黑灰正文、低对比辅助信息、细边框、适度圆角和轻量阴影。

## 2. 目标

- 将浅色主题设为无须显式属性即可生效的默认主题。
- 保留 `data-ui-theme="dark"`，使用与浅色主题同源的语义 Token，而非维护独立且割裂的配色体系。
- 重构 `tokens.css`、`theme.css` 及全部现有组件样式，使现有组件与新增组件共享视觉规则。
- 新增 `UiCard`、`UiAvatar`、`UiMenu`、`UiSubMenu`、`UiBreadcrumb`、`UiTabs`、`UiDropdown`、`UiStatistic`、`UiTrend`、`UiProgress`、`UiList`、`UiTooltip`。
- 为需要组合使用的组件导出必要子组件，并保持 Element Plus 的状态管理、键盘交互、可访问性和弹层逻辑。
- 同步维护根公共入口、独立子路径、Vite library entries、CSS exports、catalog 与 Storybook。
- 自有布局全部使用 Flexbox、媒体查询或合理定位，不使用 CSS Grid。

## 3. 非目标与反目标

### 非目标

- 不实现完整 Dashboard 页面或具体技术 Demo。
- 不替换 Element Plus，也不复制其菜单、标签页、下拉菜单、弹层或表单状态机。
- 不引入新的运行时依赖、图标库、主题框架或 CSS-in-JS 方案。
- 不改变 Vite 与 Webpack 5 双管线的既有工程定位；本任务不执行 Webpack 命令。
- 不在未获得准确口令前新增或修改测试代码。

### 反目标

- 不能只替换主色而保留旧主题的高对比、厚重面板和不一致状态。
- 不能让浅色与深色各自维护一套组件级硬编码颜色。
- 不能通过过度封装缩窄 Element Plus 的常用能力，或让调用方绕过 `@white55/ui` 公共入口依赖内部实现。
- 不能为了模仿截图而使用不可复用的页面级尺寸、绝对坐标或 CSS Grid。

## 4. 已考虑方案

### 方案 A：仅改 Token，组件尽量保持原样

改动小、迁移风险低，但组件内部间距、边框、浮层、状态与新增组件难以形成同一视觉语言，无法充分达到截图目标。

### 方案 B：Token + 现有组件系统重塑 + 12 个统一封装

由语义 Token 统一明暗主题，重校全部现有组件，再按一致的 API、样式和导出模式新增组件。视觉一致性、兼容性和维护成本最平衡。

### 方案 C：完全脱离 Element Plus 自研

视觉控制力最高，但需要重新承担可访问性、键盘交互、浮层定位和复杂状态，成本与维护风险不符合当前工程骨架阶段。

### 选择

用户选择方案 B。

## 5. 主题架构

### 5.1 分层模型

主题继续保持两层：

1. `tokens.css` 定义不会随主题切换的基础值，包括中性色阶、蓝色、紫色、状态色、间距、圆角、阴影、字号和控件高度。
2. `theme.css` 将基础值映射为语义 Token，并单向映射到 Element Plus CSS variables。

组件样式只消费语义 Token，不直接使用基础色值。只有 `theme.css` 可以把基础值映射为主题语义或 Element Plus variables。

### 5.2 默认主题与作用域

- `:root` 与 `.ui-theme` 默认承载浅色主题，无须 `data-ui-theme="light"`。
- `.ui-theme[data-ui-theme="light"]` 与 `:root[data-ui-theme="light"]` 保留显式浅色写法，结果必须与默认主题一致。
- `.ui-theme[data-ui-theme="dark"]` 与 `:root[data-ui-theme="dark"]` 覆盖同一组语义 Token，形成深色主题。
- 同一页面允许嵌套 `.ui-theme` 局部主题容器，普通组件始终继承最近主题容器的语义 Token。
- `UiDropdown`、`UiTooltip` 等浮层继续使用 Element Plus 的 Teleport，不通过关闭 Teleport 破坏定位和可访问性行为。包装组件必须识别最近的主题容器，并向 Popper 传递对应主题 class，使浮层视觉与触发器所在局部主题一致。
- `:root[data-ui-theme]` 作为未处于局部主题容器时的全局主题来源。
- 组件不得根据主题编写两套结构，只允许消费变化后的语义值。

### 5.3 语义 Token 方向

语义 Token 至少覆盖：

- 页面、面板、柔和面板、浮层、悬停面和选中面。
- 主正文、次正文、弱化文字、禁用文字和反色文字。
- 常规边框、弱边框、强调边框与分隔线。
- 主操作、主操作悬停、主操作按压、焦点环和危险状态。
- 淡蓝与淡紫数据强调面及其前景色。
- 控件与面板圆角、控件高度、紧凑/常规间距、面板内边距。
- 面板阴影与浮层阴影。

浅色使用接近白色的页面和面板、冷灰分层及近黑正文；深色使用冷调深灰表面和降低亮度的蓝紫强调色。深色不是旧 Slate + Mint 的延续，也不以纯黑背景和高饱和荧光色为目标。

### 5.4 Element Plus 映射

`theme.css` 统一映射 `--el-color-primary`、文本层级、背景/浮层、边框、填充、禁用、遮罩、圆角和常用状态变量。组件 CSS 只补充组件特有变量或结构样式，避免在每个组件中重复覆盖全局主题。

## 6. 组件边界与公共协议

### 6.1 封装原则

- Vue 组件使用 Vue 3 Composition API 与 `<script setup lang="ts">`。
- 包装组件使用 `inheritAttrs: false`，将未收口的 Element Plus props、ARIA attributes 与 listeners 转发到根组件。
- 对库需要稳定承诺的常用 props、events 与 slots 给出显式类型；不重复声明只为无差别透传的完整 Element Plus API。
- 事件由包装层显式转发时保留原始 payload，不引入第二套状态。
- 强依赖父级上下文或底层 provide/inject 的子组件直接别名导出，避免复制状态机。
- 组件独有样式使用稳定的 `ui-*` 类名；Element Plus 内部选择器只用于必要的主题收口，不依赖脆弱 DOM 层级。

### 6.2 新组件设计

| 组件 | 实现边界 | 主要公共能力 |
| --- | --- | --- |
| `UiCard` | 薄封装 `ElCard` | `header`、`footer` 与默认 slot；`shadow`、`bodyStyle` 等常用能力；统一面板边框、圆角、阴影和内边距 |
| `UiAvatar` | 薄封装 `ElAvatar` | `size`、`shape`、`src`、`fit`、`icon`；默认 slot 与加载失败事件；统一边框和回退底色 |
| `UiMenu` | 薄封装 `ElMenu` | 保留 `defaultActive`、`defaultOpeneds`、`mode`、`collapse` 与选择/展开事件；统一导航层级、选中态和折叠态 |
| `UiSubMenu` | 直接将 `ElSubMenu` 别名导出 | 保持 `ElMenu` 上下文、展开状态与键盘协议，不复制 provide/inject |
| `UiBreadcrumb` | 薄封装 `ElBreadcrumb` | `separator`、`separatorIcon` 与默认 slot；统一字号和弱化分隔符 |
| `UiBreadcrumbItem` | 直接将 `ElBreadcrumbItem` 别名导出 | 保持父级上下文与导航行为 |
| `UiTabs` | 薄封装 `ElTabs` | `modelValue`、`type`、`tabPosition`、`stretch` 与切换事件；统一下划线/卡片态 |
| `UiTabPane` | 直接将 `ElTabPane` 别名导出 | 保持标签注册、懒加载与父级上下文 |
| `UiDropdown` | 薄封装 `ElDropdown` | 触发方式、位置、隐藏行为、command/visible 事件与默认、dropdown slot |
| `UiDropdownMenu`、`UiDropdownItem` | 直接将 Element Plus 子组件别名导出 | 保持 command、disabled、divided 和 roving interaction 行为 |
| `UiStatistic` | 薄封装 `ElStatistic` | `value`、`precision`、`prefix`、`suffix`、格式化函数和 slots；统一标题、数值与辅助信息层级 |
| `UiTrend` | 自建无状态轻量组件 | `value` 接受数字；`direction` 为 `up | down | flat`；`format` 接受 `percent | number` 或自定义格式化函数；通过语义色、图形与文本共同表达趋势，不能只依赖颜色 |
| `UiProgress` | 薄封装 `ElProgress` | `percentage`、`type`、`status`、`strokeWidth`、`textInside` 与格式化能力；统一轨道和状态色 |
| `UiList` | 自建展示型轻量组件 | `items` 接受带稳定 `key` 的只读数组；默认 scoped slot 暴露 `item`、`index`；提供 `empty` slot；支持 `divided` 与 `compact | default | comfortable` 三档密度，不持有选择或分页状态 |
| `UiTooltip` | 薄封装 `ElTooltip` | `content`、`placement`、`trigger`、`disabled`、`showAfter`、`hideAfter` 与 content/default slots；统一浮层色、边框、圆角和阴影 |

`UiTrend` 的 `format` 公共类型为 `'percent' | 'number' | ((value: number) => string)`，默认使用 `percent`。未传 `direction` 时，正数推断为 `up`、负数推断为 `down`、零推断为 `flat`；显式 `direction` 始终优先于数值符号，以支持“数值下降但业务表现改善”等业务语义。无障碍文本以最终方向和格式化结果为准。

`UiList` 的 item 最小结构固定为 `{ key: string | number }`，其他业务字段通过泛型保留并原样传给 scoped slot。`density` 公共类型为 `'compact' | 'default' | 'comfortable'`，默认 `default`；`divided` 默认开启。空数组提供无侵入的默认提示，同时允许 `empty` slot 完整覆盖。

`UiTrend` 的方向推断、显式方向优先级、格式化规则，以及 `UiList` 的 item、密度和分隔线默认值均属于非直观公开契约，实施时必须使用简体中文注释逐项说明边界。如无法在不牺牲泛型推断的情况下稳定导出泛型 SFC 类型，`UiList` 仍应保持上述最小结构协议，不在组件内解释业务字段。

### 6.3 现有组件重校

`UiButton`、`UiInput`、`UiSelect`、`UiDialog`、`UiLoading`、`UiEmptyState`、`UiForm`、`UiTable`、`UiCheckbox`、`UiRate`、`UiIcon` 继续保留当前职责与公共 API，重点调整：

- 高度、圆角、边框、字体权重与间距。
- hover、active、focus-visible、disabled、loading 与 error 状态。
- 面板与浮层背景、遮罩、表头、条纹行和空状态层级。
- 明暗主题下的对比度与状态一致性。

兼容性调整原则是优先保持已有 API；只有现有声明与 Element Plus 实际 payload 明显冲突且会阻碍新组件体系时才修正，并在实施计划中单列影响。

### 6.4 完整图标入口

- `UiIcon` 同时支持 `icon` 组件属性与默认插槽；两者同时存在时默认插槽优先，避免重复渲染。
- `@white55/ui/icons` 对 `@element-plus/icons-vue@2.3.2` 做完整具名重导出，业务侧按名称导入所需图标并保留 tree-shaking。
- 图标集合不进入 `@white55/ui` 根入口，不全局注册，也不为每个图标创建 `Ui*` 包装组件，避免根入口命名污染和无效维护层。
- Storybook 可一次性导入全部图标用于可搜索图鉴；该用法只服务于组件展示，不作为业务消费示例。

## 7. 样式与布局

- 每个公开组件保留独立 CSS 文件和独立 CSS 子路径，便于按需使用。
- 所有 CSS 文件依赖 `tokens.css` + `theme.css`，不自行声明主题模式。
- 自有多栏、换行、对齐和响应式结构使用 Flexbox；禁止任何 `display: grid`、`grid-template-*`、`grid-column`、`grid-row` 或 `grid-area`。
- 菜单、列表、统计和 Storybook 示例中的排列使用 `display: flex`、`flex-wrap`、`flex-basis`、`gap` 与媒体查询。
- 浮层定位继续由 Element Plus/Popper 管理；自建组件不新增绝对定位浮层。

## 8. 导出、构建与消费路径

新增组件必须同步更新：

1. `packages/ui/src/index.ts` 根入口。
2. `packages/ui/src/entries/*.ts` 独立组件入口；组合子组件与父组件从同一子路径导出。
3. `packages/ui/package.json` 的 JS 与 CSS `exports`。
4. `packages/ui/vite.config.ts` 的 library entries。
5. `packages/ui/src/catalog.ts` 的 slug 联合类型。
6. `packages/ui/src/styles/*.css` 与现有样式复制流程。

独立子路径命名使用 kebab-case，例如 `@white55/ui/breadcrumb`、`@white55/ui/empty-state`。用户明确要求的 `UiSubMenu` 作为 12 个新增组件之一，提供 `@white55/ui/sub-menu` 独立 JS 子路径；`UiBreadcrumbItem`、`UiTabPane`、`UiDropdownMenu`、`UiDropdownItem` 等附属子组件只随父组件子路径导出，避免使用方式碎片化。

## 9. Storybook 与 catalog

- 每个新增组件提供独立 Storybook story，覆盖最能说明公共协议和视觉状态的示例。
- 现有 stories 随主题重构校准展示背景、间距和状态组合。
- Storybook 默认展示浅色主题，并提供同一 story 的显式深色主题容器，以验证主题不是组件内硬编码。
- story 只从 `@white55/ui` 公共入口或对应独立子路径导入，不直接引用 `packages/ui/src/components`。
- 示例布局只使用 Flexbox。
- catalog 新增 12 个组件 slug，其中 `UiSubMenu` 使用独立 `sub-menu` slug；额外导出的 `UiBreadcrumbItem`、`UiTabPane`、`UiDropdownMenu`、`UiDropdownItem` 不作为独立 catalog 项。

## 10. 可访问性与交互

- 保留 Element Plus 已提供的键盘交互、ARIA 关联、焦点管理和 Popper 行为。
- 所有可交互组件保留清晰的 `focus-visible` 状态，焦点环在明暗主题下均可辨认。
- `UiTrend` 同时呈现方向图形与可读文本；颜色只作为辅助信息。
- `UiList` 输出语义列表结构，并允许调用方通过 slot 决定行内容；空数组时渲染 `empty` slot 或无侵入默认提示。
- 禁用态必须同时体现交互不可用和视觉弱化，不能只降低透明度到不可读。

## 11. 验证策略与授权边界

当前未收到 `允许添加测试代码`，因此实施不得新增、修改或生成测试文件、测试用例、fixture、helper 或临时测试脚本，也不采用 TDD 流程。

当前未收到 `允许自动启动页面测试`，因此不得启动 Storybook、操作浏览器或自动执行页面调试。当前也未取得非页面测试自动执行许可，因此实施计划必须在执行相关命令前单独询问。

在获得相应执行许可后，建议的验证层级为：

1. 静态检查：检查公共导出、独立子路径、catalog slug、CSS 子路径和禁止 Grid 规则。
2. 类型检查：`@white55/ui` 与 `ui-playground` 的既有 typecheck/构建能力，以仓库实际脚本为准。
3. Vite 构建：仅执行允许的 `build:vite`，确认 library entries 与 Storybook 构建。
4. 人工页面检查：浅色默认、显式浅色、深色主题，以及组件 hover/focus/disabled/loading/empty 等关键状态。

不执行 `dev:webpack`、`build:webpack`、`analyze:webpack` 或任何包含 Webpack 的基准命令。

## 12. 实施批次建议

1. 重构基础 Token、语义主题和 Element Plus 映射。
2. 重校全部现有组件样式，保持公共 API 稳定。
3. 实现基础展示组件：`UiCard`、`UiAvatar`、`UiStatistic`、`UiTrend`、`UiProgress`、`UiList`。
4. 实现上下文与浮层组件：`UiMenu`/`UiSubMenu`、`UiBreadcrumb`/`UiBreadcrumbItem`、`UiTabs`/`UiTabPane`、`UiDropdown` 子组件、`UiTooltip`。
5. 补齐根入口、独立子路径、构建入口、CSS exports 与 catalog。
6. 更新 Storybook stories 和公共 story 样式。
7. 在授权范围内完成静态、类型、Vite 构建与人工页面验证，并逐项检查所有触碰文件的完整诊断、公开协议注释和 CSS Grid 禁令。

## 13. 实施者可自行决定的细节

在不改变上述视觉方向、公共边界和授权限制的前提下，实施者可以自行确定：

- 基础色阶的具体色值与语义 Token 的最终命名。
- 组件 CSS 内部类名的细分方式。
- Storybook 每个组件的具体 story 数量和示例数据。
- Element Plus 已有类型可否直接复用；应优先避免复制容易漂移的联合类型。
- `UiTrend` 图形采用纯 CSS、文本符号或现有 `UiIcon` slot，但不得引入新依赖，且必须满足不只依赖颜色的可访问性要求。

这些决定必须保持浅色默认、明暗同源、薄封装、无 CSS Grid、无新增依赖和公共入口完整等核心约束。
