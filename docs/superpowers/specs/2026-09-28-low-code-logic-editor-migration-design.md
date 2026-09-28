# Low Code 逻辑编辑器等价迁移设计

## 1. 背景与目标

当前需要将以下旧仓库目录中的逻辑编辑器迁移到本项目：

```text
/Users/leojm5/Documents/company/yuerwang/yuer-bug_副本/
repo_13a3fd5c84e946508021e607cfa4afdf/
packages/gui/components/logic-editor
```

新能力统一放入单个 `packages/low-code` 子包。现阶段不继续拆分 `core`、`editor`、`codegen` 或 `runtime` 等物理包，后续根据实际消费者和构建边界再考虑拆包。

本次迁移的首要目标不是重新设计逻辑编辑器，而是在 Vue 3、TypeScript、pnpm Workspace、Vite 和 Webpack 5 并存的目标工程中完成行为等价转换。

第一阶段完整保留旧编辑器已有的全部节点类型和相关逻辑，重点接通并验收以下最小闭环：

- 开始和结束节点；
- 字符串、数字、布尔、数组和对象变量节点；
- 变量详情和赋值节点；
- 等于、不等于、大于、小于、大于等于、小于等于判断节点；
- 与、或、非逻辑节点；
- 加、减、乘、除、取余计算节点；
- 拖放、连线、选择、配置、删除、保存和恢复；
- 从图数据生成 `SimpleProcessData[]` 和序列化后的 `blockData`。

后续的 JavaScript/TypeScript 源码生成不在本阶段范围内。

## 2. 不可变约束

迁移不得改变逻辑编辑器的设计逻辑。以下内容必须保持不变：

- 节点类型及其字符串标识；
- 节点分类、节点默认配置和注册关系；
- 锚点索引、方向、类型、默认值和连接规则；
- G6 图数据结构及保存、恢复格式；
- 主流程遍历、支线任务识别和作用域分析算法；
- 翻译器注册关系、执行顺序和输出结构；
- `SimpleProcessData[]` 的字段结构；
- `blockData` 的序列化格式；
- 拖放、连线、选择、删除、布局和保存等交互语义；
- 原有异常、警告和非法连线判断规则；
- 所有已有节点和翻译器，不得因首期未纳入重点验收而删除或禁用。

只允许以下兼容性转换：

1. 调整 import 路径和类型来源；
2. 将 Webpack `require()` 资源加载转换为 Vite 与 Webpack 5 均可处理的静态 ESM 引用；
3. 将 Vue 2 class-style TSX 转换成 Vue 3 `defineComponent` + Options API + TSX，保留 render 结构；
4. 通过兼容层替代旧仓库提供的 Store、mixin、controller、dispatcher、国际化和反馈组件；
5. 替换无法在 Vue 3 中直接使用的 `@idg/iview` 展示组件，同时保持状态和事件语义。

不得借迁移进行算法重构、协议重命名、字段清理、交互优化、节点裁剪或既有缺陷修复。若某项旧行为阻止代码在目标工程运行，必须将其记录为单独的兼容性差异，不能静默改变。

## 3. 包职责与依赖方向

新增子包：

```text
packages/low-code
```

建议包名：

```text
@blog/low-code
```

该包负责：

- 逻辑编辑器的 Vue 3 UI；
- G6 节点、边、行为和画布交互；
- 节点配置和操作编辑；
- 图数据保存与恢复；
- 图数据到 `SimpleProcessData[]/blockData` 的生成；
- 对旧宿主能力的兼容接口。

`apps/web` 只负责路由、页面承载、数据提供和保存结果消费，不承载逻辑编辑器内部算法。

依赖方向固定为：

```text
apps/web
  -> @blog/low-code
       -> Vue 3 / Element Plus / G6 / lodash
```

`packages/low-code` 不得依赖 `apps/web` 内部文件，也不得绕过其他 package 的公共入口。

## 4. 目标目录

为降低迁移偏差，`logic-editor` 内部结构尽量对应旧目录，不在第一阶段重新拆分算法：

