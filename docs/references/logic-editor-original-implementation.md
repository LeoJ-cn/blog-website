# 逻辑编辑器原实现参考与迁移约束

> 本文是 `@blog/low-code` 后续开发、迁移和回归检查的权威参考之一。修改逻辑编辑器前，应先核对本文列出的原实现行为与协议，不能只依据当前页面表现推断业务语义。

## 必读触发规则

出现以下任一情形时，开始分析或修改前必须完整阅读本文：

- 修改或评审 `packages/low-code/src/logic-editor/` 下的代码。
- 修改低代码 `Method`、`Data`、`GraphData`、节点、锚点或边协议。
- 处理逻辑编辑器打开、关闭、舞台切换、节点配置或保存行为。
- 处理 `processData`、`blockData`、`LogicEditorService` 或翻译器。
- 调查逻辑编辑器的运行时异常、配置无法写回、图数据丢失或迁移兼容问题。
- 新增节点类型、节点配置面板、翻译服务或兼容层适配器。

完成相关工作前，必须按本文第 10 节检查实现，并将第 11 节适用的场景交给用户手动验证。若实现需要偏离本文记录的原行为，变更说明必须写明原行为、目标行为和兼容影响，并同步更新本文。

## 1. 参考基线

- 原仓库：`/Users/leojm5/Documents/company/yuerwang/yuer-bug_副本/repo_13a3fd5c84e946508021e607cfa4afdf`
- 原仓库提交：`d57c5a369b712c340ea3251cd766bbdb5440a9c8`
- 原实现目录：`packages/gui/components/logic-editor`
- 当前迁移目录：`packages/low-code/src/logic-editor`
- 调研规模：原目录 190 个文件，其中 TypeScript、TSX、Less 共约 22,016 行；其余主要为节点图标资源。
- 调研日期：2026-09-29

原仓库工作区存在与本次调研无关的 `.vscode/settings.json` 修改；本文只读取源码，没有修改原仓库。

## 2. 核心结论

### 2.1 编辑器不是单一画布

编辑器包含三个互相切换但数据边界不同的舞台：

1. `METHOD_LIST`：方法列表图，只展示方法节点及生命周期编排。
2. `METHOD_DETAIL`：单个方法的逻辑详情图，包含开始、结束、操作节点、变量依赖和边。
3. `VARIABLE_LIST`：变量列表图。

方法列表图不能交给 `LogicEditorService` 当作方法详情图翻译。翻译器要求详情图中存在 `logic-start-node`、`logic-end-node` 以及完整的 `data.anchors`。

### 2.2 “是否有返回值”由返回值类型派生

原实现没有独立的布尔开关。方法配置面板用 `funcReturn.type` 表达用户选择：

- `DataType.Undefined`（界面显示“空”）→ 保存时设置 `funcReturn.state = false`。
- 其他类型（文本、数字、布尔、数组、对象）→ 保存时设置 `funcReturn.state = true`。

因此 `state` 和 `type` 必须保持一致，不能分别修改后留下矛盾状态。

### 2.3 新建方法必须先完成实例化

原实现 `methodMixin.addMethod` 在把方法加入列表前完成以下工作：

1. 为非全局方法生成无连字符 UUID，写入 `method.id`。
2. 为 `funcName` 添加前缀并处理名称重复。
3. 初始化包含 `show_function` 的 `blockData`。
4. 将方法加入响应式方法列表。
5. 返回真正写入列表的同一个方法实例。

`MethodNodeConfig.confirmBtnClick` 随后依赖这个 `id` 调用 `changeMethodById`。没有稳定 `id`，配置面板即使显示“修改成功”，也可能无法把返回值、名称和参数写回方法列表。

### 2.4 保存的权威产物来自方法详情

原实现的保存流程是：

```text
点击保存
  → 保存当前舞台 GraphData
  → 若处于 METHOD_DETAIL，将图写入 curEditMethod.graphData
  → 用每个方法自己的 graphData 构造 LogicEditorService
  → 生成并写回 method.blockData
```

外层页面不得把编辑器当前 `modelValue` 无条件重新翻译，因为当前值可能是方法列表图或变量图。

## 3. 模块职责

