# @white55/ui

基于 Vue 3 与 Element Plus 的 UI 组件库，提供 ESM、TypeScript 声明和独立 CSS 入口。许可证为 MIT。

## 安装与使用

在消费项目执行（本仓库不自动安装）：

```sh
pnpm add --save-exact @white55/ui@0.1.0
```

宿主项目需要 Vue 3.5.13。Element Plus 与图标包由 UI 包管理，无需使用方直接安装或导入。

```vue
<script setup lang="ts">
import { UiButton } from '@white55/ui/button'
</script>

<template>
  <UiButton type="primary">确认</UiButton>
</template>
```

默认组件子路径自动加载对应的内部基础样式、tokens、theme 和组件覆盖，无需手动导入 CSS。其他组件沿用 `@white55/ui/input` 等子路径，图标从 `@white55/ui/icons` 导入。

从 `@white55/ui` 根入口导入会加载全量样式；需要按需样式时，请使用组件子路径。`@white55/ui/style.css` 保留为手动全量样式入口。

## SSR 入口

```ts
// 无自动 CSS 导入；导出组件和类型与普通入口一致。
import { UiButton } from '@white55/ui/ssr/button'
// 也可以使用根 SSR 入口：
// import { UiButton } from '@white55/ui/ssr'
```

两套入口共用组件实现。SSR 应用应在框架允许的全局样式位置或客户端入口加载 `@white55/ui/style.css`，确保首屏包含样式。`ssr` 入口保证发布 JS 的依赖链没有 CSS 导入，不代表已完成各 SSR 框架的渲染和 hydration 验证。

仓库内直接消费 Vue SFC 源码时，SFC 内的 scoped 样式仍由 SSR 框架编译处理；发布后的 `/ssr` JS 入口不包含 CSS 导入。

## 仓库内开发

根目录 `pnpm dev:vite` 同时启动 Web 与 Storybook（页面启动须遵守仓库授权规则）。Vite、Webpack 配置与 TypeScript 使用内部 `source-code` 条件解析源码；外部项目不要启用此条件，发布包只包含 dist，不包含源码。两套管线共享源码，Webpack 默认关闭。

## 构建与发布

```sh
pnpm --filter @white55/ui typecheck
pnpm --filter @white55/ui build:vite
cd packages/ui
npm pack --dry-run --ignore-scripts
pnpm pack --pack-destination /tmp
```

独立构建生成 `dist/*.js`、`dist/types/**/*.d.ts` 和 `dist/styles/*.css`。`prepack` 会先检查类型并重新构建，避免打包过期产物。检查压缩包包含所有导出目标、README 和 LICENSE；再由使用方在独立项目安装压缩包，确认类型提示、组件和样式表现。

确认 npm scope 权限、版本尚未发布，并完成消费验证后，手动执行：

```sh
pnpm publish --access public --registry https://registry.npmjs.org/
```

发布版本与 Web、Storybook 中的 `workspace:0.1.0` 及锁文件需同步维护。根项目版本独立，不随 UI 包版本调整。包仅提供 ESM，不提供 CommonJS。
