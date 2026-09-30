# Low-code 类型治理第二阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 low-code 的第三方类型导入边界、节点核心协议和 G6 shape 回调协议，优先消除跨目录级联诊断。

**Architecture:** 先把 G6 深层源码导入替换为公开入口，隔离第三方实现源码；再将生产节点从“所有字段可选”改成具有必需 `id/type/data/anchors` 的明确协议；最后统一 shape 回调的运行时必需参数。每项完成后重新统计诊断，只将跨多个目录的公共根因纳入本阶段。

**Tech Stack:** Vue 3.5.13、TypeScript 5.6.3、AntV G6 4.7.10、lodash 4.17.21

**Spec:** `docs/superpowers/specs/2026-09-28-low-code-type-governance-design.md`

## Global Constraints

- 不改变节点业务语义、图数据格式、拖拽协议或用户交互。
- 测试代码遵循仓库根规则：需要 TDD 时先取得用户许可。本阶段已于 2026-09-30 获得许可，仅新增节点守卫运行时测试和 shape 协议类型测试。
- 不执行页面自动化测试、浏览器操作或 Webpack 命令。
- 不新增依赖，不执行依赖升级。
- 保持 `strict: true`，禁止新增 `any`、`@ts-ignore`、`@ts-expect-error`、批量非空断言或 ESLint 豁免。
- 公开协议的非直观字段和边界必须补充简体中文注释。
- 本阶段不要求 `pnpm typecheck:low-code` 清零，但每个任务必须降低对应根因的诊断，且不得增加其他错误码总量。

## Review Focus

- G6 公开入口必须提供运行时实际使用的同一类型，不能为了消除第三方诊断复制不完整接口。
- 持久化或外部输入可能不完整，必须在解析边界校验；不能仅靠把字段改成 required 假定数据正确。
- 新建节点与复制节点都必须构造 `id/type/data/anchors`，包括方法、变量、API 和模板节点。
- G6 调用 shape 回调时 `cfg/group` 是运行时必需值；类型收紧不得改变回调名称、注册方式或返回值。
- 错误数量下降必须按 low-code 与第三方分别统计，不能用排除目录制造下降。

---

### Task 1: 收敛 G6 与 lodash 类型依赖边界

**Files:**
- Modify: `packages/low-code/src/logic-editor/interface/index.ts`
- Modify: `packages/low-code/src/logic-editor/LogicEditorStage.tsx`
- Modify: `packages/low-code/src/logic-editor/operation/LogicOperationItem.tsx`
- Modify: `packages/low-code/src/logic-editor/handler/event-service.ts`
- Modify: `packages/low-code/src/logic-editor/graph/util/index.ts`
- Modify: `packages/low-code/src/logic-editor/graph/util/node-update.ts`
- Modify: `packages/low-code/src/logic-editor/graph/behavior/{anchor-event,canvas-event,delete-item,item-event}.ts`
- Modify: `packages/low-code/src/logic-editor/graph/shape/nodes/{logic-array-foreach-node,logic-base-node,logic-set-array-item-node}.ts`

**Interfaces:**
- Consumes: `@antv/g6` 和 `@antv/g-base` 的公开 `.d.ts` 导出。
- Produces: 统一从公开入口获得的 `INode`、`Item`、`NodeConfig`、`IG6GraphEvent`、`UpdateType`、`IShape` 和 `ShapeAttrs`。

- [x] **Step 1: 确认公开导出与深层导入集合**

Run: `rg -n "@antv/.*/(src|lib)/" packages/low-code/src`

Expected: 输出只包含本任务 Files 列出的深层导入调用方。

- [x] **Step 2: 替换深层源码和 lib 导入**

优先从 `@antv/g6` 导入 G6 re-export 的类型；`ShapeAttrs` 从 `@antv/g-base` 公开入口导入。全部使用 `import type`，除非文件实际需要运行时值。不得建立复制版全局 G6 接口。

- [x] **Step 3: 验证第三方实现源码退出检查图**

Run: `pnpm typecheck:low-code`

Expected: `node_modules/.pnpm/@antv+g-base@0.5.16` 的 55 条诊断降为 0；low-code 自身诊断不得因导入替换增加。

- [x] **Step 4: 验证不存在深层导入**

Run: `rg -n "@antv/.*/(src|lib)/" packages/low-code/src`

Expected: 无输出。

- [x] **Step 5: 运行质量检查（未提交）**

Run: `pnpm exec eslint packages/low-code --format stylish`

Expected: 退出码 0。

Run: `git diff --check`

Expected: 退出码 0。

