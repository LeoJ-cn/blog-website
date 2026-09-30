# 低代码逻辑编辑器稳定性修复实施计划

> 对应设计：`docs/superpowers/specs/2026-09-28-low-code-logic-editor-migration-design.md`
>
> 行为基线：`docs/references/logic-editor-original-implementation.md`

## 目标

按风险和依赖顺序修复当前逻辑编辑器迁移中的状态切换、方法图持久化、保存事务、图数据边界、节点配置、抽屉生命周期以及新建方法协议问题，使 Vue 3 版本恢复原实现的关键行为，并保持宿主页只在保存成功后展示最新 `processData`。

## 实施约束

- 严格按本文任务 1～7 顺序实施；每个任务完成后先检查 diff，再进入下一项。
- 不新增或修改测试代码。
- 不自动启动开发服务器、浏览器或执行页面交互测试；页面验收由用户按本文步骤手动完成。
- 类型检查、Lint、Vite 构建等非页面命令在执行前先询问用户。
- 不执行 Webpack 命令。
- 不自动提交 Git；全部修改保留为工作区 diff，供用户审查。
- 不把 `METHOD_LIST`、`METHOD_DETAIL`、`VARIABLE_LIST` 三种 `GraphData` 相互当作可替换数据。

## 任务 1：修复“方法 / 变量”受控状态与画布切换

### 修改文件

- `packages/low-code/src/logic-editor/LogicEditor.tsx`
- `packages/low-code/src/logic-editor/LogicEditorStage.tsx`

### 修改内容

1. 为 `ElRadioGroup` 补齐 Vue 3 受控值更新：`onUpdate:modelValue` 必须先更新 `mode`，再调用切换逻辑。
2. `radioChange` 必须幂等：重复选择当前页签不得覆盖 `preStageMode`。
3. 从变量页签返回方法页签时，仅允许恢复 `METHOD_LIST` 或 `METHOD_DETAIL`；若缓存值非法则回退 `METHOD_LIST`。
4. `LogicEditorStage.updateGraphData` 切换前保存当前阶段，切换后从对应阶段缓存或领域数据重建并执行 `graph.data`、`graph.render`。
5. 外部 `modelValue` 更新时，如果当前显示的是该模型代表的图，必须同步到 G6；不得只改组件字段而不重绘。
6. 空变量集合只应显示空的变量画布，不能改变页签高亮、方法图缓存或方法详情状态。

### 人工验收

1. 打开逻辑编辑器，确认“方法”高亮且方法图存在。
2. 点击“变量”，确认“变量”高亮；没有页面变量时允许画布为空。
3. 再点击“方法”，确认原方法图立即恢复。
4. 在方法详情中切换到变量再返回，确认仍回到同一个方法详情且节点、连线未丢失。

## 任务 2：把方法详情图可靠写回真实方法对象

### 修改文件

- `packages/low-code/src/logic-editor/LogicEditorStage.tsx`
- `packages/low-code/src/logic-editor/handler/event-service.ts`
- `packages/low-code/src/logic-editor/compat/method.ts`

### 修改内容

1. 保留 `curEditMethod` 作为编辑视图快照，但所有图变更必须通过稳定 `method.id` 定位 `context.methods` 中的真实方法。
2. 提供唯一的“持久化当前方法详情图”入口，同时更新：
   - `methodDetailGraphList[methodId]`；
   - 当前编辑快照的 `graphData`；
   - `context.methods` 中源方法的 `graphData`。
3. 节点拖拽结束、连线变化、节点删除、配置确认、切换阶段和保存前统一调用该入口，消除“部分操作能保存、部分操作只留在 clone 中”的差异。
4. `changeMethodById` 找不到方法时返回明确失败或抛出带方法 ID 的错误，禁止静默成功。
5. 恢复方法详情删除节点时对子变量详情节点及关联边的递归清理，避免产生悬空节点和非法翻译输入。

### 人工验收

1. 进入方法详情，移动节点、增加连线、修改节点配置后返回方法列表。
2. 再次进入该方法，确认上述修改全部保留。
3. 删除带子变量详情的节点，确认关联节点和边同步消失。

## 任务 3：把保存改为可等待、可失败的单一事务

### 修改文件

- `packages/low-code/src/logic-editor/LogicEditor.tsx`
- `packages/low-code/src/logic-editor/LogicEditorStage.tsx`
- `packages/low-code/src/compatibility/types.ts`
- `packages/low-code/src/types/logic-editor.ts`（新增）
- `packages/low-code/src/types/index.ts`
- `packages/low-code/src/index.ts`
- `apps/web/src/pages/PlaygroundLowCodePage.vue`

### 数据契约

