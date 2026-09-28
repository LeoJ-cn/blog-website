# Low-code 类型治理设计

## 背景

`packages/low-code` 已迁入 Vue 3 Monorepo，但目前没有独立 `tsconfig.json`。根 `tsconfig.json` 仅作为共享配置并设置了 `files: []`，因此编辑器直接打开 low-code 的 `.tsx` 文件时无法稳定归属到 Vue JSX 工程，会错误查找 `react/jsx-runtime` 并产生大面积 JSX 误报。

使用临时 Vue JSX 配置对整个 `packages/low-code/src` 做严格扫描后，基线包含约 2171 条 TypeScript 诊断、涉及 114 个文件。诊断主要集中在 `graph`、`service`、`handler` 和 `runtime`，其中 `TS18048` 占多数，说明公共节点协议的可选字段定义产生了大量级联错误。现有 ESLint 命令通过，但迁移目录有显式规则豁免，不能替代 TypeScript 严格检查。

## 目标

1. 为 `@blog/low-code` 建立可被编辑器和命令行一致识别的 Vue JSX TypeScript 工程边界。
2. 提供独立、可重复执行的 low-code 类型检查命令和错误基线。
3. 优先修复公共类型与第三方依赖边界，减少级联错误，再按目录逐批清理。
4. 最终使 `pnpm typecheck:low-code`、`pnpm lint` 和 `pnpm build:vite` 通过。
5. 不通过批量 `any`、`@ts-ignore`、降低 `strict` 或扩大 ESLint 豁免来隐藏问题。

## 非目标

- 不改变 low-code 的业务功能、交互流程和持久化数据格式。
- 不新增或修改测试代码。
- 不执行页面自动化测试、浏览器操作或 Webpack 构建。
- 不在本轮处理 `apps/web/src/components/text-labeling/xpath-selection.ts` 的既有类型错误。
- 不升级 Vue、G6、TypeScript、lodash 或其他现有依赖版本。

## 总体方案

治理按四个阶段推进。每一阶段只处理一个层级的问题，并在结束时重新统计错误数量、涉及文件数和高频错误码。后续阶段必须以当前阶段的验证结果为输入，不能预先假定错误数量。

### 阶段一：建立独立类型检查边界

新增 `packages/low-code/tsconfig.json`，继承根配置并显式设置：

- `jsx: "preserve"`
- `jsxImportSource: "vue"`
- low-code 源码的 `include`
- 必要的 Monorepo 路径映射

在 `packages/low-code/package.json` 增加 `typecheck` 脚本，并在根 `package.json` 增加 `typecheck:low-code`。low-code 直接声明其类型检查所需的精确版本开发依赖：

- `typescript: 5.6.3`
- `@types/lodash: 4.17.25`

版本与现有 `@blog/web` 保持一致，不引入升级。执行已获用户许可的 `pnpm install --lockfile-only` 更新 workspace 锁文件，不安装新软件或 CLI。

本阶段允许类型检查失败，因为它的目标是得到稳定、真实、可复现的基线；但 JSX 不得再指向 React runtime，且 ESLint 与 Vite 构建不能因配置改动退化。

### 阶段二：修复公共协议和依赖边界

优先处理能影响大量调用方的根类型：

- `INodeConfig`、`NodeConfigData` 与节点 `data` 的存在条件。
- anchor 的结构、索引、连接状态和输入输出语义。
- `GraphData`、节点和边模型之间的转换边界。
- `LogicTransferData` 等跨组件协议。
- G6 类型导入，避免从依赖包的 `src` 目录引入第三方实现源码参与严格检查。
- lodash 类型解析，确保 low-code 自身可以直接解析其声明。

公开联合类型、状态和非直观字段必须按仓库规则补充简体中文注释。禁止用非空断言批量压制 `undefined`；只有在运行时不变量已经由构造器、解析器或守卫保证时才可收窄。

本阶段以显著降低 `TS18048`、`TS2322`、`TS2345` 和第三方源码诊断为验收重点。

### 阶段三：按依赖方向清理实现目录

按以下顺序推进，避免上层反复适配尚未稳定的底层类型：

1. `logic-editor/graph`
2. `logic-editor/service`
3. `logic-editor/handler`
4. `logic-editor/runtime`
5. `node-config`、`operation`、TSX 组件和其余目录

每个目录批次只修类型语义、空值边界和确实由类型检查暴露的错误，不顺带重构业务逻辑。完成一个批次后重新执行 low-code 类型检查并记录剩余错误分布。

### 阶段四：收紧工程 Gate

当 `pnpm typecheck:low-code` 清零后：

- 将 low-code 类型检查纳入根 `typecheck` 或 `check:editor` 的常规链路。
- 逐项移除 `eslint.config.mjs` 中不再需要的 low-code 迁移豁免。
- 重新运行最终验证，并在 low-code README 中记录维护命令和约束。

## 数据与依赖方向

类型治理遵循当前包边界：

```text
apps/web
  -> @blog/low-code 公共入口
    -> compatibility / LogicEditor
      -> graph / handler / service / runtime
```

应用层不能为修复 low-code 内部类型而导入其私有实现。low-code 内部不得新增对 `apps/web` 的反向依赖。第三方依赖只通过公开模块入口或本包内明确的兼容类型访问。

## 错误处理原则

- 外部输入、拖拽数据和持久化图数据在边界处解析和校验。
- 内部对象一旦通过边界，应使用明确类型，不在深层实现中重复散落可选链。
- 无法满足协议的数据应产生包含节点类型或字段名的明确错误，不能静默构造残缺对象。
- 保留现有用户反馈通道，不因类型治理改变提示文本或时序。

## 验证策略

每个阶段执行：

```bash
pnpm typecheck:low-code
pnpm lint
pnpm build:vite
git diff --check
```

同时记录：

- TypeScript 错误总数。
- 涉及文件数。
- 高频错误码。
- 各目录错误分布。

页面行为由用户手动验证。Agent 不启动开发服务器、不操作浏览器、不执行页面测试。未经用户另行要求，不新增或修改任何测试代码。

## 风险控制

- 公共类型收紧可能揭示真实的空值路径，因此阶段二需先核对构造和解析逻辑，再修改声明。
- G6 历史类型不完整，必要时在 low-code 内建立最小兼容接口，但不能用全局 `any` 覆盖。
- 每一批保持可独立审查；若错误数量下降但 Vite 构建或现有交互行为发生变化，停止进入下一阶段并回查本批改动。
- 依赖和锁文件只使用已存在的精确版本，执行 `pnpm install --lockfile-only`，不升级依赖。

## 完成标准

- 编辑器不再为 low-code TSX 查找 `react/jsx-runtime`。
- `pnpm typecheck:low-code` 以退出码 0 完成。
- `pnpm lint` 以退出码 0 完成，且不新增迁移豁免。
- `pnpm build:vite` 以退出码 0 完成。
- low-code 的类型检查被纳入常规工程 Gate。
- 文档记录最终命令、边界和仍保留的第三方限制。
