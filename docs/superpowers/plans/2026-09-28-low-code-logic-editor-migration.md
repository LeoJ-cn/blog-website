# Low Code 逻辑编辑器等价迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `packages/low-code` 中等价迁移旧仓库的完整逻辑编辑器，并在 Vue 3 应用中接通开始、结束、变量、赋值、判断和计算节点的编辑、保存、恢复及 `SimpleProcessData[]/blockData` 生成闭环。

**Architecture:** 采用“原逻辑内核一对一迁移、Vue 3 外壳语法转换、宿主能力兼容层注入”的结构。`logic-editor` 尽量保持旧目录和算法，`compatibility` 只替代旧 Store、mixin、controller、dispatcher、国际化与反馈入口，`apps/web` 只负责页面承载和演示数据。

**Tech Stack:** Vue `3.5.13`、TypeScript、pnpm Workspace、Element Plus `2.9.5`、AntV G6 `4.7.10`、lodash `4.17.21`、Vite；Webpack 5 管线保留但不在默认验证中执行。

**Spec:** `docs/superpowers/specs/2026-09-28-low-code-logic-editor-migration-design.md`

## Global Constraints

- 所有依赖必须使用精确版本，禁止 `^`、`~`、`*` 或 `latest`。
- 不自动安装依赖；需要安装时先给出具体命令并等待用户确认。
- 不修改源仓库，所有改动只发生在当前 `blog-website` 仓库。
- 不改变节点 ID、协议字段、锚点索引、连接规则、工作流算法、作用域算法、翻译器顺序、输出结构或事件时机。
- 全部现有节点、边、behavior、配置构建器和翻译器均需保留；首期重点验收范围不构成删除或禁用其他能力的理由。
- 不借迁移修复旧逻辑缺陷；阻断迁移的兼容差异必须单独记录。
- 未经用户明确要求，不新增、修改或生成任何测试文件、测试用例、测试夹具、测试辅助代码或临时测试脚本。
- 页面测试、调试和交互验证全部由用户手动执行；Agent 不启动页面、不操作浏览器。
- 执行非页面自动化测试前必须先询问用户。本计划默认只执行静态清单检查、类型检查、Lint 和 Vite 构建。
- 默认验证只使用 Vite；不得执行 `dev:webpack`、`build:webpack`、`analyze:webpack` 或含 Webpack 的基准命令。
- 新增复杂逻辑、边界协议和非直观字段必须使用准确、简洁的简体中文注释；迁移旧算法时不通过改写逻辑来补注释。
- 每个任务提交前检查 Git 差异，避免混入用户已有或无关改动。

## Review Focus

由于禁止新增测试代码，以下高风险项使用任务内的静态对照、类型检查和用户手动页面验收固定行为：

1. **节点与翻译器遗漏：** 旧、新注册表中的节点 ID、边类型和翻译器键必须一一对应；Task 4、Task 5 使用排序清单对照。
2. **锚点协议漂移：** 锚点索引、输入输出方向、`_isEntry`、`_isExit`、`_sideQuests` 和 `_desc` 不得改变；Task 3、Task 5 使用字段清单和差异审查固定。
3. **同图不同产物：** 相同 `GraphData` 必须保留 `SimpleProcessData[]` 字段结构、流程顺序和 `blockData` 序列化语义；Task 4 做源文件差异审查，Task 8 提供用户手动对比步骤。
4. **Vue 3 时序变化：** visible、stageMode、当前页面、选中节点和保存事件的 watch/lifecycle 顺序必须与旧组件一致；Task 7 使用 `defineComponent` + Options API + TSX 并建立逐方法映射，Task 8 手动验收。
5. **资源动态选择失真：** 参数类型、输入输出方向、连接状态和激活状态必须继续选中原图标；Task 5 生成显式资源映射并与旧动态路径集合对照。

---

## File Structure Map

### 新增 package 文件

