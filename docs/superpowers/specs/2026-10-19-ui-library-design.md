# UI 组件库与站内文档、Playground 设计

## 状态与已确认决策

本文件记录已确认的架构决策及后续验收边界。首批组件、构建入口和站内展示页面已进入实现；页面交互仍需手动验证。GIS 重构暂停；本设计不修改 GIS。用户已确认：

- `@white55/ui` 基于 Element Plus，第一批覆盖 Button、Input、Dialog、Loading、EmptyState、Select、Form、Table。
- 组件采用薄封装：保留 Element Plus 常用 Props、事件和插槽，增加统一默认值、主题和必要的自有规则。
- 现有 Web 页面暂不迁移；新增 UI 展示功能使用组件库。
- 组件和样式按需引入。
- 主题按基础 Token、语义 Token、主题、组件四层组织。
- `ui-playground` 与 `ui-docs` 是不发布的 Workspace 包，由现有 `apps/web` 引入，不使用 `@white55` 命名空间。

## 目标与边界

组件库提供统一外观、默认交互和可复用的 Vue 组件入口。文档包解释组件 API 与设计规则；Playground 包提供可操作示例；Web 负责站点路由、导航和部署。三个包共同服务当前网站，但只有 `@white55/ui` 按未来可发布的包设计。

第一阶段不重写 Element Plus，不一次迁移旧页面，不建立独立文档站或独立部署，也不复制 Element Plus 的完整 API 文档。仓库自有样式统一使用 Flexbox、弹性宽度和媒体查询，不使用 CSS Grid。

第一阶段不引入 Storybook 或 VitePress：展示入口必须位于现有 Web 的技术 Playground 分类内。Storybook 可在后续作为组件开发和交互检查工具补充，VitePress 适合需要独立发布文档站时再评估；两者都不替代当前站内路由与私有内容包。

## 工作区与依赖方向

```text
apps/web
  ├── @white55/ui
  ├── ui-docs ──────────> @white55/ui
  └── ui-playground ────> @white55/ui

@white55/ui ────────────> Vue、Element Plus
```

- `packages/ui`：包名 `@white55/ui`。只包含组件、公共类型、Token、主题和样式入口；不依赖应用、文档包、Playground 包或业务 Feature。
- `packages/ui-docs`：包名 `ui-docs`，`private: true`。导出供 Web 懒加载的文档页面和文档目录；文档内容与示例说明留在本包。
- `packages/ui-playground`：包名 `ui-playground`，`private: true`。导出供 Web 懒加载的交互页面；示例状态、Mock 数据和演示控制器留在本包。
- `apps/web`：在现有技术 Playground 的左侧分类中增加“UI 组件库”，持有其文档和展示路由、站点导航与部署配置。顶部导航只保留现有 Playground 入口。

文档包和 Playground 包互不依赖。两者共用的组件名称、分类和稳定公共 API 由 UI 包导出小型清单；仅用于展示的描述、章节与示例仍由各自包维护。不得为了复用演示内容而让 UI 包引用私有包。

## 依赖与精确版本

第一版沿用当前 Workspace 锁定的版本，不以设计工作触发升级或安装。下面的 `workspace:` 写法指向包的精确版本，不使用范围或通配符。

| 包 | 依赖类别 | 依赖与版本 | 理由 |
| --- | --- | --- | --- |
| `@white55/ui@2.0.0` | `peerDependencies` | `vue: 3.5.13`、`element-plus: 2.9.5` | 宿主只提供一份 Vue 与 Element Plus，UI 产物不内置它们 |
| `@white55/ui@2.0.0` | `devDependencies` | `vue: 3.5.13`、`element-plus: 2.9.5`、`vite: 6.0.11`、`@vitejs/plugin-vue: 5.2.1`、`vue-tsc: 2.2.0`、`typescript: 5.6.3` | 独立开发、构建 Vue SFC 与生成类型声明；与现有 Web 版本一致 |
| `ui-docs@0.1.0` | `dependencies` | `@white55/ui: workspace:2.0.0`、`vue: 3.5.13` | 文档页直接使用 Vue 与 UI 公共入口 |
| `ui-playground@0.1.0` | `dependencies` | `@white55/ui: workspace:2.0.0`、`vue: 3.5.13` | 交互演示直接使用 Vue 与 UI 公共入口 |
| `@white55/web@2.0.0` | `dependencies` 新增 | `ui-docs: workspace:0.1.0`、`ui-playground: workspace:0.1.0` | Web 统一提供两个私有包的路由和部署 |