```bash
git add packages/low-code/src/logic-editor
git commit -m "refactor: use public g6 type exports"
```

### Task 2: 建立生产节点核心协议

**Files:**
- Modify: `packages/low-code/src/logic-editor/interface/index.ts`
- Modify: `packages/low-code/src/logic-editor/graph/util/index.ts`
- Modify: `packages/low-code/src/logic-editor/handler/config-builder/{api-config-service,method-config-service,template-config-service,variable-config-service,variable-detial-config-service}.ts`
- Modify: `packages/low-code/src/logic-editor/handler/config-builder/interface/index.ts`
- Modify: `packages/low-code/src/logic-editor/service/cache-service.ts`
- Modify: `packages/low-code/src/logic-editor/service/logic-service.ts`

**Interfaces:**
- Consumes: Task 1 的公开 G6 `NodeConfig` 类型。
- Produces: `INodeConfig<T>`，保证生产节点具有 `id: string`、`type: BlockNames_DTS | string`、`data: NodeConfigData<T>`；`NodeConfigData<T>` 保证 `anchors: AnchorBaseConfig_DTS[]`。

- [x] **Step 1: 固定 `INodeConfig<T>` 签名**

将现有整体 `Partial` 改为：

```ts
export type INodeConfig<T extends NodeConfigDataUnion = {}> =
  Omit<NodeConfig, 'type' | 'data'> & {
    type: BlockNames_DTS | string
    data: NodeConfigData<T>
    nodeWidth?: number
    nodeHeight?: number
    label?: string
    name?: string
    img?: string
    operations?: string[]
  }
```

保留 G6 的必需 `id`，并为 `data`、`anchors`、origin 字段补充触发条件与边界语义注释。

- [x] **Step 2: 在外部图数据边界增加验证/收窄函数**

在 `interface/index.ts` 产出：

```ts
export function isNodeConfig(value: unknown): value is INodeConfig
export function assertNodeConfig(value: unknown, context: string): asserts value is INodeConfig
```

验证至少覆盖对象、非空 `id`、非空 `type`、对象 `data` 和数组 `data.anchors`。错误信息包含 `context`，用于持久化图数据、G6 model 和拖拽模型边界。

- [x] **Step 3: 对齐节点构造器与缓存入口**

方法、变量、API、模板和变量详情构造器必须返回完整 `INodeConfig`。`CacheService` 与 `LogicEditorService` 在接收 `GraphData.nodes` 时使用 Task 2 的守卫，而不是直接断言；内部缓存通过边界后使用 required 协议。

- [x] **Step 4: 复查核心协议诊断变化**

Run: `pnpm typecheck:low-code`

Expected: `cfg.data`、`nodeInfo.data` 和生产节点 `data.anchors` 的 `TS18048` 显著下降；不得新增持久化格式字段或改变 JSON 输出。

- [x] **Step 5: 运行质量检查（未提交）**

Run: `pnpm exec eslint packages/low-code --format stylish`

Expected: 退出码 0。

Run: `pnpm build:vite`

Expected: 退出码 0，仅允许既有 eval/chunk 警告。

Run: `git diff --check`

Expected: 退出码 0。

```bash
git add packages/low-code/src/logic-editor/interface packages/low-code/src/logic-editor/graph/util packages/low-code/src/logic-editor/handler/config-builder packages/low-code/src/logic-editor/service
git commit -m "refactor: require complete low-code node data"
```

### Task 3: 收紧 G6 shape 回调协议

**Files:**
- Modify: `packages/low-code/src/logic-editor/interface/index.ts`
- Modify: `packages/low-code/src/logic-editor/graph/shape/nodes/*.ts`（仅 37 个包含可选 `cfg/group` 回调参数的生产节点文件；`test.ts` 不在修改范围）

**Interfaces:**
- Consumes: Task 2 的 required `INodeConfig<T>` 与 `IModelConfig`。
- Produces: required 参数的 `IShapeOptions`：`calcNodeHeight(cfg)`、`assembleShape(cfg, group)`、`drawShape(cfg, group)`、`getShapeStyle(cfg)`、`initAnchor(cfg, group)`、`drawAnchor(cfg, group)` 和 `getNodeAnchorBg(options)`。

- [x] **Step 1: 固定本批文件清单**

Run: `rg -l "cfg\\?: INodeConfig|group\\?: IIGroup|cfg\\?: ModelConfig" packages/low-code/src/logic-editor/graph/shape/nodes | sort`

Expected: 37 个生产节点文件；保存输出用于差异核对，不修改 `graph/shape/nodes/test.ts`。

- [x] **Step 2: 收紧 `IShapeOptions` 公共回调签名**

