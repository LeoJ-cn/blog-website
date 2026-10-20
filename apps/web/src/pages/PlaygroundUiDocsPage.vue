<script setup lang="ts">
import './playground-ui-docs.css'

// Web 与 Storybook 分别运行；生产环境从站点基地址解析静态子目录。
const storybookUrl = import.meta.env.DEV
  ? new URL(import.meta.env.VITE_STORYBOOK_URL || 'http://localhost:6006/').href
  : new URL('storybook/', new URL(import.meta.env.BASE_URL, window.location.href)).href
</script>

<template>
  <div class="ui-docs-page">
    <header>
      <p class="ui-docs-page__eyebrow">@white55/ui</p>
      <h1>UI 组件文档</h1>
      <p>基于 Element Plus 的薄封装。统一主题与常用交互，复杂能力沿用原组件协议。</p>
      <p>宿主提供 Element Plus 基础样式；UI 的 Token、主题和组件样式按需加载。</p>
      <a :href="storybookUrl" target="_blank" rel="noopener noreferrer">在 Storybook 中打开 ↗</a>
    </header>
  </div>
</template>
