<script setup lang="ts">
import { computed, ref } from 'vue'
import CodeBlock from '../components/CodeBlock.vue'
import SchedulerDemo from '../components/task-scheduler/Demo.vue'
import { projects } from '../data/projects'

const tabs = [
  { id: 'demo', label: 'Demo' },
  { id: 'principle', label: '实现原理' },
  { id: 'source', label: '源码' },
  { id: 'compatibility', label: '兼容性' },
] as const

const project = projects.find((item) => item.slug === 'render-scheduler')!
const activeTab = ref<(typeof tabs)[number]['id']>('demo')
const activeSourceIndex = ref(0)
const activeSource = computed(() => project.sources[activeSourceIndex.value])
</script>

<template>
  <article class="playground-content scheduler-page" data-page="render-scheduler">
    <p class="eyebrow">BROWSER</p>
    <h2>{{ project.title }}</h2>
    <p class="playground-description">{{ project.description }}</p>
    <div class="project-meta">
      <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
      <span>更新于 {{ project.updatedAt }}</span>
    </div>

    <div class="demo-stage scheduler-stage">
      <div class="demo-stage__header">
        <div>
          <span class="status-dot" aria-hidden="true"></span>
          <span>INTERACTIVE SCHEDULER</span>
        </div>
        <span>200ms 调度间隔</span>
      </div>
      <SchedulerDemo />
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
      <div class="source-viewer">
        <nav class="source-files" aria-label="源码文件">
          <button
            v-for="(source, index) in project.sources"
            :key="source.path"
            type="button"
            :class="{ 'is-active': activeSourceIndex === index }"
            @click="activeSourceIndex = index"
          >
            <span>{{ source.label }}</span>
            <small>{{ source.path }}</small>
          </button>
        </nav>
        <CodeBlock
          :code="activeSource.content"
          :language="activeSource.language"
          :filename="activeSource.label"
        />
      </div>
    </section>

    <section v-else-if="activeTab === 'principle'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">HOW IT WORKS</p>
      <h3>组件先注册，调度器再按优先级释放渲染时机。</h3>
      <p>
        useDeferRegister 在组件挂载时注册任务，并返回 isReady
        响应式状态。调度器按数字从小到大排序，逐项把状态切换为 true，使模块 A 先于模块 B 进入 DOM。
      </p>
    </section>

    <section v-else-if="activeTab === 'compatibility'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">COMPATIBILITY</p>
      <h3>依赖 Vue 生命周期和浏览器定时器。</h3>
      <p>
        Demo 使用 Promise 微任务启动队列，并通过 setTimeout 控制任务间隔。crypto.randomUUID
        用于任务标识，接入旧浏览器时需要提供兼容实现。
      </p>
    </section>

    <section v-else class="tab-panel tab-panel--demo" role="tabpanel">
      <p class="eyebrow">DEMO OVERVIEW</p>
      <h3>观察两个业务模块依次进入页面。</h3>
      <p>
        协作式任务编排器同时注册模块 A 和模块 B。优先级 8 的模块 A 首先显示，优先级 12 的模块 B
        在下一轮调度中显示；离开页面时 composable 会移除尚未执行的任务。
      </p>
    </section>
  </article>
</template>

<style scoped lang="scss">
.scheduler-stage {
  overflow: hidden;
}

@media (max-width: 720px) {
  .scheduler-stage :deep(.main-container) {
    padding: 12px;
  }
}
</style>
