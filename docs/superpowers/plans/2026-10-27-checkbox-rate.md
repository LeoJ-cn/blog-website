# Checkbox 与五星评分组件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `@white55/ui` 增加 Checkbox 与默认五星评分组件，并接入公共入口、独立构建入口、样式和 Storybook。

**Architecture:** 沿用现有 Element Plus 薄封装模式，每个组件由一个 Vue SFC、一个独立 entry 和一个独立 CSS 入口组成。聚合入口、catalog、Package exports 与 Vite library entries 同步维护，Playground 仅通过 `@white55/ui` 公共子路径消费组件。

**Tech Stack:** Vue 3.5.13、TypeScript 5.6.3、Element Plus 2.9.5、Vite 6.0.11、Storybook Vue 3

**Spec:** `docs/superpowers/specs/2026-10-27-checkbox-rate-design.md`

## Global Constraints

- 不新增或修改测试代码；本任务不执行 TDD。
- 不安装依赖，不执行 Webpack，不启动页面或浏览器。
- 自有前端样式禁止使用 CSS Grid。
- 文档与必要代码注释使用简体中文；技术标识符保持英文。
- 所有新增公共入口保持明确的 Package 边界。

## Review Focus

- Checkbox 半选状态仅是展示状态，用户点击后仍通过布尔 `v-model` 更新选择值。
- Checkbox 禁用时不得更新模型值。
- Rate 默认上限为 `5`，模型值保持 `number`。
- Rate 的 `allowHalf`、`clearable`、`disabled` 和 `readonly` 必须准确透传。
- 根入口、子路径入口、CSS 子路径、catalog 和 Vite entry 必须同时可发现新组件。

---

### Task 1: 实现 UiCheckbox

**Files:**
- Create: `packages/ui/src/components/UiCheckbox.vue`
- Create: `packages/ui/src/styles/checkbox.css`
- Create: `packages/ui/src/entries/checkbox.ts`

**Interfaces:**
- Consumes: Element Plus `ElCheckbox`。
- Produces: `UiCheckbox`，props 为 `modelValue?: boolean`、`disabled?: boolean`、`indeterminate?: boolean`，事件为 `update:modelValue(boolean)` 与 `change(boolean)`，默认插槽为标签内容。

- [ ] **Step 1: 创建 Checkbox SFC**

  使用 `<script setup lang="ts">` 声明严格类型的 props/emits，通过 `inheritAttrs: false` 将额外属性透传给 `ElCheckbox`，模板只负责受控值、状态和默认插槽。

- [ ] **Step 2: 创建独立样式入口**

  在 `checkbox.css` 中通过组件根类设置项目语义 Token，不使用 CSS Grid。

- [ ] **Step 3: 创建独立代码入口**

  `entries/checkbox.ts` 导出 `UiCheckbox` 并导入 `styles/checkbox.css`，保持与现有 entry 相同结构。

### Task 2: 实现 UiRate

**Files:**
- Create: `packages/ui/src/components/UiRate.vue`
- Create: `packages/ui/src/styles/rate.css`
- Create: `packages/ui/src/entries/rate.ts`

**Interfaces:**
- Consumes: Element Plus `ElRate`。
- Produces: `UiRate`，props 为 `modelValue?: number`、`max?: number`、`disabled?: boolean`、`readonly?: boolean`、`allowHalf?: boolean`、`clearable?: boolean`，事件为 `update:modelValue(number)` 与 `change(number)`；`max` 默认值为 `5`。

- [ ] **Step 1: 创建 Rate SFC**

  使用 `<script setup lang="ts">` 和 `withDefaults` 固定 `max` 默认值，通过 props/emits 保持单一受控数据源并透传额外属性。

- [ ] **Step 2: 创建独立样式入口**

  在 `rate.css` 中设置评分组件的项目语义颜色，不使用 CSS Grid。

- [ ] **Step 3: 创建独立代码入口**

  `entries/rate.ts` 导出 `UiRate` 并导入 `styles/rate.css`。

### Task 3: 接入公共 API 与构建

**Files:**
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/catalog.ts`
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/vite.config.ts`

**Interfaces:**
- Consumes: Task 1 的 `UiCheckbox` 与 Task 2 的 `UiRate`。
- Produces: `@white55/ui` 聚合导出、`@white55/ui/checkbox`、`@white55/ui/rate`、对应 CSS 子路径及 Vite library entry。

- [ ] **Step 1: 更新聚合入口与 catalog**

  导出两个组件，并将 `checkbox`、`rate` 加入 `uiComponentSlugs`。

- [ ] **Step 2: 更新 Package exports**

  增加两个组件代码入口与两个 CSS 入口，不改变既有导出。

- [ ] **Step 3: 更新 Vite library entries**

  为 `checkbox` 与 `rate` 添加构建入口，确保产物命名和现有组件一致。

### Task 4: 添加 Playground stories

**Files:**
- Create: `packages/ui-playground/src/checkbox.stories.ts`
- Create: `packages/ui-playground/src/rate.stories.ts`

**Interfaces:**
- Consumes: `@white55/ui/checkbox`、`@white55/ui/rate` 及各自 CSS 子路径。
- Produces: Checkbox 默认、半选、禁用展示和 Rate 默认、半星、只读展示。

- [ ] **Step 1: 添加 Checkbox stories**

  使用本地 `ref<boolean>` 展示双向绑定，并覆盖默认、半选和禁用状态。

- [ ] **Step 2: 添加 Rate stories**

  使用本地 `ref<number>` 展示双向绑定，并覆盖默认、允许半星和只读状态。

### Task 5: 静态验证与完整审查

**Files:**
- Inspect: 本计划全部触碰文件。

**Interfaces:**
- Consumes: Tasks 1-4 的全部产物。
- Produces: 类型检查、Vite 构建与人工规则审查结果。

- [ ] **Step 1: 执行 UI Package 类型检查**

  Run: `pnpm --filter @white55/ui typecheck`

  Expected: 命令退出码为 `0`，无 TypeScript/Vue 诊断。

- [ ] **Step 2: 执行 UI Package Vite 构建**

  Run: `pnpm --filter @white55/ui build:vite`

  Expected: 命令退出码为 `0`，产生 `checkbox.js`、`rate.js` 及对应 CSS 文件。

- [ ] **Step 3: 检查全部触碰文件**

  检查实现逻辑、公开协议、简体中文注释要求、CSS Grid 禁令、入口一致性及完整诊断；不得用构建结果替代人工审查。

- [ ] **Step 4: 提供手动页面验证步骤**

  给出用户可执行的 Storybook 启动命令、交互步骤和预期结果；本任务不自动启动页面。