| 模块 | 原实现职责 | 当前迁移关注点 |
| --- | --- | --- |
| `FrontLogicEditor.tsx` | Drawer 壳层、方法/变量视图切换、保存事件分发、选中节点状态 | 当前对应 `LogicEditor.tsx`；可见性必须是响应式受控状态 |
| `LogicEditorStage.tsx` | G6 生命周期、三种舞台缓存、切图、保存、删除、布局、事件注册 | 不得混淆三种 GraphData；关闭抽屉前需要保存当前舞台 |
| `LogicEditorLeftBar.tsx` | 节点库、API 库、搜索、拖拽载荷构造 | 原实现包含远程节点/API 与生命周期能力，当前迁移并未全部恢复 |
| `LogicEditorRightBar.tsx` | 按节点类型选择配置编辑器 | 配置面板必须写回领域模型并刷新 G6 模型 |
| `node-config/*` | 方法、变量及通用节点配置 | 方法配置依赖稳定方法 ID 与完整 `funcReturn` |
| `handler/event-service.ts` | 拖放、选中、连线、双击、滚轮、键盘、删除前处理 | 是交互规则中心，不应把规则散落到页面层 |
| `graph/graph-util.ts` | G6 单例、图初始化、行为与节点注册、图缓存 | 生命周期必须成对初始化/销毁，避免重复监听 |
| `graph/util/*` | 领域对象与 G6 节点互转、锚点、边、详情图构造 | 这里定义 GraphData 结构语义，不能随意简化 |
| `service/logic-service.ts` | GraphData → MethodWorkFlow，主流程和支线解析 | 只接受方法详情图；输入缺失时原实现防御不足 |
| `service/translate-new/*` | MethodWorkFlow → process/blockData | 节点类型到翻译服务的映射必须完整 |
| `service/cache-service.ts` | 节点、边、锚点关系和作用域查询缓存 | 空节点返回策略会影响错误位置和可诊断性 |
| `controllers/generators/MethodGenetator.ts` 与 `blocks/*` | blockData → Blockly Workspace → JavaScript | 当前迁移到独立的 `src/blockly-code-generator/`；不得放回 `logic-editor/`，也不得引用其内部实现 |

当前迁移明确保持以下依赖方向：

```text
logic-editor → 输出 processData / blockData
blockly-code-generator → 只消费 blockData 和公开的数据/方法上下文
PageCodeGenerator → 组装页面变量、全部方法与生命周期
应用层 → 展示完整 Vue 3 Options API 页面代码或诊断
```

代码生成模块不接收 `GraphData`，避免重新承担图解析和流程翻译职责。旧实现中的 `eval` 只用于把生成源码转为函数；当前迁移默认只返回源码，不执行动态代码。

`MethodCodeGenerator` 只生成单个方法函数，不能作为完整页面源码展示。完整页面必须通过
`PageCodeGenerator` 生成：页面变量进入 `data()`，Blockly 方法进入 `methods`，生命周期绑定按连线顺序调用方法；
旧协议的 `destroyed` 在 Vue 3 输出中映射为 `unmounted`。

## 4. 核心领域协议

### 4.1 Method

关键字段：

| 字段 | 语义 |
| --- | --- |
| `id` | 方法实例 ID；方法节点通过 `data.funcId` 引用它 |
| `funcName` | 方法英文标识；原实现会做前缀和去重处理 |
| `funcLabel` | 界面展示名称 |
| `parameters` | 参数定义；顺序会影响方法节点锚点顺序 |
| `funcReturn.state` | 是否存在返回值，由 `funcReturn.type !== undefined` 派生 |
| `funcReturn.type` | 返回值基础类型；`undefined` 表示无返回值 |
| `funcReturn.schema` | 对象/数组结构及基础类型描述 |
| `graphData` | 单个方法详情图的 JSON 字符串 |
| `blockData` | 方法保存后的执行产物；原实现最终接入 Blockly XML |

约束：

- 方法节点的 `data.funcId` 必须能在方法列表中唯一找到方法。
- `funcReturn.state === false` 时，方法节点和结束节点都不应保留返回值锚点。
- `funcReturn.state === true` 时，`type` 和 `schema` 必须与返回锚点一致。
- 修改参数或返回值后，方法列表节点和已缓存的方法详情图都需要重新归一化锚点。

### 4.2 GraphData

方法详情图至少包含：

- 唯一 `logic-start-node`。
- 唯一 `logic-end-node`。
- 每个节点完整的 `data.anchors`。
- 主流程使用 statement edge。
- 参数/变量依赖使用 variable edge。
- 边必须同时记录 `sourceAnchor` 和 `targetAnchor`。

锚点 `index` 是节点内协议索引，不是纯视觉序号。节点配置发生变化时，必须同步更新锚点和受影响边，不能只改标签。

### 4.3 三类数据不可互换