两个私有包都设置 `private: true`。它们只通过 UI 包公共 API 使用 Element Plus 能力，因此第一版不声明直接的 `element-plus` 依赖；若实际页面需要直接调用 Element Plus API，应先判断该能力是否属于 UI 包的公共协议，再决定依赖归属。Web 已直接依赖 `vue: 3.5.13`、`element-plus: 2.9.5` 与 `@white55/ui`，旧页面暂不修改。

基础 Token、语义 Token 与主题优先用 CSS 自定义属性实现；第一版不需要新增 Sass、图标、自动导入、文档站或组件开发插件。显式子路径导入承担按需加载，避免给 Vite 与 Webpack 分别引入自动导入插件。若后续选用 SCSS，先复用根目录已有的 `sass: 1.83.4` 并评估包级声明，不因此默认安装新版本。

## 四层主题架构

| 层 | 内容 | 例子 | 依赖规则 |
| --- | --- | --- | --- |
| 基础 Token | 无用途含义的原始设计值 | 色阶、4px 间距阶梯、字号、圆角、阴影 | 不引用组件或主题 |
| 语义 Token | 界面用途与状态 | 主文字、弱文字、页面背景、危险操作、焦点边框 | 引用基础 Token，不引用具体组件 |
| 主题 | 为语义 Token 提供一组取值 | 默认亮色、默认暗色 | 只改变取值，不改变组件协议 |
| 组件 | 消费语义 Token 和有限的组件局部变量 | Button 背景、Input 边框、Dialog 表面 | 不直接引用基础色号 |

主题入口在一个明确的根节点设置主题属性或类名，主题 CSS 变量由 `@white55/ui` 统一提供。UI 包维护从语义 Token 到 Element Plus CSS 变量的单向映射；组件局部变量仅用于语义 Token 不足以表达的状态。禁止页面直接改写共享的 Element Plus 变量来修补单个组件。

现有 Web 在 `main.ts` 全局引入 `element-plus/dist/index.css`。第一阶段必须先明确样式所有权：旧页面继续使用现有全局样式；UI 包对新组件导出独立、可按需引入的样式入口，并避免在多个入口重复打包同一份 Element Plus 基础样式。主题变量的加载顺序固定为 Element Plus 基础样式之后、组件局部覆写之前。文档和 Playground 同处 Web 页面时，主题切换的作用域应覆盖弹层挂载容器；Dialog、Select 下拉层等 Teleport 内容需要专项检查。

## 组件 API 策略

组件以 `Ui` 前缀导出，例如 `UiButton`、`UiInput`、`UiDialog`。对使用者承诺的协议分为两部分：

1. 自有协议：组件名称、设计意图、统一尺寸和状态、默认值、主题变量、可访问性要求。变更时按组件库的兼容规则处理。
2. Element Plus 兼容协议：文档列出本组件实际支持的常用 Props、事件、插槽和暴露方法；未列出的能力不自动视为稳定公共 API。确有场景需要时，再经过样例和类型审查增加支持。

不得只用 `v-bind="$attrs"` 宣称“完整兼容”。封装必须检查 `v-model`、事件重发、插槽转发、`ref` 暴露、表单上下文、禁用和加载状态、弹层挂载及焦点行为。公共类型从 UI 包入口导出，避免文档和调用方依赖组件内部路径。

首批组件的实施粒度：

