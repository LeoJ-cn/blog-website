# UI 组件库与站内文档、Playground 设计

## 状态与已确认决策

本文件记录已确认的架构决策及后续验收边界。首批组件、构建入口和站内展示页面已进入实现；页面交互仍需手动验证。GIS 重构暂停；本设计不修改 GIS。用户已确认：

- `@white55/ui` 基于 Element Plus，第一批覆盖 Button、Input、Dialog、Loading、EmptyState、Select、Form、Table。
- 组件采用薄封装：保留 Element Plus 常用 Props、事件和插槽，增加统一默认值、主题和必要的自有规则。
- 现有 Web 页面暂不迁移；新增 UI 展示功能使用组件库。
- 组件和样式按需引入。
- 主题按基础 Token、语义 Token、主题、组件四层组织。
- `ui-docs` 与 `ui-playground` 都保留在 `packages/` 且不发布；前者由现有 `apps/web` 引入，后者在原位置改为独立构建的 Storybook，不使用 `@white55` 命名空间。

## 目标与边界

组件库提供统一外观、默认交互和可复用的 Vue 组件入口。`ui-docs` 只保留组件库简介与 Storybook 外链；组件目录、API 和可操作示例集中由独立 Storybook 承担；Web 负责站点路由、入口和部署。只有 `@white55/ui` 按未来可发布的包设计。

第一阶段不重写 Element Plus，不一次迁移旧页面，不建立独立文档站或独立部署，也不复制 Element Plus 的完整 API 文档。仓库自有样式统一使用 Flexbox、弹性宽度和媒体查询，不使用 CSS Grid。

后续确认的展示方案引入 Storybook，但不引入 VitePress。Web 中与 Solutions 平级的“UI 组件库”分类只保留“组件文档”入口；文档页直接提供新开标签的 Storybook 链接，不使用 iframe，也不保留站内组件演示功能。

## 工作区与依赖方向

```text
apps/web
  ├── @white55/ui
  └── ui-docs ──────────> @white55/ui

packages/ui-playground ─> @white55/ui

@white55/ui ────────────> Vue、Element Plus
```

- `packages/ui`：包名 `@white55/ui`。只包含组件、公共类型、Token、主题和样式入口；不依赖应用、文档包、Playground 包或业务 Feature。
- `packages/ui-docs`：包名 `ui-docs`，`private: true`。只导出供 Web 懒加载的简介与 Storybook 外链页面，不再维护组件目录或详情。
- `packages/ui-playground`：包名仍为 `ui-playground`，`private: true`。在原目录将站内演示实现替换为独立构建的 Storybook；组件 stories 只消费 UI 包公共入口。这是用户明确指定的目录位置例外，包的职责限于 UI 组件的开发与展示工具，不反向依赖 Web。
- `apps/web`：在现有技术 Playground 的左侧配置中保留与 Solutions 平级的“UI 组件库”，其下只显示“组件文档”；文档页提供 Storybook 外链。顶部导航只保留现有 Playground 入口。

简介包和 Storybook 应用互不依赖。组件名称和稳定公共 API 由 UI 包维护，具体展示与说明集中在 Storybook；不得让 UI 包反向引用应用或简介包。

## 依赖与精确版本

UI 包和 Web 继续沿用当前 Workspace 锁定的版本；Storybook 新依赖须在实施时核对兼容性并固定精确版本，设计工作本身不触发安装。下面的 `workspace:` 写法指向包的精确版本，不使用范围或通配符。

| 包                       | 依赖类别                   | 依赖与版本                                                                                                               | 理由                                                       |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `@white55/ui@2.0.0`      | `peerDependencies`         | `vue: 3.5.13`、`element-plus: 2.9.5`                                                                                     | 宿主只提供一份 Vue 与 Element Plus，UI 产物不内置它们      |
| `@white55/ui@2.0.0`      | `devDependencies`          | `vue: 3.5.13`、`element-plus: 2.9.5`、`vite: 6.0.11`、`@vitejs/plugin-vue: 5.2.1`、`vue-tsc: 2.2.0`、`typescript: 5.6.3` | 独立开发、构建 Vue SFC 与生成类型声明；与现有 Web 版本一致 |
| `ui-docs@0.1.0`          | `dependencies`             | `vue: 3.5.13`                                                                                                            | 简介页仅需 Vue                                             |
| `packages/ui-playground` | `dependencies`             | `@white55/ui: workspace:2.0.0`、`vue: 3.5.13`、`element-plus: 2.9.5`                                                     | Storybook 预览独立加载组件及其运行时同伴依赖               |
| `packages/ui-playground` | 待确认的 `devDependencies` | `storybook`、`@storybook/vue3-vite`、可选文档插件，均须固定精确版本                                                      | 独立开发和静态构建；实施前先核对兼容性与安装许可           |
| `@white55/web@2.0.0`     | `dependencies`             | 保留 `ui-docs: workspace:0.1.0`，移除 `ui-playground`                                                                    | Web 只提供文档路由与 Storybook 外链入口                    |

