<script setup lang="ts">
import { computed } from 'vue'
import { uiDocs } from './catalog'
import './docs.css'

const props = defineProps<{ component?: string }>()
const selected = computed(() => uiDocs.find((entry) => entry.slug === props.component))
const importCode = computed(() => {
  if (!selected.value) return ''
  const { slug, imports } = selected.value
  return `import '@white55/ui/tokens.css'\nimport '@white55/ui/theme.css'\nimport { ${imports} } from '@white55/ui/${slug}'\nimport '@white55/ui/${slug}.css'`
})
</script>

<template>
  <div class="ui-docs-page">
    <header>
      <p class="ui-docs-page__eyebrow">@white55/ui</p>
      <h1>UI 组件文档</h1>
      <p>基于 Element Plus 的薄封装。统一主题与常用交互，复杂能力沿用原组件协议。</p>
      <p>宿主提供 Element Plus 基础样式；UI 的 Token、主题和组件样式按需加载。</p>
    </header>
    <div class="ui-docs-page__layout">
      <nav class="ui-docs-page__nav" aria-label="UI 组件目录">
        <a v-for="entry in uiDocs" :key="entry.slug" :href="`#/playground/ui/docs/${entry.slug}`">
          {{ entry.title }}
        </a>
      </nav>
      <main class="ui-docs-page__main">
        <template v-if="selected">
          <h2>{{ selected.title }}</h2>
          <p>{{ selected.summary }}</p>
          <h3>使用建议</h3>
          <p>{{ selected.guidance }}</p>
          <h3>公开 API</h3>
          <ul><li v-for="item in selected.api" :key="item">{{ item }}</li></ul>
          <h3>主题变量</h3>
          <ul><li v-for="token in selected.themeTokens" :key="token"><code>{{ token }}</code></li></ul>
          <h3>无障碍</h3>
          <p>{{ selected.accessibility }}</p>
          <h3>按需引入</h3>
          <pre><code>{{ importCode }}</code></pre>
          <h3>使用示例</h3>
          <pre><code>{{ selected.usage }}</code></pre>
          <a :href="`#/playground/ui/playground/${selected.slug}`">打开交互演示 →</a>
        </template>
        <template v-else>
          <h2>选择组件</h2>
          <p>从左侧选择组件，查看用途、公共 API 和示例。</p>
        </template>
      </main>
    </div>
  </div>
</template>
