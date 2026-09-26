<script setup lang="ts">
import { computed, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AdvancedImageLoaderDemo from '../components/advanced-image-loader/AdvancedImageLoaderDemo.vue'
import NormalImageLoaderDemo from '../components/advanced-image-loader/NormalImageLoaderDemo.vue'
import MovingBoxPerformancePanel from '../components/advanced-image-loader/MovingBoxPerformancePanel.vue'
import { movingBoxManager } from '../components/advanced-image-loader/moving-box-manager'
import CodeBlock from '../components/CodeBlock.vue'
import { projects } from '../data/projects'

const tabs = [
  { id: 'demo', label: 'Demo' },
  { id: 'principle', label: '实现原理' },
  { id: 'source', label: '源码' },
  { id: 'metrics', label: '性能指标' },
  { id: 'compatibility', label: '兼容性' },
] as const

const project = projects.find((item) => item.slug === 'advanced-image-loader')!
const renderMode = ref<'normal' | 'optimized'>('optimized')
const activeTab = ref<(typeof tabs)[number]['id']>('demo')
const activeSourceIndex = ref(0)
const activeSource = computed(() => project.sources[activeSourceIndex.value])

onBeforeRouteLeave((to) => {
  if (to.path === '/playground/performance') {
    movingBoxManager.clear()
  }
})
</script>

<template>
  <article class="playground-content" data-page="advanced-image-loader">
    <MovingBoxPerformancePanel />
    <p class="eyebrow">BROWSER</p>
    <h2>{{ project.title }}</h2>
    <p class="playground-description">{{ project.description }}</p>
    <div class="project-meta">
      <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
      <span>更新于 {{ project.updatedAt }}</span>
    </div>

    <div class="demo-stage">
      <div class="demo-stage__header">
        <div>
          <span class="status-dot" aria-hidden="true"></span>
          <span>INTERACTIVE DEMO</span>
        </div>
        <div class="demo-stage__actions" data-testid="animation-controls">
          <div class="animation-actions" aria-label="动画控制">
            <button type="button" @click="movingBoxManager.create()">增加动画</button>
            <button type="button" @click="movingBoxManager.clear()">取消所有动画</button>
          </div>
          <span>|</span>
          <div class="loader-mode-switch" aria-label="渲染模式">
            <button
              type="button"
              :class="{ 'is-active': renderMode === 'normal' }"
              @click="renderMode = 'normal'"
            >
              原生Image模式
            </button>
            <button
              type="button"
              :class="{ 'is-active': renderMode === 'optimized' }"
              @click="renderMode = 'optimized'"
            >
              调度优化模式
            </button>
          </div>
        </div>
      </div>
      <AdvancedImageLoaderDemo v-if="renderMode === 'optimized'" />
      <NormalImageLoaderDemo v-else />
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

    <section v-else-if="activeTab === 'metrics'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">PERFORMANCE METRICS</p>
      <h3>并发边界由加载与裁剪两条队列共同控制。</h3>
      <p>
        普通浏览器最多同时处理 40 个加载任务和 40 个裁剪任务；Edge 的 Canvas 裁剪并发会降为
        1。组件当前没有向外暴露完成事件，因此这里只展示设计边界，不伪造运行耗时。
      </p>
    </section>

    <section v-else-if="activeTab === 'principle'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">实现原理</p>
      <h3>按图片类型选择 HTML Image 或 Canvas Crop。</h3>
      <p>
        official 图片通过解码后的 HTMLImageElement 插入节点；其他图片根据归一化 box
        计算裁剪区域，再由加载队列和渲染队列生成 Canvas，并缓存最终结果。
      </p>
    </section>

    <section v-else-if="activeTab === 'compatibility'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">兼容性</p>
      <h3>快速路径与兼容路径同时保留。</h3>
      <p>
        支持 createImageBitmap 时优先使用位图裁剪；不支持或 fetch 失败时回退到
        HTMLImageElement。Canvas 缓存根据环境使用 Blob URL 或 Data URL。
      </p>
    </section>

    <section v-else class="tab-panel tab-panel--demo" role="tabpanel">
      <p class="eyebrow">DEMO OVERVIEW</p>
      <h3>同时观察直出图片、裁剪画布和错误回退。</h3>
      <p>
        基础样例用于对比分支；并发压力一次提交 100 条随机数据，其中包含约 30%
        的错误地址。切换原图模式会重新挂载组件并再次执行 drawImage。
      </p>
    </section>
  </article>
</template>

<style scoped lang="scss">
.demo-stage__actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.animation-actions,
.loader-mode-switch {
  border: 1px solid #263453;
  border-radius: 5px;
  display: flex;
  overflow: hidden;
}

.animation-actions button,
.loader-mode-switch button {
  background: transparent;
  border: 0;
  color: #71809e;
  cursor: pointer;
  font: inherit;
  letter-spacing: 0;
  padding: 6px 10px;
}

.animation-actions button + button,
.loader-mode-switch button + button {
  border-left: 1px solid #263453;
}

.animation-actions button:hover {
  background: #18243e;
  color: #f4f7ff;
}

.loader-mode-switch button.is-active {
  background: #263453;
  color: #f4f7ff;
}
</style>
