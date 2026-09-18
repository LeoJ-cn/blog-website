<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const categories = {
  performance: { title: 'Performance', description: '记录页面加载、运行时性能和资源表现。' },
  engineering: { title: 'Engineering', description: '展示工程化工具链、构建流程和质量保障。' },
  architecture: { title: 'Architecture', description: '探索模块边界、状态组织和可扩展架构。' },
  network: { title: 'Network', description: '展示 HTTP、WebSocket 和网络请求行为。' },
  browser: { title: 'Browser', description: '记录浏览器 API、渲染机制和运行时能力。' },
} as const
const category = computed(() => categories[route.params.category as keyof typeof categories] ?? categories.performance)
</script>

<template>
  <article class="playground-content">
    <p class="eyebrow">TECHNICAL PLAYGROUND</p>
    <h2>{{ category.title }}</h2>
    <p class="playground-description">{{ category.description }}</p>
    <div class="playground-placeholder">
      <span class="status-dot" aria-hidden="true"></span>
      <div>
        <h3>功能待开发</h3>
        <p>这里将展示该技术点的原理、交互实验、源码入口和性能指标。</p>
      </div>
    </div>
  </article>
</template>
