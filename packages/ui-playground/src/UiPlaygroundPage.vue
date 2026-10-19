<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, type Component } from 'vue'
import { uiComponentSlugs, type UiComponentSlug } from '@white55/ui/catalog'
import '@white55/ui/tokens.css'
import '@white55/ui/theme.css'
import './playground.css'

const props = defineProps<{ component?: string }>()

// 每个示例独立拆包；组件与对应样式只随当前示例加载。
const demos: Record<UiComponentSlug, Component> = {
  button: defineAsyncComponent(() => import('./demos/ButtonDemo.vue')),
  input: defineAsyncComponent(() => import('./demos/InputDemo.vue')),
  dialog: defineAsyncComponent(() => import('./demos/DialogDemo.vue')),
  loading: defineAsyncComponent(() => import('./demos/LoadingDemo.vue')),
  'empty-state': defineAsyncComponent(() => import('./demos/EmptyStateDemo.vue')),
  select: defineAsyncComponent(() => import('./demos/SelectDemo.vue')),
  form: defineAsyncComponent(() => import('./demos/FormDemo.vue')),
  table: defineAsyncComponent(() => import('./demos/TableDemo.vue')),
}

const selected = computed(() =>
  uiComponentSlugs.includes(props.component as UiComponentSlug)
    ? (props.component as UiComponentSlug)
    : undefined,
)
const activeDemo = computed(() => (selected.value ? demos[selected.value] : undefined))
const theme = ref<'dark' | 'light'>('dark')
let previousTheme: string | undefined

// Element Plus 的弹层可能挂到 body；同步根节点主题，离开页面时恢复宿主原状态。
onMounted(() => {
  previousTheme = document.documentElement.dataset.uiTheme
  document.documentElement.dataset.uiTheme = theme.value
})
onUnmounted(() => {
  if (previousTheme === undefined) delete document.documentElement.dataset.uiTheme
  else document.documentElement.dataset.uiTheme = previousTheme
})

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.uiTheme = theme.value
}
</script>

<template>
  <div class="ui-playground-page ui-theme" :data-ui-theme="theme">
    <header>
      <p class="ui-playground-page__eyebrow">@white55/ui</p>
      <h1>UI Playground</h1>
      <p>逐个查看组件状态和交互；演示直接消费组件库公开入口。</p>
      <button type="button" class="ui-playground-page__theme-toggle" @click="toggleTheme">
        切换到{{ theme === 'dark' ? '亮色' : '暗色' }}主题
      </button>
    </header>
    <div class="ui-playground-page__layout">
      <nav class="ui-playground-page__nav" aria-label="UI 组件演示目录">
        <a v-for="slug in uiComponentSlugs" :key="slug" :href="`#/playground/ui/playground/${slug}`">
          {{ slug }}
        </a>
      </nav>
      <main class="ui-playground-page__main">
        <component :is="activeDemo" v-if="activeDemo" />
        <p v-else>从左侧选择组件开始体验。</p>
      </main>
    </div>
  </div>
</template>