| 数据 | 节点特征 | 用途 | 是否可翻译为方法流程 |
| --- | --- | --- | --- |
| 方法列表图 | `logic-func-node`、生命周期节点 | 选择、编排方法 | 否 |
| 方法详情图 | start/end/操作/变量节点 | 方法内部逻辑 | 是 |
| 变量列表图 | 变量节点 | 页面变量管理 | 否 |

## 5. 方法配置的原始交互

原 `MethodNodeConfig` 的行为顺序如下：

1. 根据选中节点的 `data.funcId` 从 `methodList` 查找方法。
2. 深拷贝方法作为表单草稿，避免输入过程直接污染源数据。
3. 用户编辑名称、参数和返回值类型。
4. 点击“确定”时：
   - `type === DataType.Undefined` → `state = false`；
   - 其他类型 → `state = true`；
   - 对象/数组返回值解析成 `schema`；
   - 参数同步更新各自 `schema`；
   - 通过 `changeMethodById(method.id, method)` 写回；
   - 通过 `getCustomMethodDataConfig` 重建当前方法节点锚点；
   - 重新渲染 G6 图。

“空”不是未选择状态，而是明确的“无返回值”协议值。

### 5.1 当前已确认的问题

当前迁移层在 `compatibility/context.ts` 中的默认方法创建器只是：

```ts
setMethodCreator((method) => {
  context.methods.push(method)
  return method
})
```

它没有复现原 `addMethod` 的 ID 分配与 `blockData` 初始化。由节点库拖入的新建方法可能满足：

```text
method.id === undefined
node.data.funcId === undefined
```

而配置保存使用：

```text
changeMethodById(method.id || '', method)
```

此时查找 `item.id === ''` 无法命中 `id === undefined` 的方法。这是“返回值类型看似可选，但确定后无法可靠写回”的高概率根因，优先级为 P0。

### 5.2 正确修复方向

后续修复应恢复“方法实例化”协议，而不是在表单里增加局部补丁：

1. 创建方法时生成稳定 ID。
2. 创建合法的初始 `blockData`，或在新运行时明确替代产物协议。
3. 确保节点 `funcId` 与方法 `id` 相同。
4. `changeMethodById` 找不到目标时必须显式失败，禁止静默成功。
5. 配置保存后同时验证领域模型、节点锚点和详情图锚点。

## 6. 编辑器状态与生命周期

### 6.1 打开

原实现监听全局 `ui_logic_visible`：

1. Drawer 可见后等待 DOM。
2. 加载逻辑节点元数据。
3. 初始化 G6、Grid、Minimap、Menu、Tooltip。
4. 设置缩放范围 `0.5 ~ 2`。
5. 注册图事件与全局保存事件。
6. 恢复上次 `StageMode`，默认进入方法列表。

### 6.2 切换舞台

切换前先把当前图保存到对应缓存：

- `methodListGraph`
- `methodDetailGraphList[method.id]`
- `variableGraph`

然后构建目标图、清空 G6、载入数据并重新渲染。

### 6.3 关闭

关闭时必须：

1. 保存当前舞台数据。
2. 销毁 G6 实例。
3. 清理当前选中态。
4. 注销全局事件监听。

重复打开不能累计监听器或复用已销毁的图实例。

## 7. 节点与连线规则

### 7.1 节点类别

原实现覆盖：

- 流程：开始、结束、if/else、try/catch、foreach、nextTick。
- 方法：自定义方法、方法引用、API。
- 数据：字符串、数字、布尔、数组、对象、变量详情、临时对象。
- 运算：赋值、算术、比较、与/或/非、数组操作。
- 副作用：网络请求、路由、消息、侧边提醒、多语言、页面传值。
- 编排：生命周期节点。

当前迁移已恢复 `logic-lifecycle-node.ts`、对应配置服务和方法列表连线持久化。绑定仍按原协议写入 `ui_bind_lifecircle`，键格式为 `<lifecycle>_method_ids`，值为按连线顺序排列的方法 ID；生命周期编排不属于单个方法的 `processData`。

节点库必须按舞台隔离：`METHOD_LIST` 只提供“新建自定义方法”，生命周期节点由画布自动生成；`METHOD_DETAIL` 提供执行、控制流、表达式、已有方法调用和已有变量；`VARIABLE_LIST` 只提供变量创建。网络请求、异常捕获和比较运算等节点在方法详情中完全可用，但不得落入不会被方法翻译器消费的方法列表图。

### 7.2 两类边