简介包与 Storybook 应用都设置 `private: true`。简介页不重复加载 UI 组件；Storybook 是独立预览环境，需要自行加载 Element Plus 基础样式、UI Token、主题和组件样式。Web 已直接依赖 `vue: 3.5.13`、`element-plus: 2.9.5` 与 `@white55/ui`，旧页面暂不修改。

基础 Token、语义 Token 与主题优先用 CSS 自定义属性实现；不因 Storybook 引入 Sass、图标或 Web 自动导入插件。显式子路径导入承担按需加载。若后续选用 SCSS，先复用根目录已有的 `sass: 1.83.4` 并评估包级声明，不因此默认安装新版本。

## 四层主题架构

| 层         | 内容                                | 例子                                         | 依赖规则                       |
| ---------- | ----------------------------------- | -------------------------------------------- | ------------------------------ |
| 基础 Token | 无用途含义的原始设计值              | 色阶、4px 间距阶梯、字号、圆角、阴影         | 不引用组件或主题               |
| 语义 Token | 界面用途与状态                      | 主文字、弱文字、页面背景、危险操作、焦点边框 | 引用基础 Token，不引用具体组件 |
| 主题       | 为语义 Token 提供一组取值           | 默认亮色、默认暗色                           | 只改变取值，不改变组件协议     |
| 组件       | 消费语义 Token 和有限的组件局部变量 | Button 背景、Input 边框、Dialog 表面         | 不直接引用基础色号             |

主题入口在一个明确的根节点设置主题属性或类名，主题 CSS 变量由 `@white55/ui` 统一提供。UI 包维护从语义 Token 到 Element Plus CSS 变量的单向映射；组件局部变量仅用于语义 Token 不足以表达的状态。禁止页面直接改写共享的 Element Plus 变量来修补单个组件。

现有 Web 在 `main.ts` 全局引入 `element-plus/dist/index.css`。旧页面继续使用现有全局样式；UI 包对新组件导出独立、可按需引入的样式入口。Storybook 预览与 Web 属于不同页面，必须独立按 Element Plus 基础样式、UI Token/主题、组件局部样式的顺序加载；Dialog、Select 等 Teleport 内容需在 Storybook 预览根节点验证主题继承。

## 组件 API 策略

组件以 `Ui` 前缀导出，例如 `UiButton`、`UiInput`、`UiDialog`。对使用者承诺的协议分为两部分：

1. 自有协议：组件名称、设计意图、统一尺寸和状态、默认值、主题变量、可访问性要求。变更时按组件库的兼容规则处理。
2. Element Plus 兼容协议：文档列出本组件实际支持的常用 Props、事件、插槽和暴露方法；未列出的能力不自动视为稳定公共 API。确有场景需要时，再经过样例和类型审查增加支持。

不得只用 `v-bind="$attrs"` 宣称“完整兼容”。封装必须检查 `v-model`、事件重发、插槽转发、`ref` 暴露、表单上下文、禁用和加载状态、弹层挂载及焦点行为。公共类型从 UI 包入口导出，避免文档和调用方依赖组件内部路径。

首批组件的实施粒度：

| 组件       | 第一阶段自有规则                   | 重点兼容面                                    |
| ---------- | ---------------------------------- | --------------------------------------------- |
| Button     | 视觉层级、尺寸、加载与危险操作样式 | `type`、`disabled`、`loading`、点击与图标插槽 |
| Input      | 标签关联、错误与禁用状态、统一尺寸 | `v-model`、清空、前后缀插槽、输入事件         |
| Select     | 选项空状态、禁用、错误和下拉层主题 | `v-model`、多选、搜索、选项插槽与弹层         |
| Dialog     | 标题、关闭行为、焦点和弹层主题     | `v-model`、关闭前处理、页脚插槽、Teleport     |
| Loading    | 区域与全屏状态的视觉和无障碍文案   | 组件式与指令式能力分别评估，不混为一个 API    |
| EmptyState | 图示、标题、描述和操作区           | 现有 `EmptyState` 的兼容或迁移路径            |
| Form       | 标签、错误文案、必填标记和统一间距 | Form/FormItem、校验、字段路径与暴露方法       |
| Table      | 表头、空状态、加载和操作列规范     | 列插槽、排序、选择、分页边界与暴露方法        |

现有 `AppLoading`、`AppError`、`EmptyState` 先保持入口可用。实施时逐个判断其通用性：通用能力迁入新组件协议；应用专属语义留在 Web；旧导出如需变动，先提供明确过渡与弃用说明。

## 按需引入与构建契约

目标调用方式包括单组件入口和独立样式入口。具体 subpath 名称在实施计划中固定，原则是从 `@white55/ui` 的公开 `exports` 解析，不引用 `src/**` 内部路径。组件 JavaScript 和样式的依赖关系必须在使用说明中明确；既要允许按需加载，也要避免漏样式或重复加载。