G6 在调用这些渲染回调时必须提供 config 和 group；将本包协议中的对应参数设为必需。对 G6 原始 `getAnchorPoints(cfg?)` 的兼容只保留在最终注册边界，不把可选性传播到内部渲染实现。

- [x] **Step 3: 机械对齐生产节点实现**

只移除公共回调中 `cfg`/`group` 参数的 `?` 并对齐 `IGroup`/`IIGroup` 类型；不得改变函数体、坐标、anchor 顺序、图片选择或 G6 注册名。任何真实可缺省分支必须保留显式守卫并记录原因。

- [x] **Step 4: 验证级联错误下降**

Run: `pnpm typecheck:low-code`

Expected: shape 节点中关于 `cfg`、`group`、`cfg.data` 的 `TS18048` 大幅下降；阶段二结束后的 low-code 错误总数必须低于 1000，否则停止进入阶段三并重新分析残余根因。

- [x] **Step 5: 验证改动仅限签名**

逐文件检查 diff，确认 37 个节点文件中只有 import type 和函数参数类型变化，没有运行时表达式变化。

- [x] **Step 6: 运行质量检查（未提交）**

Run: `pnpm lint`

Expected: 退出码 0。

Run: `pnpm build:vite`

Expected: 退出码 0，仅允许既有 eval/chunk 警告。

Run: `git diff --check`

Expected: 退出码 0。

```bash
git add packages/low-code/src/logic-editor/interface/index.ts packages/low-code/src/logic-editor/graph/shape/nodes
git commit -m "refactor: require g6 shape callback inputs"
```

### Task 4: 更新阶段二基线并决定阶段三入口

**Files:**
- Modify: `packages/low-code/TYPECHECK_BASELINE.md`
- Modify: `docs/superpowers/plans/2026-09-28-low-code-type-governance-phase-2.md`

**Interfaces:**
- Consumes: Tasks 1-3 的类型边界和最新诊断。
- Produces: 阶段三按目录清理计划所需的剩余错误总数、文件数、错误码和目录分布。

- [x] **Step 1: 重新统计完整诊断**

分别记录 low-code 自身和第三方源码错误总数、文件数、高频错误码及目录分布，并与第一阶段的 2171/55 基线比较。

- [x] **Step 2: 更新基线文档**

保留第一阶段数据作为历史对照，新增阶段二结果、已消除根因、未解决问题和阶段三目录顺序。不得覆盖原始数字。

- [x] **Step 3: 执行阶段二最终验证**

Run: `pnpm exec eslint packages/low-code --format stylish`

Expected: 退出码 0。

Run: `pnpm lint`

Expected: 退出码 0。

Run: `pnpm build:vite`

Expected: 退出码 0。

Run: `git diff --check`

Expected: 退出码 0。

- [x] **Step 4: 更新计划记录（未提交）**

```bash
git add packages/low-code/TYPECHECK_BASELINE.md docs/superpowers/plans/2026-09-28-low-code-type-governance-phase-2.md
git commit -m "docs: record low-code type governance phase two"
```

- [x] **Step 5: 编写阶段三计划并请用户审阅**

阶段三只针对最新基线中的单文件和单目录错误，不重复修改已经稳定的公共协议。

## 执行记录（2026-09-30）

- Task 1：第三方实现源码诊断从 55 降为 0；AntV 深层 `src/lib` 导入清零。
- Task 2：计划示例中的 `Omit<NodeConfig, 'type' | 'data'>` 在 G6 4.7.10 下会受字符串索引签名影响而丢失必需 `id`，实际采用 `NodeConfig & { type; data }` 保留原字段并收紧核心协议。
- Task 3：计划预估 37 个生产节点；稳定性修复新增 `logic-lifecycle-node.ts` 后实际为 38 个，全部只调整回调参数类型，没有修改运行时表达式。
- 阶段二诊断结果：low-code 从第一阶段 2171 条降为 903 条，涉及文件从 112 降为 74；`TS18048` 从 1477 降为 354。
- 当前工作区包含用户此前未提交的逻辑编辑器稳定性修改，因此本计划未执行 `git add` 或 `git commit`，避免改变既有暂存边界。
- 最终门禁：节点守卫测试 3/3 通过，shape 协议类型测试通过，low-code ESLint、全仓 lint、Vite 构建和 `git diff --check` 均通过；Vite 仅保留既有 eval、legacy target 和大 chunk 警告。
- 阶段三实施计划已写入 `docs/superpowers/plans/2026-09-30-low-code-type-governance-phase-3.md`，等待用户审阅后执行。