- Statement edge：控制流，连接 entry/exit 锚点。
- Variable edge：数据依赖，连接输出值与输入参数锚点。

连接前校验必须考虑方向、类型、锚点占用、重复连接和作用域。删除节点时还要递归清理展开的变量详情节点及相关边。

### 7.3 支线任务

try/catch、if/else、foreach 等通过锚点 `data._sideQuests` 标记支线。翻译时支线存入 `MethodWorkFlow.sideQuests`，值是二维数组，以支持同类多个分支。

空的 try/catch 分支在原翻译器中会被转换为空数组，不等同于非法主流程。

## 8. 保存与翻译链路

```text
Method.graphData
  → CacheService 建立节点/边查询
  → LogicEditorService.generateWorkFlow()
  → 从 start 沿主控制流递归
  → 收集参数依赖与 sideQuests
  → 构造 MethodWorkFlow[]
  → TranslateService 按节点类型分派翻译器
  → SimpleProcessData[]
  → 原运行时包装 show_function 并序列化为 Blockly XML
  → Method.blockData
```

重要约束：

- `LogicEditorService` 的输入必须是方法详情图。
- start/end 缺失应在边界处返回可识别错误，不能让空对象继续进入 `node2Method`。
- `translateErrorList` 主要记录作用域等连线问题；空数组表示未发现此类非法边。
- “结束块没有指定返回值”在原实现中是 `console.warn`，不会阻止其他流程翻译。

### 8.1 当前保存协议的兼容扩展

- **原行为**：生命周期绑定只写入 `ui_bind_lifecircle`，方法详情翻译结果只包含 `processData` 和 `blockData`。
- **目标行为**：`LogicEditorSavePayload` 额外返回规范化的 `lifecycleBindings`，每项包含生命周期协议值、展示名称和按执行顺序排列的方法 ID，供宿主页直接展示或持久化。
- **兼容影响**：原 Store 键、方法详情 `GraphData`、`processData` 和 `blockData` 均保持不变；`lifecycleBindings` 是新增字段，不能把生命周期方法误合并进单个方法的 `processData`。

### 8.2 Playground 本地恢复记录

低代码 Playground 在收到成功的 `LogicEditorSavePayload` 后，将带版本号的完整记录写入 `localStorage`。
`LogicEditorSavePayload.graphSnapshot` 同时包含方法列表图、以稳定方法 ID 为键的所有方法详情图、变量列表图、
当前舞台和当前方法 ID。宿主记录还必须保存全部方法、页面变量、生命周期绑定、分方法 `processData` 和当前
`blockData`；不能只保存单个 `GraphData`，否则其他舞台的坐标、变量 ID 和生命周期方法 ID 会丢失。

恢复由用户显式触发。宿主页恢复响应式数据后必须通过 `graphSnapshot` prop 回灌快照并重建 `LogicEditor` 实例，
使方法列表图、变量图和方法详情图的内部缓存全部来自同一份恢复记录；不允许让恢复前的组件缓存覆盖持久化数据。
版本 1 记录缺少完整快照时只允许从 `Method.graphData` 降级恢复方法详情图，版本 2 记录执行完整三舞台恢复。
记录结构或版本校验失败时只报告错误，不得部分写入当前编辑状态。

## 9. 原实现与当前迁移的主要差异

### P0：会破坏核心行为

1. **方法创建协议缺失**：当前不自动生成方法 ID、不初始化 blockData，导致配置无法可靠写回。
2. **保存事件完成语义不明确**：Dispatcher 的 `trigger` 不等待异步监听器；外层 `save` 事件可能早于完整保存结果。
3. **GraphData 类型边界曾被混用**：方法列表图不能作为详情图翻译。
4. **错误被静默吞掉**：当前 `changeMethodById` 找不到 ID 时不返回失败，界面仍可能显示成功。

### P1：功能不等价

1. 原左侧栏支持远程逻辑节点、API 库、库/分类查询和帮助信息；当前控制器默认返回空数组。
2. 原 G6 插件包含 Tooltip；当前主要保留 Menu、Minimap、Grid。
3. 原变量编辑支持 Blockly 值回放和代码格式化；当前实现有所简化。
4. 原方法 mixin 还承担名称去重、历史记录、缓存同步等副作用；当前兼容层只保留最小数组操作。

### P2：可维护性与诊断问题

1. 原 `CacheService.getNode_FromCache` 在找不到节点时返回 `{}`，容易把真实错误延迟成 `data.anchors` 空引用。
2. 原翻译器存在大量 `console.warn/error`，其中部分只是非阻断诊断，文案却使用“异常”。
3. 节点配置和翻译协议依赖锚点索引及字符串常量，缺少集中式运行时校验。

