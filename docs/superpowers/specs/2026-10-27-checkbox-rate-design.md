# Checkbox 与五星评分组件设计

## 意图

为 `@white55/ui` 增加与现有组件一致的表单基础能力，使业务应用可通过稳定的公共入口使用复选框和五星评分，而不直接耦合 Element Plus 内部入口。

## 目标

- 新增 `UiCheckbox`，支持布尔值 `v-model`、禁用、半选状态和默认标签插槽。
- 新增 `UiRate`，默认显示五星，支持数值 `v-model`、禁用、只读、半星与清空。
- 为两个组件提供根入口、独立子路径、独立样式入口和 Storybook 示例。
- 保持现有 Vue 3、TypeScript、Element Plus 薄封装方式和构建产物结构。

## 非目标

- 不实现 Checkbox Group、多选值数组或自定义评分图标。
- 不新增或修改测试代码，不安装依赖，不执行 Webpack 或自动页面测试。
- 不改变已有组件的 API、样式或构建入口。

## 约束

- 组件使用 Vue 3 Composition API 与 `<script setup lang="ts">`。
- Props 向下、事件向上；`v-model` 分别使用 `boolean` 与 `number` 类型。
- 自有样式不得使用 CSS Grid。
- 非直观的公开协议和边界行为使用简体中文注释。

## 方案比较

1. 原生 HTML 控件自行实现：依赖少，但需要重复处理键盘、ARIA、半选与评分交互状态，和现有组件库模式不一致。
2. Element Plus 薄封装（采用）：复用 `ElCheckbox` 与 `ElRate` 的成熟交互和无障碍能力，只暴露本项目需要的稳定 API，并保持现有组件风格。
3. 直接从公共入口重导出 Element Plus：代码最少，但无法形成稳定命名、样式入口和受控公共协议。

## 组件边界

- `UiCheckbox` 只负责单个布尔选择状态，标签内容由默认插槽提供。
- `UiRate` 只负责 `0` 至 `max` 的评分选择；本次公共 API 将 `max` 固定为默认值 `5` 的可选参数，以五星为默认但保留 Element Plus 的基础扩展能力。
- 两个组件分别拥有独立入口与样式文件；`src/index.ts` 继续作为聚合入口。

## 验证方式

- 执行 `pnpm --filter @white55/ui typecheck` 检查组件与公共类型。
- 执行 `pnpm --filter @white55/ui build:vite` 检查 Vite 库构建及独立入口产物。
- 不执行 Webpack，不启动 Storybook；页面展示由用户手动验证。