```text
packages/low-code/
├── package.json
├── README.md
└── src/
    ├── index.ts
    ├── logic-editor/
    │   ├── LogicEditor.tsx
    │   ├── LogicEditorLeftBar.tsx
    │   ├── LogicEditorRightBar.tsx
    │   ├── LogicEditorStage.tsx
    │   ├── LogicServiceListManage.tsx
    │   ├── const/
    │   ├── graph/
    │   │   ├── behavior/
    │   │   ├── shape/
    │   │   │   ├── nodes/
    │   │   │   └── edges/
    │   │   ├── util/
    │   │   ├── graph-util.ts
    │   │   └── register-factory.ts
    │   ├── handler/
    │   │   ├── event-service.ts
    │   │   └── config-builder/
    │   ├── interface/
    │   ├── node-config/
    │   ├── operation/
    │   ├── service/
    │   │   ├── cache-service.ts
    │   │   ├── const.ts
    │   │   ├── interface.ts
    │   │   ├── logic-service.ts
    │   │   └── translate-new/
    │   ├── styles/
    │   └── assets/
    ├── compatibility/
    │   ├── types.ts
    │   ├── context.ts
    │   ├── store-adapter.ts
    │   ├── dispatcher-adapter.ts
    │   ├── data-adapter.ts
    │   ├── method-adapter.ts
    │   ├── controller-adapter.ts
    │   └── locale-adapter.ts
    └── types/
        ├── process.ts
        ├── schema.ts
        ├── method.ts
        ├── data.ts
        ├── api.ts
        └── index.ts
```

## 5. 源文件迁移规则

### 5.1 逻辑内核

以下目录和文件以一对一迁移为原则：

```text
const/
graph/behavior/
graph/shape/
graph/util/
handler/
interface/
service/
```

其中：

- `service/logic-service.ts` 保持工作流遍历、支线任务和作用域计算逻辑；
- `service/cache-service.ts` 保持节点、边、锚点和作用域缓存规则；
- `service/translate-new/` 完整迁移，保持翻译器实现和注册表；
- `graph/shape/nodes/` 完整迁移全部节点；
- `graph/shape/edges/` 保持语句边和变量边规则；
- `graph/behavior/` 保持画布、节点、边和锚点事件规则；
- `handler/event-service.ts` 保持事件处理顺序；
- `handler/config-builder/` 保持节点配置生成逻辑。

这些文件只允许发生 import、类型和资源路径等兼容性差异。方法内部的条件、循环、字段赋值和调用顺序不应改变。

### 5.2 Vue 组件

旧组件转换关系如下：

| 旧文件 | 新文件 |
| --- | --- |
| `FrontLogicEditor.tsx` | `LogicEditor.tsx` |
| `LogicEditorLeftBar.tsx` | `LogicEditorLeftBar.tsx` |
| `LogicEditorRightBar.tsx` | `LogicEditorRightBar.tsx` |
| `LogicEditorStage.tsx` | `LogicEditorStage.tsx` |
| `LogicServiceListManage.tsx` | `LogicServiceListManage.tsx` |

语法映射如下：

| Vue 2 class-style TSX | Vue 3 Options API TSX |
| --- | --- |
| `@Component` class | `defineComponent({...})` |
| class 字段 | `data()` 返回字段 |
| getter | `computed` 选项 |
| `@Prop` | `props` 选项和 `PropType` |
| `@Watch` | `watch` 选项 |
| class method | `methods` 选项 |
| `mounted` | `mounted` 选项 |
| `beforeDestroy` | `beforeUnmount` 选项 |
| `this.$refs` | Vue 3 组件实例 `$refs` |
| TSX `render()` | Vue 3 TSX `render()` |

组件中的业务方法继续使用原名称，并保持方法体的业务判断和调用顺序。`render()` 继续使用 TSX，只转换 Vue 3 与 Element Plus 要求的 slot、`v-model` 和事件属性写法，不改成 template。

