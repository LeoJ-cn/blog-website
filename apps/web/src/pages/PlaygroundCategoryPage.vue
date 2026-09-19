<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import CodeBlock from '../components/CodeBlock.vue'

const route = useRoute()
const categories = {
  performance: { title: 'Performance', description: '记录页面加载、运行时性能和资源表现。' },
  engineering: { title: 'Engineering', description: '展示工程化工具链、构建流程和质量保障。' },
  architecture: { title: 'Architecture', description: '探索模块边界、状态组织和可扩展架构。' },
  network: { title: 'Network', description: '展示 HTTP、WebSocket 和网络请求行为。' },
  browser: { title: 'Browser', description: '记录浏览器 API、渲染机制和运行时能力。' },
} as const
const category = computed(() => categories[route.params.category as keyof typeof categories] ?? categories.performance)
const tabs = [
  { id: 'demo', label: 'Demo' },
  { id: 'principle', label: '实现原理' },
  { id: 'source', label: '源码' },
  { id: 'metrics', label: '性能指标' },
  { id: 'compatibility', label: '兼容性' },
] as const
const activeTab = ref<(typeof tabs)[number]['id']>('demo')
const sourceCode = `export function schedule(task: () => void) {
  queueMicrotask(() => {
    task()
  })
}

schedule(() => {
  console.log('ready')
})`
</script>

<template>
  <article class="playground-content">
    <p class="eyebrow">TECHNICAL PLAYGROUND</p>
    <h2>{{ category.title }}</h2>
    <p class="playground-description">{{ category.description }}</p>
    <div class="demo-stage">
      <div class="demo-stage__header">
        <div>
          <span class="status-dot" aria-hidden="true"></span>
          <span>INTERACTIVE DEMO</span>
        </div>
        <span>功能待开发</span>
      </div>
      <div class="demo-stage__body">
        <div>
          <h3>在这里运行和观察实验</h3>
          <p>交互界面、运行结果和实时指标将优先占据这个区域。</p>
        </div>
      </div>
    </div>
    <nav class="content-tabs" aria-label="技术内容" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ 'is-active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        role="tab"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>
    <section v-if="activeTab === 'source'" class="tab-panel tab-panel--source" role="tabpanel">
      <CodeBlock :code="sourceCode" language="typescript" filename="scheduler.ts" />
    </section>
    <section v-else-if="activeTab !== 'demo'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">{{ tabs.find((tab) => tab.id === activeTab)?.label }}</p>
      <h3>{{
          activeTab === 'principle'
            ? '把实现过程拆成可以验证的步骤。'
            : activeTab === 'metrics'
              ? '用数据观察方案的实际表现。'
              : '明确运行环境与能力边界。'
      }}</h3>
      <p>
        {{
          activeTab === 'principle'
            ? '这里将展示核心流程、关键决策和浏览器 API 的协作方式。'
            : activeTab === 'metrics'
              ? '这里将展示加载耗时、运行时开销、资源体积和对比结果。'
              : '这里将记录浏览器版本、降级策略和已知限制。'
        }}
      </p>
    </section>
    <section v-else class="tab-panel tab-panel--demo" role="tabpanel">
      <p class="eyebrow">DEMO OVERVIEW</p>
      <h3>在上方直接运行实验。</h3>
      <p>Demo 区域保持固定，下面可以继续补充操作说明、输入参数和结果解读。</p>
    </section>
  </article>
</template>