```ts
interface LogicEditorSavePayload {
  graphData: GraphData
  processData: SimpleProcessData[]
  blockData: string
}
```

`graphData` 明确表示本次保存的当前方法详情图；`processData` 和 `blockData` 必须由同一份图同步翻译产生。没有当前方法详情时，保存按钮不得伪造成功结果。

### 修改内容

1. `LogicEditorStage.save()` 返回 `Promise<LogicEditorSavePayload>`，内部按固定顺序执行：
   - 持久化当前图；
   - 校验当前方法和稳定 ID；
   - 调用 `LogicEditorService` 翻译；
   - 写回真实方法的 `graphData`、`blockData`；
   - 返回完整 payload。
2. 翻译错误不得被吞掉；失败时提示错误并 reject，不能触发外层 `save` 成功事件。
3. `LogicEditor` 通过子组件实例直接 `await stage.save()`；在 Promise 成功后才 `$emit('save', payload)`。
4. 保存期间禁用保存按钮，避免并发保存；无论成功失败都在 `finally` 恢复按钮。
5. `LowCodeDispatcherAdapter` 若继续支持保存事件，监听器和 `trigger` 必须允许 Promise 返回；组件内部主保存链路不再依赖“触发后立即继续”的 fire-and-forget 行为。
6. Playground 直接使用 payload 展示 `processData`，仅在保存成功后关闭弹框；失败时保持弹框打开。

### 人工验收

1. 对合法方法点击保存：只出现一次成功提示，弹框关闭，首页显示本次 payload 的 `processData`。
2. 对缺少必要连线或翻译失败的方法点击保存：显示明确错误，弹框不关闭，首页旧结果不被覆盖。
3. 快速连续点击保存，确认只执行一次事务。

## 任务 4：分离三类图数据的状态边界

### 修改文件

- `packages/low-code/src/logic-editor/LogicEditor.tsx`
- `packages/low-code/src/logic-editor/LogicEditorStage.tsx`
- `packages/low-code/src/types/logic-editor.ts`
- `packages/low-code/src/index.ts`
- `apps/web/src/pages/PlaygroundLowCodePage.vue`

### 修改内容

1. 新增内部快照类型，分别保存：
   - `methodListGraph`；
   - `methodDetailGraphs: Record<methodId, GraphData>`；
   - `variableGraph`。
2. `modelValue` 保留为宿主传入的初始/当前方法详情图兼容入口；方法列表图和变量图不得再通过 `update:modelValue` 覆盖它。
3. `update:modelValue` 只在当前方法详情图发生有效变更时发出。
4. 阶段切换只更新内部快照和 `stageMode`，不改变外层业务结果。
5. 以方法 ID 作为详情图缓存唯一键；无 ID 方法不能进入详情编辑状态。
6. 对公开类型补充简体中文注释，明确每份图的所属阶段、缓存键和保存语义。

### 人工验收

1. 在方法列表、方法详情、变量三个阶段间反复切换。
2. 确认三类图各自恢复，不互相覆盖。
3. 保存后确认宿主页拿到的是当前方法详情图对应的 `processData`，而不是变量图或方法列表图。

## 任务 5：恢复节点配置注入与动态配置编辑器

### 修改文件

- `packages/low-code/src/compatibility/types.ts`
- `packages/low-code/src/logic-editor/LogicEditorStage.tsx`
- `packages/low-code/src/logic-editor/handler/config-builder/node-config-services-factory.ts`
- `packages/low-code/src/logic-editor/operation/LogicOperationItem.tsx`
- `apps/web/src/pages/PlaygroundLowCodePage.vue`

### 修改内容

1. 为 `getLogicNodes()` 定义可识别的节点配置返回类型；兼容层负责把外部记录解码成编辑器配置，不把 `unknown[]` 直接丢给 UI。
2. 编辑器初始化时逐项调用 `NodeConfigServicesFactory.injectINodeConfigService`，完成后再创建/渲染图。
3. 对缺失或非法配置给出包含节点类型的明确警告；未知节点可回退通用配置，但不得读取不存在的 `anchors`。
4. 恢复动态配置树所需的组件解析、事件映射、自定义 props、子值变更、文本节点和删除键协议。
5. 对 Element Plus `change` 事件的额外参数做类型保护；只有数组才执行 `deleteKeys.forEach`。
6. Playground 的空控制器保持可运行；内置节点依赖本地默认配置，外部扩展节点由 controller 注入。

### 人工验收

1. 分别选择开始、结束、异常捕获、赋值等节点，右侧展示对应配置而非统一空态。
2. 修改一个字段并确认，重新选择该节点后值仍存在。
3. 直接保存默认方法，不再出现 `Cannot read properties of undefined (reading 'anchors')`。