- `packages/low-code/package.json`：子包元数据、精确依赖和公共入口。
- `packages/low-code/README.md`：包职责、兼容性原则、使用方式和手动验收说明。
- `packages/low-code/src/index.ts`：唯一公共导出入口。
- `packages/low-code/src/types/*`：从旧仓库目录外提取的最小协议和模型。
- `packages/low-code/src/compatibility/*`：旧宿主能力的等价接口和 Vue 注入上下文。
- `packages/low-code/src/logic-editor/*`：逻辑编辑器完整迁移内容。

### 修改应用文件

- `apps/web/package.json`：通过 workspace 精确依赖 `@blog/low-code`。
- `apps/web/src/pages/PlaygroundLowCodePage.vue`：低代码编辑器承载页。
- `apps/web/src/app/router/index.ts`：增加 Playground 路由。
- `apps/web/src/data/projects.ts`：增加低代码项目入口卡片。

### 不修改的区域

- 源仓库全部文件；
- 现有测试文件和测试配置；
- Webpack 管线；
- `packages/shared`、`packages/types` 和 `packages/ui` 的现有公共 API。

---

### Task 1: 建立迁移基线清单与 Low Code 包骨架

**Files:**
- Create: `packages/low-code/package.json`
- Create: `packages/low-code/README.md`
- Create: `packages/low-code/src/index.ts`
- Create: `packages/low-code/MIGRATION_BASELINE.md`

**Interfaces:**
- Consumes: 根目录 `pnpm-workspace.yaml` 已包含 `packages/*`；设计文档中的精确依赖和不可变约束。
- Produces: workspace package `@blog/low-code`；后续任务使用的 `MIGRATION_BASELINE.md` 对照清单。

- [ ] **Step 1: 记录源目录代码与资源基线**

在 `MIGRATION_BASELINE.md` 中记录源路径、文件数量，并分别列出：节点文件、边文件、behavior 文件、配置构建器、翻译器、Vue 2 TSX 组件、样式和资源。清单必须包含旧 `register-nodes.ts` 与 `translate-new/index.ts` 的注册键。

- [ ] **Step 2: 创建 `@blog/low-code` package 元数据**

设置 `name: "@blog/low-code"`、`version: "2.0.0"`、`private: true`、`type: "module"`、`main/types: "./src/index.ts"`。声明精确依赖 `@antv/g6: "4.7.10"`、`lodash: "4.17.21"`，声明 peer dependency `vue: "3.5.13"`、`element-plus: "2.9.5"`。

- [ ] **Step 3: 创建空公共入口和 README**

`src/index.ts` 暂不导出未实现符号。README 写明：包包含所有低代码逻辑、当前仅完成逻辑编辑器迁移、禁止跨内部路径引用、页面验证由使用方执行。

- [ ] **Step 4: 静态检查 package 骨架**

Run: `pnpm --filter @blog/low-code exec tsc --version`

Expected: 若依赖尚未安装，命令明确报告当前 workspace 未包含新依赖；不得自动执行安装。若现有 lockfile 已具备所需工具，输出 TypeScript 版本。

- [ ] **Step 5: 请求依赖安装授权**

向用户提供：

```bash
pnpm install
```

说明该命令将根据精确版本更新 `pnpm-lock.yaml`。获得确认前停止所有依赖安装和依赖型验证，但可以继续完成不需要安装的文件迁移。

- [ ] **Step 6: 提交包骨架**

```bash
git add packages/low-code
git commit -m "feat: establish low-code package"
```

---

### Task 2: 提取目录外协议与必要模型

**Files:**
- Create: `packages/low-code/src/types/process.ts`
- Create: `packages/low-code/src/types/schema.ts`
- Create: `packages/low-code/src/types/method.ts`
- Create: `packages/low-code/src/types/data.ts`
- Create: `packages/low-code/src/types/api.ts`
- Create: `packages/low-code/src/types/edit-page.ts`
- Create: `packages/low-code/src/types/index.ts`

