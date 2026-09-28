# Low-code 类型治理第一阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `@blog/low-code` 建立独立、可复现的 Vue JSX TypeScript 检查边界，并记录完整源码的严格类型错误基线。

**Architecture:** low-code 使用独立 `tsconfig.json` 继承仓库根严格配置，通过包内 `typecheck` 脚本扫描全部源码。第一阶段不修迁移代码的类型错误，而是消除 React JSX 误识别、补齐直接类型依赖，并将真实错误分布固化为后续阶段输入。

**Tech Stack:** Vue 3.5.13、TypeScript 5.6.3、TSX、pnpm Workspace、ESLint 9、Vite 6

**Spec:** `docs/superpowers/specs/2026-09-28-low-code-type-governance-design.md`

## Global Constraints

- 不改变 low-code 的业务功能、交互流程和持久化数据格式。
- 不新增或修改测试代码；本阶段使用配置检查、类型检查、ESLint 和 Vite 构建验证。
- 不执行页面自动化测试、浏览器操作、Webpack 构建或构建基准命令。
- 所有依赖使用精确版本，禁止 `^`、`~`、`*` 和 `latest`。
- 只使用现有版本 `typescript: 5.6.3` 和 `@types/lodash: 4.17.25`，不升级依赖。
- 已获用户许可执行 `pnpm install --lockfile-only`，不安装新软件或 CLI。
- 第一阶段的 `typecheck:low-code` 预期仍失败；不得用 `any`、`@ts-ignore`、关闭 `strict` 或新增 ESLint 豁免压低基线。
- `apps/web/src/components/text-labeling/xpath-selection.ts` 的既有类型错误不属于本计划。

## Review Focus

- 编辑器单独打开 low-code `.tsx` 时必须使用 Vue JSX，不能再请求 `react/jsx-runtime`；由 Task 1 的 `--showConfig` 检查固定。
- 包内检查必须覆盖未被 `apps/web` 当前入口引用的源码；由 Task 1 的 `listFiles` 检查固定。
- low-code 必须直接声明其使用的类型工具，不能依赖 `@blog/web` 偶然提供；由 Task 1 的 package manifest 检查固定。
- 第三方源码诊断与 low-code 自身诊断必须分开统计，避免错误基线失真；由 Task 2 的报告结构固定。
- 新增检查不得改变运行时代码或 Vite 产物入口；由 Task 3 的差异检查和 Vite 构建固定。

---

### Task 1: 建立 low-code 独立 TypeScript 工程

**Files:**
- Create: `packages/low-code/tsconfig.json`
- Modify: `packages/low-code/package.json`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: 根 `tsconfig.json` 的 `strict`、`moduleResolution: "Bundler"` 和 `noEmit` 配置。
- Produces: `pnpm --filter @blog/low-code typecheck` 与根命令 `pnpm typecheck:low-code`；后续任务以该命令输出为唯一 low-code 类型基线。

- [x] **Step 1: 新增 `packages/low-code/tsconfig.json`**

配置必须继承 `../../tsconfig.json`，设置 `jsx: "preserve"`、`jsxImportSource: "vue"`、`baseUrl: "."`，并包含 `src/**/*.ts`、`src/**/*.tsx` 和 `src/**/*.d.ts`。不得关闭 `strict`，不得排除 low-code 的迁移目录。

- [x] **Step 2: 为 `@blog/low-code` 声明检查脚本和直接开发依赖**