## 10. 后续开发强制检查清单

### 新建/复制方法

- [ ] 分配非空且唯一的 `method.id`。
- [ ] 节点 `data.funcId` 与方法 ID 一致。
- [ ] 初始化 `parameters`、`funcReturn`、`graphData`、`blockData` 的合法默认值。
- [ ] 方法列表中名称和 ID 不重复。

### 修改方法配置

- [ ] 使用草稿编辑，点击确定后才写回。
- [ ] `type === undefined` 与 `state === false` 同步。
- [ ] 非空返回类型与 `state === true` 同步。
- [ ] 对象/数组同步更新 `schema`。
- [ ] 重建方法节点锚点。
- [ ] 同步或失效对应方法详情图缓存。
- [ ] 找不到方法 ID 时明确报错，不显示成功。

### 保存

- [ ] 先保存当前舞台。
- [ ] 只翻译各方法自己的 `method.graphData`。
- [ ] 等待翻译完成后再通知外层保存成功。
- [ ] 外层展示读取已提交的 `method.blockData/processData`，不重复翻译当前画布。
- [ ] 生命周期绑定按方法列表连线顺序写入 Store，并通过 `lifecycleBindings` 与方法产物分开展示。
- [ ] 本地记录同时保存图、方法、变量和生命周期上下文；恢复后重建编辑器内部图缓存。
- [ ] 保存失败时不关闭弹框，或给出明确失败状态。

### 图操作

- [ ] start/end 唯一且不可删除。
- [ ] 锚点方向、类型、索引和连接状态一致。
- [ ] 删除节点同时清理相关边和展开节点。
- [ ] 切换舞台不丢失未保存图数据。
- [ ] 打开/关闭不会重复注册事件。

### 翻译

- [ ] 输入确认是方法详情图。
- [ ] start/end/data/anchors 做边界校验。
- [ ] 主流程与 sideQuests 分别验证。
- [ ] 所有 `BlockNames_DTS` 有对应翻译器或明确声明仅供展示。
- [ ] `translateErrorList` 与非阻断 warning 的语义分开。

### Blockly 代码生成

- [ ] `blockly-code-generator` 不引用 `logic-editor` 内部模块。
- [ ] 输入使用方法已经提交的 `blockData`，不得重新翻译当前画布。
- [ ] 每种 `processData.type` 对应的 Blockly 块定义和 JavaScript Generator 成对迁移。
- [ ] 未注册块、XML 解析失败和代码生成失败返回分阶段诊断，不执行不完整代码。
- [ ] 生成阶段不使用 `eval` 或 `new Function` 执行结果。

## 11. 手动回归场景

根据当前仓库约束，页面交互由开发者手动验证。至少覆盖：

1. 新建默认方法，确认其 ID 非空。
2. 返回值从“文本”改为“空”，点击确定后方法节点返回值锚点消失。
3. 返回值从“空”改为“文本”，点击确定后返回值锚点出现。
4. 添加、删除参数后，节点锚点数量和顺序正确。
5. 双击方法进入详情，默认 start→end 图可保存。
6. try/catch 主流程连接且分支为空时可以保存。
7. 有返回值但结束节点未连返回变量时，仅产生明确的非阻断提示。
8. 无返回值时结束节点不出现返回输入，也不产生返回值警告。
9. 从详情切回列表、再重新进入，图数据不丢失。
10. 在方法列表直接保存时，不把方法列表 GraphData 交给翻译器。
11. 保存完成后首页展示的是该方法已经提交的执行产物。
12. 生命周期连接方法后保存，首页展示对应阶段、方法名称和方法 ID；方法为空时 `processData` 仍可合法为 `[]`。
13. 关闭并重新打开编辑器，事件不会重复触发。

## 12. 决策原则

1. 原实现是行为参考，不是逐行照搬目标；其中空对象返回、`eval`、全局静态状态和误导性日志需要显式治理。
2. 任何有意偏离原行为的修改，都应在设计或变更说明中记录“原行为、目标行为、兼容影响”。
3. 优先恢复领域协议，再处理视觉细节。ID、GraphData 类型边界、锚点结构、保存时序和执行产物属于协议。
4. 页面层只负责打开、关闭和展示结果，不应重新实现图翻译或方法持久化。
5. 后续修复应以本文件第 10、11 节作为审查与验收基线。