**Interfaces:**
- Consumes: 旧仓库 `core/interfaces/process`、`core/interfaces/schema`、`interfaces/front_end_method`、`interfaces/front_end_data`、`interfaces/edit-page`、API 接口和被翻译器实例化的 process node models。
- Produces: `SimpleProcessData`、`DataType`、`Schema`、`Method`、`Data`、`EditPageMold`、API 节点参数及旧构造逻辑需要的类型/工厂。

- [ ] **Step 1: 建立外部 import 使用清单**

对源 `logic-editor` 执行 `rg`，把所有越出该目录的类型和 model import 记录到 `MIGRATION_BASELINE.md`，逐项标注“仅类型”“枚举/常量”“运行时构造逻辑”。

- [ ] **Step 2: 提取 schema 与数据类型**

在 `schema.ts` 中保持旧 `DataType` 枚举值和 `Schema` 字段不变；在 `data.ts` 中只提取逻辑编辑器访问的 `Data` 字段，不能改名或改变可选性。

- [ ] **Step 3: 提取 method、页面与 API 类型**

在 `method.ts`、`edit-page.ts`、`api.ts` 中保持旧字段名、枚举值和嵌套结构；对生命周期 mold、方法参数和 API 请求结构补充简体中文边界注释。

- [ ] **Step 4: 提取 process 协议和必要构造逻辑**

在 `process.ts` 中保持 `SimpleProcessData` 以及翻译器输出涉及的流程节点结构。若旧 model 有运行时构造逻辑，提供同名或明确映射的等价工厂，不允许用 `any` 或空对象替代。

- [ ] **Step 5: 导出类型公共入口**

`types/index.ts` 导出后续逻辑编辑器需要的全部类型；暂不从 package 根入口暴露内部专用类型。

- [ ] **Step 6: 对照字段和枚举值**

使用 `rg` 分别输出源、新类型文件中的枚举成员和关键字段，逐项核对 `DataType`、流程节点 `type`、方法 ID、数据 ID 和页面 mold，无遗漏或值变化后才能提交。

- [ ] **Step 7: 提交协议提取**

```bash
git add packages/low-code/src/types packages/low-code/MIGRATION_BASELINE.md
git commit -m "feat: preserve low-code domain protocols"
```

---

### Task 3: 一对一迁移逻辑编辑器内部协议和常量

**Files:**
- Create: `packages/low-code/src/logic-editor/interface/index.ts`
- Create: `packages/low-code/src/logic-editor/service/interface.ts`
- Create: `packages/low-code/src/logic-editor/service/const.ts`
- Create: `packages/low-code/src/logic-editor/const/index.ts`

**Interfaces:**
- Consumes: Task 2 的 `DataType`、`Schema`、`Method`、`SimpleProcessData` 等类型。
- Produces: `BlockNames_DTS`、`AnchorTag_DTS`、`SideQuests_DTS`、`DescInfo_DTS`、`AnchorBaseConfig_DTS`、`INodeConfig`、`LogicBlockBaseTplMap` 和节点分类配置。

- [ ] **Step 1: 复制内部协议文件**

保持旧文件结构、类型名、枚举值和字段顺序，只调整越界 import 到 `../../../types` 等新路径。

- [ ] **Step 2: 复制逻辑块模板与分类**

保持节点 label、name、type、锚点 index、tag、`_isEntry`、`_isExit`、`_sideQuests`、`_desc`、默认类型和默认值。

- [ ] **Step 3: 将资源引用延后到资源映射**

常量文件中暂时使用从 `logic-editor/assets` 导入的具名资源符号；不得改变节点到图标的选择条件。资源文件及映射由 Task 5 补齐。

- [ ] **Step 4: 检查协议差异**

对旧、新文件执行忽略 import 路径和格式化差异的人工 diff，确认没有枚举值、锚点索引、模板字段或注册项变化。

