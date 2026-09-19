<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CodeBlock from '../components/CodeBlock.vue'
import DemoControls from '../components/DemoControls.vue'
import MetricsPanel from '../components/MetricsPanel.vue'
import { categoryMetadata, getProjectsByCategory } from '../data/projects'
import type { DemoControlDefinition, MetricSnapshot, ProjectCategory } from '../types/project'

const route = useRoute()
const tabs = [
  { id: 'demo', label: 'Demo' },
  { id: 'principle', label: '实现原理' },
  { id: 'source', label: '源码' },
  { id: 'metrics', label: '性能指标' },
  { id: 'compatibility', label: '兼容性' },
] as const
const schedulerControls: DemoControlDefinition[] = [
  { key: 'taskCount', label: '任务数量', type: 'number', min: 1000, max: 1000000, step: 1000 },
  { key: 'chunkDuration', label: '单片时长', type: 'range', min: 1, max: 20, step: 1 },
  {
    key: 'priority',
    label: '调度策略',
    type: 'select',
    options: [
      { label: '普通优先级', value: 'normal' },
      { label: '高优先级', value: 'high' },
      { label: '低优先级', value: 'low' },
    ],
  },
]

const activeTab = ref<(typeof tabs)[number]['id']>('demo')
const activeSourceIndex = ref(0)
const settings = reactive<Record<string, string | number | boolean>>({
  taskCount: 100000,
  chunkDuration: 5,
  priority: 'normal',
})
const processed = ref(0)
const elapsed = ref(0)
const isRunning = ref(false)
let experimentTimer: number | undefined
let startedAt = 0

const categorySlug = computed<ProjectCategory>(() => {
  const value = route.params.category as ProjectCategory
  return value in categoryMetadata ? value : 'performance'
})
const category = computed(() => categoryMetadata[categorySlug.value])
const project = computed(() => getProjectsByCategory(categorySlug.value)[0])
const activeSource = computed(() => project.value?.sources[activeSourceIndex.value])
const progress = computed(() =>
  Math.min(100, Math.round((processed.value / Number(settings.taskCount)) * 100)),
)
const metrics = computed<MetricSnapshot[]>(() => [
  {
    label: '处理进度',
    value: progress.value,
    unit: '%',
    tone: progress.value === 100 ? 'positive' : 'neutral',
  },
  { label: '已处理任务', value: processed.value.toLocaleString(), tone: 'neutral' },
  {
    label: '运行耗时',
    value: elapsed.value.toFixed(1),
    unit: 'ms',
    tone: elapsed.value > 1000 ? 'warning' : 'neutral',
  },
  {
    label: '处理速度',
    value: elapsed.value
      ? Math.round(processed.value / (elapsed.value / 1000)).toLocaleString()
      : '0',
    unit: '/s',
    tone: 'positive',
  },
])

function stopExperiment() {
  if (experimentTimer !== undefined) window.clearTimeout(experimentTimer)
  experimentTimer = undefined
  isRunning.value = false
}

function runExperiment() {
  stopExperiment()
  processed.value = 0
  elapsed.value = 0
  isRunning.value = true
  startedAt = performance.now()
  const total = Number(settings.taskCount)
  const runChunk = () => {
    const chunkStartedAt = performance.now()
    const duration = Number(settings.chunkDuration)
    while (processed.value < total && performance.now() - chunkStartedAt < duration) {
      processed.value += Math.min(250, total - processed.value)
    }
    elapsed.value = performance.now() - startedAt
    const delayByPriority = { high: 0, normal: 4, low: 12 }
    const delay = delayByPriority[String(settings.priority) as keyof typeof delayByPriority] ?? 4
    if (processed.value < total) experimentTimer = window.setTimeout(runChunk, delay)
    else stopExperiment()
  }
  runChunk()
}

function updateSettings(nextSettings: Record<string, string | number | boolean>) {
  Object.assign(settings, nextSettings)
}