## 任务 6：修复抽屉可见性、销毁和事件清理

### 修改文件

- `packages/low-code/src/logic-editor/LogicEditor.tsx`
- `packages/low-code/src/logic-editor/LogicEditorStage.tsx`
- `packages/low-code/src/compatibility/context.ts`
- `packages/low-code/src/compatibility/types.ts`
- `packages/low-code/src/logic-editor/graph/graph-util.ts`

### 修改内容

1. 将真实 `visible` 显式传给 `LogicEditorStage`，监听 `false → true` 和 `true → false`，而不是只依赖 mount/unmount。
2. 打开时严格执行一次：加载节点配置、初始化 G6、注册事件、恢复当前阶段图。
3. 关闭时严格执行一次：保存当前阶段缓存、注销所有 dispatcher/G6/DOM 事件、销毁图实例、清空选择态。
4. 补齐 `@idg/gui/logic/delete` 的 `unlisten`，并核对每一个 `listen/on/addEventListener` 都有对称清理。
5. 移除同一 context 的重复全局绑定；context 变化时先释放旧绑定再接入新 context。
6. 当前版本显式限制同一页面只激活一个逻辑编辑器实例；若检测到第二实例，抛出可诊断错误，避免共享 `GraphUtil` 静默串状态。
7. 默认 store 适配器必须能驱动 Vue 可见性更新，不能依赖调用方碰巧传入 `reactive(new Map())`。

### 人工验收

1. 连续打开、关闭编辑器至少 5 次，确认图每次正常显示且无重复事件。
2. 每次点击保存、删除、布局只触发一次。
3. 关闭后再打开，当前方法和图数据按约定恢复，控制台无已销毁 graph 访问错误。

## 任务 7：恢复新建方法协议和生命周期节点

### 修改文件

- `packages/low-code/src/compatibility/context.ts`
- `packages/low-code/src/logic-editor/compat/method.ts`
- `packages/low-code/src/logic-editor/graph/shape/register-nodes.ts`
- `packages/low-code/src/logic-editor/graph/shape/nodes/logic-lifecycle-node.ts`（新增/从原实现等价迁移）
- `packages/low-code/src/logic-editor/handler/config-builder/lifecycle-config-service.ts`（新增/从原实现等价迁移）
- `packages/low-code/src/logic-editor/assets/lifecycle.svg`（按当前资产目录实际位置恢复）
- 生命周期节点涉及的枚举、配置映射和导出文件

### 修改内容

1. 新建方法时生成稳定唯一 ID，并初始化 `graphData`、`blockData`、参数、返回值和展示名称所需字段。
2. 在插入方法列表前校验 `funcName`、`funcLabel` 和 ID，避免产生不可进入详情或无法保存的方法。
3. 恢复生命周期节点的图形注册、左侧节点入口、配置服务、图标和翻译服务映射。
4. 对照原实现核对节点注册清单，确认没有其他已支持节点因迁移漏注册。
5. 生命周期节点配置变更必须走任务 2 建立的统一方法图持久化入口。

### 人工验收

1. 新建方法后立即进入详情，确认存在开始/结束节点且可保存。
2. 返回列表再进入，确认同一稳定 ID 和图数据仍存在。
3. 添加生命周期节点、配置并保存，确认无未知节点、锚点或配置服务错误。

## 最终静态检查与人工回归

### Agent 在获得用户许可后执行的非页面命令

以仓库现有脚本为准，优先执行：

```bash
pnpm --filter @blog-web/low-code typecheck
pnpm lint
pnpm build:vite
```

若脚本名不存在，先报告实际可用脚本，不擅自改用 Webpack。

### 用户人工页面回归顺序

1. 打开编辑器，验证方法/变量切换。
2. 新建方法，进入详情并编辑节点、连线和配置。
3. 返回列表后再次进入，验证图持久化。
4. 保存合法图，验证弹框关闭和首页 `processData` 更新。
5. 制造非法连线后保存，验证错误可见、弹框保持打开、首页结果不变。
6. 反复关闭/打开，验证无重复事件和空白画布。
7. 验证异常捕获和生命周期节点的配置、连线与保存。

## 完成标准

- 七项任务按序完成，代码 diff 与本计划一致。
- 合法保存返回完整 `LogicEditorSavePayload`，首页仅消费该 payload。
- 保存失败不会关闭弹框或覆盖旧结果。
- 三类图状态不互相覆盖。
- 方法详情修改可靠写回 `context.methods`。
- 节点配置和生命周期节点恢复到原实现的关键行为。
- 抽屉重复打开关闭不产生事件泄漏或共享状态污染。
- 用户完成页面人工回归并确认预期结果。
