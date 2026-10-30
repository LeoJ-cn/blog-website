# @white55/ui

基于 Vue 3 与 Element Plus 的 UI 组件库，提供 ESM、TypeScript 声明和独立 CSS 入口。许可证为 MIT。

## 安装与使用

在消费项目执行（本仓库不自动安装）：

```sh
pnpm add --save-exact @white55/ui@0.1.0 vue@3.5.13 element-plus@2.9.5 @element-plus/icons-vue@2.3.2
```

当前 peerDependencies 使用上述精确版本，不声明未经验证的兼容范围。

```vue
<script setup lang="ts">
import { UiButton } from '@white55/ui/button'
import 'element-plus/dist/index.css'
import '@white55/ui/tokens.css'
import '@white55/ui/theme.css'
import '@white55/ui/ui.css'
import '@white55/ui/button.css'
</script>

<template>
  <UiButton type="primary">确认</UiButton>
</template>
```

也可从 `@white55/ui` 导入组件和公开类型；组件样式仍需显式导入。主题与基础样式应在组件样式之前引入。其他组件沿用 `@white55/ui/input`、`@white55/ui/input.css` 等子路径，图标从 `@white55/ui/icons` 导入。

## 仓库内开发

根目录 `pnpm dev:vite` 同时启动 Web 与 Storybook（页面启动须遵守仓库授权规则）。Vite、Webpack 配置与 TypeScript 使用内部 `white-source` 条件解析源码；外部项目不要启用此条件，发布包只包含 dist，不包含源码。两套管线共享源码，Webpack 默认关闭。

## 构建与发布

```sh
pnpm --filter @white55/ui typecheck
pnpm build:ui:vite
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