`@white55/ui` 需要独立 library build，产出 ESM、类型声明、样式文件和可检查的 `exports`/`files`/`sideEffects` 契约。Vue 和 Element Plus 作为运行时同伴依赖，由宿主提供兼容版本；包内开发与构建依赖使用精确版本。Storybook 所需新依赖在实施前单独列出命令并等待用户许可。UI 包名虽按未来发布设计，实际发布、版本管理和 registry 配置另行规划。

Storybook 应用消费 UI 公开入口；简介包只提供 Web 外链。Web 文档路由继续懒加载；Storybook 单独使用 Vite 构建，不并入 Web 的 JS bundle。Web 的 Vite 与 Webpack 5 管线仍复用同一份源码；默认实施和验证仅运行 Vite，Webpack 管线保留但不作为常规完成门禁。

## Web 接入与内容组织

```text
/playground/ui/docs                    组件库简介与 Storybook 外链
/playground/ui/docs/:component         旧组件文档书签显示同一简介页
/playground/ui/playground/:component?  旧演示书签重定向到简介页
/storybook/                            独立 Storybook 静态应用
```

Web 简介页只保留组件库定位、基础样式和 Token 加载说明，以及新开标签的 Storybook 入口；不再重复组件目录、公共 API、主题变量和示例。Storybook stories 展示正常、禁用、加载、错误、空内容等适用状态，并允许调节关键 Props；stories 只使用 `@white55/ui` 的公开入口。

Web 的应用外壳只负责页面级导航和布局。UI 分类与 Solutions 平级，由现有分类/项目配置驱动，不能另写一组导航模板。Storybook 不接管 Web 的 Hash 路由，也不通过 iframe 嵌入；新标签页中的 `/storybook/` 由 Storybook 自己管理组件导航。

## 单次静态部署

现有 GitHub Pages 工作流仍只发布 `dist-vite/` 到 `static-pages`。先构建 Web，使根目录生成 `index.html`；再独立构建 Storybook 到 `dist-vite/storybook/`。Web 构建配置会清空 `dist-vite/`，因此不能颠倒顺序或让第二次构建清空整个发布目录。自定义域名下，Web 首页是 `https://www.leoj.top/#/`，完整 Storybook 是 `https://www.leoj.top/storybook/`；组件详情由 Storybook 的 story ID 管理。

Web 文档页生产环境使用当前站点基地址下的 `storybook/`，本地开发则指向单独运行的 Storybook 服务；不得硬编码会在自定义域名或仓库子路径下失效的地址。检查 Storybook 的 JS、CSS、图片与字体在子目录中的解析。`packages/ui-playground` 在原位置原名改造，不新建同名 Workspace 包；验证通过前不部署该批变更。

## 实施顺序与验收边界

首批 UI 组件、主题与站内文档已建立。后续迁移按以下顺序进行：

1. 核对 Storybook 与仓库 Node、Vue、Vite 的兼容版本，列出精确依赖和安装命令，取得当前任务的安装确认后再安装。
2. 在 `packages/ui-playground` 原目录中替换旧站内演示，实现八个组件的纯展示 stories、主题和样式预览；不新建 `apps/ui-playground`，不默认添加 `play` 交互测试或其他测试代码。
3. Web 的 UI 分类只保留“组件文档”，简介页直接新开 Storybook 首页；旧 `/playground/ui/playground/:component?` 重定向到统一简介页，组件导航与 story ID 由 Storybook 自己管理。
4. 将 Storybook 构建追加到 Web 构建之后，并沿用一次 GitHub Pages 发布；核对直达、刷新、返回、子路径资源及本地开发链接。
5. 验证并清理 Web 对旧 `ui-playground` 的运行时依赖、失效的站内演示代码与文档描述；在这一批通过验收之前不部署。

每一批都检查触碰文件的完整诊断、公开类型语义、中文注释、依赖方向和无 Grid 布局。新增或修改任何测试代码必须先按根规则取得当前任务范围的准确授权；非页面测试执行和自动页面操作也分别遵守根规则，不能由本设计代替授权。需要新增依赖时先给出精确版本与安装命令并等待确认。

## 待实施时细化的事项

- Element Plus 在当前锁定版本上的各组件兼容面，以实际使用和该版本类型声明为准，不把最新版文档的新增 API 自动列入支持范围。
- Storybook 的亮暗主题只作用于自身预览环境，不同步 Web 全站；首个 story 应先验证弹层挂载与变量继承。
- Form 校验与 Table 分页是否引入高层业务组合组件；第一阶段只建立基础组件规则，不预设业务表单或数据源协议。
- Storybook 的精确版本、静态资源子路径和实际 story ID 在实施前后分别核对；不以示例 URL 推定最终产物。