- [ ] **Step 5: 提交内部协议**

```bash
git add packages/low-code/src/logic-editor/interface packages/low-code/src/logic-editor/service/interface.ts packages/low-code/src/logic-editor/service/const.ts packages/low-code/src/logic-editor/const
git commit -m "feat: preserve logic editor protocols"
```

---

### Task 4: 等价迁移 `SimpleProcessData` 生成链路

**Files:**
- Create: `packages/low-code/src/logic-editor/service/cache-service.ts`
- Create: `packages/low-code/src/logic-editor/service/logic-service.ts`
- Create: `packages/low-code/src/logic-editor/service/translate-new/*.ts`

**Interfaces:**
- Consumes: Task 2 的流程协议和 Task 3 的图节点/锚点协议。
- Produces: `new LogicEditorService(graphData, rootMethodId)`，实例字段 `blockly: string`、`translateErrorList: TranslateError_DTS[]`；完整翻译器注册表。

- [ ] **Step 1: 复制 CacheService**

保持缓存 key、节点/边查询、锚点查询、作用域初始化、父子查询和惰性缓存算法，只调整类型 import。

- [ ] **Step 2: 复制 LogicEditorService**

保持构造函数执行顺序、`generateWorkFlow`、递归流程遍历、支线收集、创建对象前置处理、锚点溯源和 reset 时机。删除调试输出属于行为变化，本阶段不得删除。

- [ ] **Step 3: 复制 TranslateBaseService**

保持静态翻译状态、临时变量命名、变量记录、作用域检查、错误收集、`SimpleProcessData` 构造和 JSON 序列化方式。

- [ ] **Step 4: 复制全部已注册翻译器**

完整迁移 `translate-new/index.ts` 当前注册的所有 `Translate*Service`，保持 map 键和值一一对应。

- [ ] **Step 5: 复制当前目录中的编号翻译文件**

迁移 `16-` 至 `30-` 文件，即使它们当前未进入主注册表也不得丢失；保持它们当前是否注册的状态，不主动启用。

- [ ] **Step 6: 对照翻译器注册清单**

分别提取旧、新 `translate-new/index.ts` 中所有 `[BlockNames_DTS.*]` 键，排序后必须完全一致；编号文件数量和文件名必须完全一致。

- [ ] **Step 7: 审查生成逻辑差异**

逐文件确认条件分支、数组顺序、临时变量规则、字段赋值和返回结构未改变。允许差异仅限 import 路径、分号/格式化和必要类型兼容。

- [ ] **Step 8: 提交生成链路**

```bash
git add packages/low-code/src/logic-editor/service
git commit -m "feat: migrate low-code process generation"
```

---

### Task 5: 等价迁移 G6 节点、边、行为和静态资源

**Files:**
- Create: `packages/low-code/src/logic-editor/graph/behavior/*.ts`
- Create: `packages/low-code/src/logic-editor/graph/shape/nodes/*.ts`
- Create: `packages/low-code/src/logic-editor/graph/shape/edges/*.ts`
- Create: `packages/low-code/src/logic-editor/graph/shape/defaultStyles.ts`
- Create: `packages/low-code/src/logic-editor/graph/shape/register-nodes.ts`
- Create: `packages/low-code/src/logic-editor/graph/shape/register-edges.ts`
- Create: `packages/low-code/src/logic-editor/graph/util/*.ts`
- Create: `packages/low-code/src/logic-editor/graph/register-factory.ts`
- Create: `packages/low-code/src/logic-editor/assets/*`
- Create: `packages/low-code/src/logic-editor/assets/icon-map.ts`

**Interfaces:**
- Consumes: Task 3 的节点和锚点协议；Task 4 的 `LogicEditorService`。
- Produces: `registerFactory(G6)`、全部旧节点/边/behavior 注册结果、`getImgByType` 所需的静态图标映射。

- [ ] **Step 1: 迁移全部 SVG/PNG 资源**