在 `packages/low-code/package.json` 增加：

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "devDependencies": {
    "@types/lodash": "4.17.25",
    "typescript": "5.6.3"
  }
}
```

保留现有精确版本依赖，不重排到其他依赖区。

- [x] **Step 3: 增加根目录入口命令**

在根 `package.json` 的 `scripts` 增加：

```json
"typecheck:low-code": "pnpm --filter @blog/low-code typecheck"
```

在 `x-script-docs` 增加对应简体中文说明。本阶段不把它串入现有 `typecheck` 或 `check:editor`，因为真实基线尚未清零。

- [x] **Step 4: 更新 workspace 锁文件**

Run: `pnpm install --lockfile-only`

Expected: 退出码 0；`pnpm-lock.yaml` 的 `packages/low-code` importer 出现 `typescript: 5.6.3` 和 `@types/lodash: 4.17.25`，不得发生依赖版本升级。

- [x] **Step 5: 验证 Vue JSX 配置生效**

Run: `pnpm --filter @blog/low-code exec tsc --showConfig -p tsconfig.json`

Expected: 输出包含 `"jsx": "preserve"`、`"jsxImportSource": "vue"`、`"strict": true`，并列出 `LogicEditor.tsx`、`LogicEditorLeftBar.tsx`、`LogicEditorStage.tsx` 和 `LogicEditorRightBar.tsx`。

- [x] **Step 6: 验证完整源码进入工程**

Run: `pnpm --filter @blog/low-code exec tsc --listFilesOnly -p tsconfig.json`

Expected: 输出包含 `logic-editor/graph`、`logic-editor/service`、`logic-editor/handler`、`logic-editor/runtime` 和 TSX 组件；不再出现 `react/jsx-runtime` 解析请求。

- [x] **Step 7: 检查本任务差异**

Run: `git diff --check`

Expected: 退出码 0。

- [x] **Step 8: 提交本任务**

```bash
git add package.json packages/low-code/package.json packages/low-code/tsconfig.json pnpm-lock.yaml
git commit -m "chore: add low-code typecheck boundary"
```

### Task 2: 记录严格类型错误基线

**Files:**
- Create: `packages/low-code/TYPECHECK_BASELINE.md`

**Interfaces:**
- Consumes: Task 1 产生的 `pnpm typecheck:low-code`。
- Produces: 后续公共类型治理计划使用的错误总数、文件数、高频错误码和目录分布。

- [x] **Step 1: 运行完整 low-code 类型检查**

Run: `pnpm typecheck:low-code`

Expected: 当前阶段以非 0 退出；输出是 Vue JSX 下的真实诊断，不包含 `react/jsx-runtime` 或 `JSX.IntrinsicElements` 缺失错误。

- [x] **Step 2: 分离 low-code 与第三方源码诊断**

分别统计路径包含 `packages/low-code/src` 和 `node_modules/.pnpm` 的诊断。不得把第三方源码错误计入 low-code 自身错误总数。

- [x] **Step 3: 写入 `TYPECHECK_BASELINE.md`**

文档必须记录：

- 执行日期与完整命令。
- low-code 自身错误总数与涉及文件数。
- 第三方源码诊断总数与主要包名。
- low-code 高频错误码及数量。
- `graph`、`service`、`handler`、`runtime`、TSX/其他目录分布。
- 阶段二优先处理的公共协议和依赖边界。
- 明确说明第一阶段允许检查失败，禁止以降低严格度清零。

- [x] **Step 4: 对照基线完整性**

Run: `rg -n "react/jsx-runtime|JSX.IntrinsicElements|TS18048|TS2322|TS2345|node_modules|graph|service|handler|runtime" packages/low-code/TYPECHECK_BASELINE.md`

Expected: JSX 误报被记录为已消除；主要错误码和目录均有数字，而不是占位符。

- [x] **Step 5: 检查文档差异**

Run: `git diff --check`

Expected: 退出码 0。

- [x] **Step 6: 提交本任务**

```bash
git add packages/low-code/TYPECHECK_BASELINE.md
git commit -m "docs: record low-code typecheck baseline"
```

### Task 3: 验证第一阶段没有运行时回归

**Files:**
- Modify: `docs/superpowers/plans/2026-09-28-low-code-type-governance-phase-1.md`（只勾选完成项和记录实际验证结果）

**Interfaces:**
- Consumes: Task 1 的工程配置和 Task 2 的错误基线。
- Produces: 可进入阶段二设计与计划的已验证第一阶段状态。

- [x] **Step 1: 运行 low-code 定向 ESLint**

Run: `pnpm exec eslint packages/low-code --format stylish`

Expected: 退出码 0。

- [x] **Step 2: 运行全仓 ESLint**

Run: `pnpm lint`

Expected: 退出码 0。

- [x] **Step 3: 运行允许的生产构建**

Run: `pnpm build:vite`

Expected: 退出码 0；既有 `eval` 和 chunk 体积警告可以保留，但不得出现新增错误。

- [x] **Step 4: 检查依赖版本和运行时代码差异**

Run: `git diff -- package.json packages/low-code/package.json packages/low-code/tsconfig.json pnpm-lock.yaml packages/low-code/src`

Expected: 依赖均为设计指定的精确版本；`packages/low-code/src` 没有因第一阶段配置工作产生运行时代码修改。

- [x] **Step 5: 最终差异检查**

Run: `git diff --check`

Expected: 退出码 0。

- [x] **Step 6: 更新计划验证记录并提交**

在本计划对应步骤中勾选完成项，记录 `typecheck:low-code` 的实际错误总数、涉及文件数和未通过原因，并提交：

实际结果：`packages/low-code/src` 有 2171 条错误、涉及 112 个文件；第三方源码有 55 条错误、涉及 `@antv/g-base@0.5.16` 的 2 个文件。失败原因是迁移代码尚未满足根配置的严格类型约束，属于后续阶段治理输入；Vue JSX 配置误报为 0。

```bash
git add docs/superpowers/plans/2026-09-28-low-code-type-governance-phase-1.md
git commit -m "docs: complete low-code typecheck phase one"
```

### Task 4: 为阶段二准备精确输入

**Files:**
- Create: `docs/superpowers/plans/2026-09-28-low-code-type-governance-phase-2.md`

**Interfaces:**
- Consumes: `packages/low-code/TYPECHECK_BASELINE.md` 的实际统计和阶段一最终验证结果。
- Produces: 只覆盖公共类型与第三方依赖边界的阶段二实施计划；不得提前规划目录级逐文件清理。

- [x] **Step 1: 从基线选择阶段二根因集合**

只选择会同时影响多个目录的公共类型或依赖边界。每个根因必须列出真实诊断样例、定义位置和至少三个调用方；单文件错误留到阶段三。

- [x] **Step 2: 编写阶段二计划**

计划必须明确公共接口签名、受影响文件、每批验证命令和错误数量下降预期。若需要新增依赖，必须再次获得用户确认。

- [x] **Step 3: 自检阶段二计划**

确认没有通过放宽 `strict`、新增 `any`、非空断言堆叠或 ESLint 豁免隐藏错误，并请用户审阅后再执行。
