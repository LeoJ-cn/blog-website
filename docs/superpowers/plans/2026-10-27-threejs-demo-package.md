# Three.js Demo Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 `@white55/threejs-demo` 的最小独立 Package 骨架，为后续 Three.js 展示能力提供清晰边界，但不实现具体 Demo 或接入主站。

**Architecture:** Package 以 `src/index.ts` 作为唯一公共入口，骨架阶段不导出占位组件或虚假运行时 API。Vue 3 仅作为未来宿主 UI 的对等依赖；Three.js 依赖推迟到首个真实场景，避免当前骨架引入未使用依赖。未来 Three.js 命令式对象由普通 TypeScript 控制器持有并负责释放，不进入 Vue 深层响应式状态。

**Tech Stack:** pnpm Workspace、Vue 3.5.13、TypeScript 5.6.3、vue-tsc 2.2.0；Three.js 首个真实场景再引入，当前官方稳定版本参考值为 0.186.1，但本计划不写入该依赖。

**Spec:** `docs/superpowers/specs/2026-10-27-threejs-demo-package-design.md`

## Global Constraints

- 当前只建立工程骨架，不实现具体技术 Demo。
- Package 名称固定为 `@white55/threejs-demo`，目录固定为 `packages/threejs-demo`。
- 所有依赖使用精确版本，禁止 `^`、`~`、`*` 和 `latest`。
- Vue 代码必须使用 Vue 3、Composition API、`<script setup lang="ts">` 和明确类型契约；本阶段不创建 Vue 组件。
- Package 不得依赖 `apps/web`，本阶段不修改主站路由、导航、页面或项目数据。
- 当前骨架不导出占位组件或虚假运行时 API；`src/index.ts` 只建立合法 ES Module 入口。
- 不新增或修改测试代码；仓库准确授权口令缺失，因此本计划不采用 TDD，也不创建测试夹具或临时测试脚本。
- 不安装依赖、不执行非页面测试、不启动页面、不操作浏览器、不运行 Webpack；需要执行时必须按仓库规则单独取得授权。
- 本计划在当前工作目录与当前分支内实施；用户未明确要求 Git worktree，因此禁止创建、切换或迁移到 worktree。
- 自有前端样式不得使用 CSS Grid；本阶段不创建样式文件。
- 不自动创建 Git commit；如用户另行要求提交，建议提交信息为 `feat: scaffold threejs demo package`。

## Review Focus

- Package 名称或目录与 Workspace 约定不一致时，`pnpm --filter @white55/threejs-demo` 应仍能唯一解析；Task 1 的清单检查与类型检查覆盖此项。
- 依赖版本出现范围符号时应视为失败；Task 1 的 manifest 检查覆盖 `peerDependencies` 与 `devDependencies`。
- 公共入口意外暴露内部实现或占位 API 时应视为失败；Task 1 的入口内容检查覆盖此项。
- 新 Package 反向依赖 `apps/web` 或其他无关 Feature Package 时应视为失败；Task 1 的依赖边界检查覆盖此项。
- Package 加入后 lockfile 与 manifest 不一致时不得宣称完成；Task 1 在获得安装授权后更新 lockfile，并使用冻结 lockfile 检查覆盖此项。

---

### Task 1: 建立 Three.js Demo Package 骨架

**Files:**
- Create: `packages/threejs-demo/AGENTS.md`
- Create: `packages/threejs-demo/README.md`
- Create: `packages/threejs-demo/package.json`
- Create: `packages/threejs-demo/tsconfig.json`
- Create: `packages/threejs-demo/src/index.ts`
- Modify after explicit install approval: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: 根 `AGENTS.md`、`packages/AGENTS.md`、根 `tsconfig.json`、pnpm 的 `packages/*` Workspace 匹配规则。
- Produces: 可由 `@white55/threejs-demo` 唯一解析的私有 ES Module Package；唯一公共入口为 `packages/threejs-demo/src/index.ts`，本阶段无运行时导出。

- [x] **Step 1: 创建 Package 局部规则**

在 `packages/threejs-demo/AGENTS.md` 中声明继承根规则与 `packages/AGENTS.md`，并补充以下局部约束：Three.js 运行时对象不进入 Vue 深层响应式状态；Renderer、Geometry、Material、Texture、事件监听器与动画帧必须有明确所有者并在卸载时释放；新增场景前先更新 README 的公共边界。

- [x] **Step 2: 创建精确版本的 Package manifest**

在 `packages/threejs-demo/package.json` 中写入以下固定字段：

```json
{
  "name": "@white55/threejs-demo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "vue-tsc --noEmit -p tsconfig.json"
  },
  "peerDependencies": {
    "vue": "3.5.13"
  },
  "devDependencies": {
    "typescript": "5.6.3",
    "vue": "3.5.13",
    "vue-tsc": "2.2.0"
  }
}
```

不得加入 `three`：当前没有运行时代码，首个真实场景应另行设计并将当时确认的精确版本加入 `dependencies`。

- [x] **Step 3: 创建 TypeScript 配置**

在 `packages/threejs-demo/tsconfig.json` 中继承 `../../tsconfig.json`，将 `lib` 固定为 `ES2022`、`DOM`、`DOM.Iterable`，包含 `src/**/*.ts`、`src/**/*.vue`、`src/**/*.d.ts`，排除 `dist/**` 与 `node_modules/**`。

- [x] **Step 4: 创建唯一公共入口**

创建 `packages/threejs-demo/src/index.ts`，只写 `export {}` 以建立合法 ES Module；不导出占位类型、组件、控制器或内部路径。

- [x] **Step 5: 编写 Package README**

在 `packages/threejs-demo/README.md` 中记录：Package 定位、当前仅为骨架、Vue/Three.js 生命周期边界、当前目录结构、未来真实场景的建议目录、依赖与公共入口规则，以及明确的非目标。文档使用简体中文，技术标识符保留英文。

- [x] **Step 6: 完成人工边界检查**

逐个检查本任务五个新文件的完整内容，确认：没有 `apps/web` 或无关 Feature Package 依赖；没有 CSS Grid；没有测试代码；没有虚假运行时 API；公开声明、生命周期边界和资源释放语义足够明确。

- [x] **Step 7: 请求 lockfile 更新授权**

向用户展示并请求允许执行：

```bash
pnpm install --lockfile-only
```

在用户明确确认前不得执行。授权后只更新 `pnpm-lock.yaml`，不得升级其他依赖；执行后检查 diff，若出现无关依赖变化则停止并报告，不自行扩大处理范围。

- [x] **Step 8: 请求非页面检查执行授权**

询问用户是否需要 Agent 自动执行以下非页面检查；未获确认时将命令、操作步骤和预期结果交给用户自行执行：

```bash
pnpm --filter @white55/threejs-demo typecheck
pnpm install --lockfile-only --frozen-lockfile
pnpm lint
```

预期结果：Package 被唯一解析；`vue-tsc` 无诊断；冻结 lockfile 检查不产生变更；ESLint 无新增诊断。不得运行任何 Webpack、页面或浏览器命令。

- [x] **Step 9: 核对修改完整性**

运行不涉及测试或安装的只读检查：`git diff --check`、目标文件 `git diff`、目标路径 `git status --short`。逐项核对根 `AGENTS.md` 的批次完成清单；若发现非本批引入的问题，先报告位置、现象、影响和建议，不自行修复。