保持文件内容和文件名。排除 `.DS_Store`，不下载或重新生成图片。

- [ ] **Step 2: 建立显式资源映射**

`icon-map.ts` 为所有原动态 `require()` 路径提供具名映射，至少覆盖节点图标、输入/输出类型、active/inactive、statement anchor 和箭头。选择函数的输入和返回语义保持原样。

- [ ] **Step 3: 迁移节点绘制文件**

迁移 `graph/shape/nodes/` 全部生产节点文件。保留尺寸、坐标、anchor index、shape name、文本、状态判断、更新逻辑和资源选择条件。

- [ ] **Step 4: 处理旧 `test.ts`**

检查其是否被生产代码 import。若仍由 `LogicEditorStage` 使用，则以原文件名和原行为迁移，并在 `MIGRATION_BASELINE.md` 标注其生产依赖身份；不得为此创建测试代码。

- [ ] **Step 5: 迁移边和样式定义**

保持 `logic-statement-edge`、`logic-variable-edge` 的锚点、箭头、状态和事件规则。

- [ ] **Step 6: 迁移 behavior 和 graph util**

保持事件名、shouldBegin/shouldUpdate 判断、拖动数据、删除规则、选择状态和滚动处理。宿主依赖先指向 Task 6 约定的 compatibility 接口。

- [ ] **Step 7: 迁移注册工厂**

保持注册顺序为 node、edge、behavior；保持 `register-nodes.ts` 中全部节点调用和变量类型循环。

- [ ] **Step 8: 对照注册与资源清单**

旧、新节点文件名、注册调用、边类型、behavior 名称及旧 `require()` 资源集合必须全部在新清单中找到对应项。

- [ ] **Step 9: 提交图逻辑**

```bash
git add packages/low-code/src/logic-editor/graph packages/low-code/src/logic-editor/assets packages/low-code/MIGRATION_BASELINE.md
git commit -m "feat: migrate logic editor graph interactions"
```

---

### Task 6: 建立宿主能力兼容层

**Files:**
- Create: `packages/low-code/src/compatibility/types.ts`
- Create: `packages/low-code/src/compatibility/context.ts`
- Create: `packages/low-code/src/compatibility/store-adapter.ts`
- Create: `packages/low-code/src/compatibility/dispatcher-adapter.ts`
- Create: `packages/low-code/src/compatibility/data-adapter.ts`
- Create: `packages/low-code/src/compatibility/method-adapter.ts`
- Create: `packages/low-code/src/compatibility/controller-adapter.ts`
- Create: `packages/low-code/src/compatibility/locale-adapter.ts`
- Create: `packages/low-code/src/compatibility/feedback-adapter.ts`

**Interfaces:**
- Consumes: Task 2 的 `Method`、`Data`、API/分类类型；旧 Store、mixin、controller 和 dispatcher 调用清单。
- Produces: `LowCodeCompatibilityContext`、`createLowCodeContext(options)`、Vue `provideLowCodeContext(context)` 和 `useLowCodeContext()`。

- [ ] **Step 1: 定义 adapter 接口**

接口方法名优先保持旧调用语义：Store 的读写、方法列表/生命周期/增删改、数据列表/增删改、分类/节点/API 查询、dispatcher 的 listen/trigger/unlisten、locale 的 getLocale/translate、feedback 的 success/error/warning/confirm。

- [ ] **Step 2: 定义 context 构造和注入接口**

精确签名：

```ts
function createLowCodeContext(options: LowCodeCompatibilityContext): LowCodeCompatibilityContext
function provideLowCodeContext(context: LowCodeCompatibilityContext): void
function useLowCodeContext(): LowCodeCompatibilityContext
```

`useLowCodeContext` 在未注入时抛出包含 `LowCodeCompatibilityContext` 的明确错误，不能静默创建缺少数据的全局单例。

- [ ] **Step 3: 实现包内默认内存 Store 与 dispatcher**