当前工程已经配置 `@vitejs/plugin-vue-jsx`，`apps/web/tsconfig.json` 使用 `jsx: preserve` 和 `jsxImportSource: vue`，Webpack 5 管线也具备 Vue JSX/Babel 依赖，因此不需要为本次迁移新增 JSX 工具链。

### 5.3 静态资源

旧代码中的静态 `require()` 和模板字符串 `require()` 改为显式资源映射。资源选择条件必须保持原样，例如参数类型、输入输出方向、连接状态和激活状态不得改变。

`.DS_Store` 不迁移。`demo.xml` 不进入生产公共入口。旧目录中的调试性 `test.ts` 不作为新增测试代码迁移；若其中包含生产节点注册所依赖的实现，应先确认其真实职责，再以生产文件身份等价迁移并记录原因。

## 6. 宿主兼容层

旧逻辑编辑器依赖以下目录外能力：

- Store；
- `dataMixin`；
- `methodMixin`；
- PageCenter 和 Global；
- `$app.dispatcher`；
- CategoryController、LogicNodeController 和 ServiceFieldController；
- `$l` 和 locale；
- Message、Modal 等反馈能力。

这些依赖不通过复制整个旧 GUI 工程解决，而是由 `compatibility/` 提供等价接口：

```ts
interface LowCodeCompatibilityContext {
  store: StoreAdapter
  dispatcher: DispatcherAdapter
  data: DataAdapter
  methods: MethodAdapter
  controllers: ControllerAdapter
  locale: LocaleAdapter
  feedback: FeedbackAdapter
}
```

转换只替换调用入口。例如，旧代码的 `methodMixin.getAllMethodsRef()` 对应 `context.methods.getAllMethodsRef()`；返回结构、调用时机和调用后的业务处理保持不变。

事件总线中的事件名称必须保持不变，包括：

```text
@idg/gui/logic/save
@idg/gui/logic/layout
@idg/gui/logic/delete
```

## 7. 外部类型与模型

旧目录引用了目录外的：

- `core/interfaces/process`；
- `core/interfaces/schema`；
- `interfaces/front_end_method`；
- `interfaces/front_end_data`；
- API 相关接口；
- 多个 `models/process/nodes/*` 模型。

只提取逻辑编辑器实际需要的字段、联合类型、枚举和构造逻辑，分别放入 `src/types/`。提取时保持字段名、枚举值、嵌套结构、默认值和序列化语义不变。

如果某个旧 model 只提供类型，则提取对应类型；如果它包含生成 `SimpleProcessData` 所必需的构造逻辑，则必须一并迁移该构造逻辑，不能替换成空壳类型。

所有非直观的公开枚举成员、状态值、锚点索引、坐标、比例和边界语义，应按照本仓库约束补充准确的简体中文注释。注释只能解释原逻辑的目的和约束，不得改变其含义。

## 8. UI 兼容转换

旧 `@idg/iview` 组件在 Vue 3 中使用等价组件承接：

| 旧组件 | 目标组件 |
| --- | --- |
| Drawer | `ElDrawer` |
| RadioGroup | `ElRadioGroup` |
| Radio | `ElRadioButton` 或 `ElRadio` |
| Collapse | `ElCollapse` |
| Panel | `ElCollapseItem` |
| Modal | `ElDialog` |
| Select | `ElSelect` |
| Spin | Element Plus loading 或包内 Loading |
| Message | `ElMessage` |
| Modal.confirm | `ElMessageBox.confirm` |

替换必须保持 `v-model` 状态、按钮处理函数、确认流程、成功/失败提示时机和弹层开关时机。样式允许为 Vue 3 和 Element Plus 进行必要适配，但不得改变三栏编辑器布局和核心操作区域。

## 9. G6 与依赖策略

为了保持原交互 API 和行为，本阶段继续使用 G6 4.x，不升级到新版 API。拟采用的精确依赖为：

```json
{
  "dependencies": {
    "@antv/g6": "4.7.10",
    "lodash": "4.17.21"
  },
  "peerDependencies": {
    "element-plus": "2.9.5",
    "vue": "3.5.13"
  }
}
```