watch(categorySlug, () => {
  activeTab.value = 'demo'
  activeSourceIndex.value = 0
  stopExperiment()
  processed.value = 0
  elapsed.value = 0
})
onBeforeUnmount(stopExperiment)
</script>

<template>
  <article class="playground-content">
    <p class="eyebrow">{{ category.title.toUpperCase() }} · {{ project?.status ?? 'planned' }}</p>
    <h2>{{ project?.title ?? category.title }}</h2>
    <p class="playground-description">{{ project?.description ?? category.description }}</p>
    <div v-if="project" class="project-meta">
      <span>{{ project.difficulty }}</span
      ><span v-for="tag in project.tags" :key="tag">{{ tag }}</span
      ><span>更新于 {{ project.updatedAt }}</span>
    </div>

    <div class="demo-stage">
      <div class="demo-stage__header">
        <div><span class="status-dot" aria-hidden="true"></span><span>INTERACTIVE DEMO</span></div>
        <span>{{
          project?.status === 'active' ? (isRunning ? '运行中' : '可以运行') : '计划中'
        }}</span>
      </div>
      <div v-if="project?.slug === 'scheduler'" class="demo-workbench">
        <aside class="demo-workbench__controls">
          <h3>实验参数</h3>
          <DemoControls
            :model-value="settings"
            :controls="schedulerControls"
            @update:model-value="updateSettings"
          />
          <button
            class="experiment-action"
            type="button"
            :disabled="isRunning"
            @click="runExperiment"
          >
            {{ isRunning ? '运行中…' : '运行实验' }}
          </button>
        </aside>
        <div class="demo-workbench__result">
          <div class="experiment-summary">
            <span>实时进度</span><strong>{{ progress }}%</strong>
          </div>
          <div class="experiment-progress"><span :style="{ width: `${progress}%` }" /></div>
          <MetricsPanel :metrics="metrics" />
        </div>
      </div>
      <div v-else class="demo-stage__body">
        <div>
          <h3>实验正在准备中</h3>
          <p>项目元数据已经建立，后续可直接接入对应的参数、结果和指标。</p>
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
      <div v-if="project?.sources.length" class="source-viewer">
        <nav class="source-files" aria-label="源码文件">
          <button
            v-for="(source, index) in project.sources"
            :key="source.path"
            type="button"
            :class="{ 'is-active': activeSourceIndex === index }"
            @click="activeSourceIndex = index"
          >
            <span>{{ source.label }}</span
            ><small>{{ source.path }}</small>
          </button>
        </nav>
        <CodeBlock
          v-if="activeSource"
          :code="activeSource.content"
          :language="activeSource.language"
          :filename="activeSource.label"
        />
      </div>
      <div v-else class="empty-source">该项目的真实源码映射将在实现 Demo 时加入。</div>
    </section>
    <section v-else-if="activeTab === 'metrics'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">PERFORMANCE METRICS</p>
      <h3>最近一次实验结果</h3>
      <MetricsPanel :metrics="metrics" />
    </section>
    <section v-else-if="activeTab === 'principle'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">实现原理</p>
      <h3>把实现过程拆成可以验证的步骤。</h3>
      <p>任务被拆分成短时间片，每个时间片结束后主动归还主线程，再通过消息队列继续执行。</p>
    </section>
    <section v-else-if="activeTab === 'compatibility'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">兼容性</p>
      <h3>明确运行环境与能力边界。</h3>
      <p>实验依赖 MessageChannel 和 Performance API；不支持时需要回退到定时器调度。</p>
    </section>
    <section v-else class="tab-panel tab-panel--demo" role="tabpanel">
      <p class="eyebrow">DEMO OVERVIEW</p>
      <h3>修改参数，然后运行实验。</h3>
      <p>上方 Demo 始终保留，下方用于说明输入参数、观察方式和实验结论。</p>
    </section>
  </article>
</template>
