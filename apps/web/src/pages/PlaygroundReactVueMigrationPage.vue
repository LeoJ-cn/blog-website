<script setup lang="ts">
import { computed, ref } from 'vue'
import { ReactVueMigrationDemo } from '@blog/react-vue-migration-demo'
import CodeBlock from '../components/CodeBlock.vue'
import { projects } from '../data/projects'

const tabs = [
  { id: 'demo', label: 'Demo' },
  { id: 'principle', label: '实现原理' },
  { id: 'source', label: '源码' },
  { id: 'compatibility', label: '兼容性' },
] as const

const project = projects.find((item) => item.slug === 'react-vue-migration')!
const activeTab = ref<(typeof tabs)[number]['id']>('demo')
const activeSourceIndex = ref(0)
const activeSource = computed(() => project.sources[activeSourceIndex.value])
</script>

<template>
  <article class="playground-content" data-page="react-vue-migration">
    <p class="eyebrow">ENGINEERING / FRAMEWORK MIGRATION</p>
    <h2>{{ project.title }}</h2>
    <p class="playground-description">{{ project.description }}</p>
    <div class="project-meta">
      <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
      <span>更新于 {{ project.updatedAt }}</span>
    </div>

    <div class="demo-stage react-vue-migration-stage">
      <div class="demo-stage__header">
        <div>
          <span class="status-dot" aria-hidden="true"></span>
          <span>LIVE MIGRATION DEMO</span>
        </div>
        <span>Vue Host → React Shell → Vue Module</span>
      </div>
      <div class="react-vue-migration-stage__body">
        <ReactVueMigrationDemo />
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
      <h3>以生命周期桥接替代一次性重写。</h3>
      <p>
        Vue Blog 只负责创建 React Root；React Shell 使用 MemoryRouter 保持旧应用路由语义，再由
        ReactLoadVueOrder 把容器、Props 和 Events 交给 Vue bootstrap。订单参数变化只调用
        update，离开或回滚时调用 unmount，因此 Vue 组件内部状态与清理逻辑仍由 Vue 自己管理。
      </p>
    </section>

    <section v-else-if="activeTab === 'compatibility'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">COMPATIBILITY</p>
      <h3>运行时隔离，构建时共享宿主能力。</h3>
      <p>
        Demo 为纯客户端方案，不依赖 SSR 或 Hydration。React Router 使用 MemoryRouter，不会改写 Blog
        的浏览器 History；Vue 由宿主去重并保持单一 Runtime。代码使用 AbortController、queueMicrotask
        等现代浏览器能力，若需要支持更旧环境，应随宿主兼容目标补充验证与 Polyfill。
      </p>
    </section>

    <section v-else class="tab-panel tab-panel--demo" role="tabpanel">
      <p class="eyebrow">DEMO OVERVIEW</p>
      <h3>验证迁移组件与旧 React 实现可以并存和回滚。</h3>
      <p>
        切换 Implementation 对比 React Legacy 与 Vue Migrated；切换订单观察 Props update 是否保留
        Vue 内部计数；再通过组件事件、双向 EventBus 和路由按钮检查跨框架通信。右侧日志会记录
        mount、update、unmount 与事件转发链路。
      </p>
    </section>
  </article>
</template>

<style scoped>
.react-vue-migration-stage {
  padding: 0;
}

.react-vue-migration-stage__body {
  padding: clamp(1rem, 2vw, 1.5rem);
}
</style>