| 组件 | 第一阶段自有规则 | 重点兼容面 |
| --- | --- | --- |
| Button | 视觉层级、尺寸、加载与危险操作样式 | `type`、`disabled`、`loading`、点击与图标插槽 |
| Input | 标签关联、错误与禁用状态、统一尺寸 | `v-model`、清空、前后缀插槽、输入事件 |
| Select | 选项空状态、禁用、错误和下拉层主题 | `v-model`、多选、搜索、选项插槽与弹层 |
| Dialog | 标题、关闭行为、焦点和弹层主题 | `v-model`、关闭前处理、页脚插槽、Teleport |
| Loading | 区域与全屏状态的视觉和无障碍文案 | 组件式与指令式能力分别评估，不混为一个 API |
| EmptyState | 图示、标题、描述和操作区 | 现有 `EmptyState` 的兼容或迁移路径 |
| Form | 标签、错误文案、必填标记和统一间距 | Form/FormItem、校验、字段路径与暴露方法 |
| Table | 表头、空状态、加载和操作列规范 | 列插槽、排序、选择、分页边界与暴露方法 |

现有 `AppLoading`、`AppError`、`EmptyState` 先保持入口可用。实施时逐个判断其通用性：通用能力迁入新组件协议；应用专属语义留在 Web；旧导出如需变动，先提供明确过渡与弃用说明。

## 按需引入与构建契约

目标调用方式包括单组件入口和独立样式入口。具体 subpath 名称在实施计划中固定，原则是从 `@white55/ui` 的公开 `exports` 解析，不引用 `src/**` 内部路径。组件 JavaScript 和样式的依赖关系必须在使用说明中明确；既要允许按需加载，也要避免漏样式或重复加载。

`@white55/ui` 需要独立 library build，产出 ESM、类型声明、样式文件和可检查的 `exports`/`files`/`sideEffects` 契约。Vue 和 Element Plus 作为运行时同伴依赖，由宿主提供兼容版本；包内开发与构建依赖使用精确版本。此设计不指定新依赖，也不触发安装。包名虽按未来发布设计，实际发布、版本管理和 registry 配置另行规划。

两个私有包可消费 UI 公开入口，并各自导出页面组件。Web 路由使用懒加载，同时复用当前 Vite 与 Webpack 5 对同一份源码的配置；默认实施和验证仅运行 Vite，Webpack 管线保留但不作为常规完成门禁。

## Web 接入与内容组织

```text
/playground/ui/docs                    组件目录与入门说明
/playground/ui/docs/:component         单组件文档
/playground/ui/playground              组件实验目录
/playground/ui/playground/:component   单组件交互演示
```

文档页至少包含用途、适用与不适用场景、公共 API、主题变量、无障碍说明、示例代码和常见边界。Playground 展示正常、禁用、加载、错误、空内容等适用状态，并允许调节关键 Props。演示代码应直接使用 `@white55/ui` 的公开入口，确保文档与真实消费方式一致。

Web 的应用外壳只负责页面级导航和布局。文档包与 Playground 包不直接修改 Web 的路由表或全局状态；它们作为现有 Playground 的一个分类呈现。原技术 Demo 分类保持语义独立。

## 实施顺序与验收边界

1. 固定 UI 包公共入口、包名、依赖和组件清单；定义基础 Token、语义 Token 与默认主题映射。
2. 以 `UiButton` 贯通组件、样式入口、类型、文档页、Playground 页和 Web 懒加载路由。
3. 按 Input、Select、Dialog、Loading、EmptyState、Form、Table 的复杂度逐个扩展，先核对 Element Plus 兼容面，再确定每个组件的自有协议。
4. 建立独立库构建和消费验证，审查主题作用域、弹层、样式加载顺序和包边界。

每一批都检查触碰文件的完整诊断、公开类型语义、中文注释、依赖方向和无 Grid 布局。新增或修改任何测试代码必须先按根规则取得当前任务范围的准确授权；非页面测试执行和自动页面操作也分别遵守根规则，不能由本设计代替授权。需要新增依赖时先给出精确版本与安装命令并等待确认。

## 待实施时细化的事项

- Element Plus 在当前锁定版本上的各组件兼容面，以实际使用和该版本类型声明为准，不把最新版文档的新增 API 自动列入支持范围。
- 主题切换是仅作用于 UI 展示区域，还是作用于 Web 全站；首个纵向样板应先验证弹层挂载与变量继承，再固定范围。
- Form 校验与 Table 分页是否引入高层业务组合组件；第一阶段只建立基础组件规则，不预设业务表单或数据源协议。
- UI 包的独立构建工具、按需样式策略和发布版本策略在实施计划中做版本与产物验证后确定。