默认实现只承接旧组件所需的同步键值读写和事件订阅/触发语义。事件名称不转换，listener 调用顺序保持注册顺序。

- [ ] **Step 4: 实现本地 method/data adapter**

以传入数组为数据源，保持通过 ID 查找、更新和删除的旧语义；不添加持久化或网络行为。

- [ ] **Step 5: 定义 controller、locale 和 feedback 注入要求**

controller 默认实现对远程分类/API 查询返回空集合；locale 默认 `zh-CN`；feedback 使用由 Vue 组件层注入的 Element Plus 实现。默认行为必须在 README 标明。

- [ ] **Step 6: 替换已迁移逻辑中的宿主 import**

只将 Store/mixin/controller/dispatcher/locale/feedback 的入口指向 compatibility；保留原调用位置、参数和结果处理。

- [ ] **Step 7: 静态核对越界 import**

Run: `rg -n "packages/gui|mixins/|controllers/|../../common|@idg/" packages/low-code/src`

Expected: 不存在旧仓库内部 import；允许文档说明文本，不允许生产 TypeScript/Vue import。

- [ ] **Step 8: 提交兼容层**

```bash
git add packages/low-code/src/compatibility packages/low-code/src/logic-editor
git commit -m "feat: add low-code host compatibility layer"
```

---

### Task 7: 将 Vue 2 class-style TSX 等价转换为 Vue 3 Options API TSX

**Files:**
- Create: `packages/low-code/src/logic-editor/LogicEditor.tsx`
- Create: `packages/low-code/src/logic-editor/LogicEditorLeftBar.tsx`
- Create: `packages/low-code/src/logic-editor/LogicEditorRightBar.tsx`
- Create: `packages/low-code/src/logic-editor/LogicEditorStage.tsx`
- Create: `packages/low-code/src/logic-editor/LogicServiceListManage.tsx`
- Create: `packages/low-code/src/logic-editor/node-config/*.tsx`
- Create: `packages/low-code/src/logic-editor/operation/*.tsx`
- Create: `packages/low-code/src/logic-editor/styles/graph.module.scss`
- Create: `packages/low-code/src/logic-editor/styles/logic-editor.module.scss`

**Interfaces:**
- Consumes: Task 5 的 G6 注册/交互，Task 6 的 compatibility context。
- Produces: 基于 `defineComponent` + Options API + TSX 的 `LogicEditor` Vue 3 组件；props `modelValue`、`context`；emits `update:modelValue`、`save`、`select-node`、`change-graph`。

- [ ] **Step 1: 确认现有 JSX 工具链**

确认 `@vitejs/plugin-vue-jsx`、`jsx: preserve`、`jsxImportSource: vue` 以及 Webpack 侧 Vue JSX/Babel 配置仍然存在。本任务不新增另一套 JSX 编译器。

- [ ] **Step 2: 转换顶层 LogicEditor**

使用 `defineComponent` + Options API：class 字段映射到 `data()`，getter 映射到 `computed`，`@Watch` 映射到 `watch`，class method 映射到 `methods`。逐项保留原 `stageMode`、`mode`、`curSelectedNodeConfig`、`preStageMode`、visible、methodList、allDatas 和 lifeCycles，以及 `watchCurPageUuid`、`radioChange`、`onGraphChange`、`saveLogicData`、`easyLayout` 的条件和触发顺序。保留 TSX `render()`，不转换成 template。

- [ ] **Step 3: 转换左侧面板**

保留 tab、搜索 debounce、展开面板、远程分类、内置节点、自定义方法、自定义变量、拖动 `data-type/data-model` 和 locale 显示规则。组件库替换只改变 TSX props、slot 和事件 API。

- [ ] **Step 4: 转换画布组件**

保留 graph 实例字段、三种 StageMode 缓存、当前方法、当前节点、插件创建、事件注册、删除确认、布局、保存、updateBlockly、图切换和 storeAllGraphData 顺序。