最终依赖清单需在实施前再次核对源码 import。遵循仓库约束，不自动安装依赖；需要安装时先给出明确命令并等待用户确认。

## 10. 公共 API

`src/index.ts` 只暴露稳定能力：

```ts
export { default as LogicEditor } from './logic-editor/LogicEditor'
export { LogicEditorService } from './logic-editor/service/logic-service'
export { createLowCodeContext } from './compatibility/context'

export type {
  LogicEditorProps,
  LogicEditorSavePayload,
  LowCodeCompatibilityContext,
  SimpleProcessData,
} from './types'
```

保存结果保持图数据和旧产物同时可用：

```ts
interface LogicEditorSavePayload {
  graphData: GraphData
  processData: SimpleProcessData[]
  blockData: string
}
```

`apps/web` 只能通过该公共入口使用低代码能力，不直接引用 `packages/low-code/src/logic-editor` 内部文件。

## 11. 应用接入

后续在 `apps/web` 增加最小承载页面：

```text
apps/web/src/pages/PlaygroundLowCodePage.vue
```

页面职责仅包括：

- 创建或接收初始图数据；
- 构建 `LowCodeCompatibilityContext`；
- 将数据传给 `LogicEditor`；
- 接收并展示或保存 `LogicEditorSavePayload`。

页面不得复制节点、G6 行为或翻译逻辑。

## 12. 分阶段实施

### 阶段一：子包与协议骨架

- 创建 `packages/low-code`；
- 建立公共入口；
- 提取目录外的必要类型和模型；
- 建立 compatibility 接口，但不实现额外业务能力。

### 阶段二：生成逻辑等价迁移

- 迁移 `service/`；
- 迁移全部翻译器；
- 校正 import；
- 保持相同图数据生成相同 `SimpleProcessData[]/blockData`。

### 阶段三：图逻辑等价迁移

- 迁移所有节点、边、behavior 和事件服务；
- 转换资源加载；
- 保持全部节点注册关系。

### 阶段四：Vue 3 外壳转换

- 转换五个主要组件；
- 接入兼容 context；
- 用 Vue 3 可用组件替代旧 UI 组件；
- 保持原状态切换和交互时机。

### 阶段五：应用接入

- 添加 Playground 页面和路由；
- 接入最小的本地 adapter；
- 展示保存后的图数据和 `blockData`。

## 13. 验证策略

本请求未授权新增或修改测试代码，因此实施阶段不得创建测试文件、测试用例、测试夹具或临时测试脚本。

静态验证包括：

- 对比旧、新节点类型及注册表；
- 对比旧、新翻译器注册表；
- 对比公开枚举值和协议字段；
- 检查逻辑内核中的差异是否仅为 import、类型和资源路径；
- 执行仓库已有的类型检查、Lint 和 Vite 构建，但执行非页面自动化检查前先询问用户；
- 不执行 Webpack 构建，除非用户在当前请求中明确要求。

页面交互验证由用户手动完成。实施完成后应提供明确的启动命令、操作步骤和预期结果，覆盖：

1. 打开低代码编辑器；
2. 创建开始和结束节点；
3. 添加变量、赋值、判断和计算节点；
4. 拖动节点并建立语句边和变量边；
5. 选择、配置和删除节点；
6. 保存并重新载入图数据；
7. 检查 `SimpleProcessData[]` 和 `blockData`；
8. 确认页面刷新后可恢复保存的图结构。

## 14. 完成标准

第一阶段完成需同时满足：

- `packages/low-code` 具备清晰公共入口；
- 旧编辑器全部节点类型、图形实现、行为和翻译器均已迁移；
- 逻辑内核没有算法和协议设计变更；
- Vue 3 页面可以承载编辑器；
- 开始、结束、变量、赋值、判断和计算节点形成可操作闭环；
- 图数据能够保存和恢复；
- 保存时能够产生 `SimpleProcessData[]` 和 `blockData`；
- 未引入未经记录的兼容性差异；
- 未新增或修改测试代码；
- 未执行未获授权的页面自动化或 Webpack 构建。