- [ ] **Step 5: 转换右侧配置组件**

保留 watch 条件、NodeConfigServicesFactory 查询和不同配置组件选择规则。

- [ ] **Step 6: 转换节点配置与 operation 组件**

保持配置字段、图更新调用、当前方法 graphData 写回和变量值处理。不得重新设计为新的 schema form。

- [ ] **Step 7: 转换服务列表组件**

保留分类/API 查询、加载状态、选择和拖动数据；远程数据由 controller adapter 提供。

- [ ] **Step 8: 迁移样式**

保留三栏布局、画布和 minimap 定位、面板滚动、节点列表尺寸。仅将无法由当前构建处理的 Less 语法等价改写为 SCSS，不做视觉重设计。

- [ ] **Step 9: 转换 Vue 3 TSX 专属语法**

逐处转换 Vue 2 的 `slot`/`scopedSlots`、`nativeOnClick`、`value`/旧 `v-model`、`on-on-*` 事件属性和组件解析方式。每一处必须记录旧写法、新写法和事件时机，不能借语法转换改写条件渲染结构。

- [ ] **Step 10: 建立旧新方法映射表**

在 `MIGRATION_BASELINE.md` 中为五个主组件列出旧 public method/watch/lifecycle 与新 `methods`/`watch`/lifecycle 选项的一一对应，确认无遗漏。

- [ ] **Step 11: 提交 Vue 3 TSX 转换**

```bash
git add packages/low-code/src/logic-editor packages/low-code/MIGRATION_BASELINE.md
git commit -m "feat: port logic editor shell to Vue 3"
```

---

### Task 8: 暴露公共 API 并接入 Playground

**Files:**
- Modify: `packages/low-code/src/index.ts`
- Modify: `packages/low-code/README.md`
- Modify: `apps/web/package.json`
- Create: `apps/web/src/pages/PlaygroundLowCodePage.vue`
- Modify: `apps/web/src/app/router/index.ts`
- Modify: `apps/web/src/data/projects.ts`

**Interfaces:**
- Consumes: Task 6 的 `createLowCodeContext`，Task 7 的 `LogicEditor`。
- Produces: `@blog/low-code` 公共 API；应用中的低代码 Playground 路由和入口。

- [ ] **Step 1: 完成 package 公共导出**

根入口只导出 `LogicEditor`、`LogicEditorService`、`createLowCodeContext` 及设计文档规定的公共类型。不得导出内部节点、behavior 或单个翻译器。

- [ ] **Step 2: 添加 workspace 依赖**

在 `apps/web/package.json` 使用精确 workspace 引用：

```json
"@blog/low-code": "workspace:2.0.0"
```

- [ ] **Step 3: 创建 Playground 页面**

页面创建本地 methods/data、默认 context 和初始 graph document；渲染 `LogicEditor`；在保存时显示 graphData、processData 和 blockData。页面不得包含节点或翻译算法。

- [ ] **Step 4: 添加路由和项目入口**

按现有 lazy page pattern 添加 `/playground/low-code` 路由，并在 `projects.ts` 添加对应卡片；不修改其他 Playground 行为。

- [ ] **Step 5: 更新 README 使用示例**

说明 context 必需能力、默认行为、保存 payload、全部节点保留策略和当前重点验收节点。

- [ ] **Step 6: 提供用户手动页面验收步骤**

在 README 写明：运行 `pnpm dev:vite`，打开 `/playground/low-code`，完成开始→计算/判断/赋值→结束连线，保存、复制结果、刷新恢复，并检查 `blockData`。预期结果必须逐步写清。

- [ ] **Step 7: 提交应用接入**

```bash
git add packages/low-code apps/web/package.json apps/web/src/pages/PlaygroundLowCodePage.vue apps/web/src/app/router/index.ts apps/web/src/data/projects.ts pnpm-lock.yaml
git commit -m "feat: expose low-code editor playground"
```

仅在用户已经批准并实际执行 `pnpm install`、因而 `pnpm-lock.yaml` 发生变化时暂存 lockfile；否则从该命令中移除 `pnpm-lock.yaml`。

---

### Task 9: 静态验证、Vite 构建与迁移报告

**Files:**
- Modify: `packages/low-code/MIGRATION_BASELINE.md`
- Modify: `packages/low-code/README.md`

**Interfaces:**
- Consumes: Task 1–8 的所有产物。
- Produces: 完整迁移对照、兼容差异记录、可交给用户执行的页面验收清单。

- [ ] **Step 1: 检查源、新文件覆盖率**

对节点、边、behavior、配置构建器、翻译器和资源分别生成排序清单。除明确排除的 `.DS_Store` 和非生产示例外，新目录必须有一一对应项。

- [ ] **Step 2: 检查注册表一致性**

对比旧、新节点注册调用、变量类型循环、边注册、behavior 注册和翻译器 map 键；把检查结果记录到 `MIGRATION_BASELINE.md`。

- [ ] **Step 3: 检查协议一致性**

对比 `BlockNames_DTS`、`AnchorTag_DTS`、`SideQuests_DTS`、`DescInfo_DTS`、锚点模板和 `SimpleProcessData` 字段。确认值、索引和序列化字段未变化。

- [ ] **Step 4: 检查越界依赖和公共边界**

Run: `rg -n "packages/gui|repo_13a3fd|vue-property-decorator|@idg/iview|@idg/idg" packages/low-code/src apps/web/src/pages/PlaygroundLowCodePage.vue`

Expected: 生产代码不存在旧仓库路径或 Vue 2/IDG 运行时 import。

- [ ] **Step 5: 询问是否执行非页面自动化验证**

询问用户是否允许 Agent 执行类型检查、Lint 和 Vite 构建。若用户不授权，提供以下命令并等待用户反馈：

```bash
pnpm typecheck
pnpm lint
pnpm build:vite
```

- [ ] **Step 6: 在获授权后执行类型检查**

Run: `pnpm typecheck`

Expected: exit code 0，无 Vue/TypeScript 错误。

- [ ] **Step 7: 在获授权后执行 Lint**

Run: `pnpm lint`

Expected: exit code 0，无 ESLint 错误。

- [ ] **Step 8: 在获授权后执行 Vite 构建**

Run: `pnpm build:vite`

Expected: exit code 0，生成生产构建；不得追加执行 Webpack 构建。

- [ ] **Step 9: 整理兼容差异**

将 Vue 组件语法、UI 组件映射、静态资源导入和 adapter 入口列为预期兼容差异。任何算法、协议或交互时序差异必须视为未完成，不得仅记录后交付。

- [ ] **Step 10: 交付用户手动页面验收**

提供 `pnpm dev:vite` 命令、访问路径、最小闭环操作、预期 graphData/processData/blockData，以及全部其他节点仍可见/可反序列化的检查项。Agent 不启动页面、不操作浏览器。

- [ ] **Step 11: 提交验证报告**

```bash
git add packages/low-code/MIGRATION_BASELINE.md packages/low-code/README.md
git commit -m "docs: record low-code migration verification"
```

---

## Execution Notes

- Task 2–5 涉及大量一对一文件迁移，执行者应优先复制原文件，再使用小范围补丁修正 import、类型和资源路径；禁止重新手写算法。
- 每次修改逻辑内核后，应立即审查 diff，确保方法体没有非兼容性变化。
- 若发现源代码依赖未包含在本计划中，应暂停对应任务，将依赖加入 `MIGRATION_BASELINE.md` 并说明其运行时作用；不得用 `any`、空实现或删除调用绕过。
- 若 Vue 3 或 G6 构建兼容性要求改变业务判断，应停止实施并请求用户决策。
- 任何依赖安装都必须等待用户确认；任何页面验证都交给用户执行。
