<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import CodeBlock from '../components/CodeBlock.vue'
import {
  detectPerformanceTier,
  renderPerformanceReport,
  type PerformanceProbeResult,
} from '../components/test-ua/test-ua'
import { projects } from '../data/projects'

const project = projects.find((item) => item.slug === 'device-performance-probe')!
const activeTab = ref<'demo' | 'principle' | 'source' | 'compatibility'>('demo')
const result = ref<PerformanceProbeResult | null>(null)
const isDetecting = ref(false)
const errorMessage = ref('')
const statusLabel = computed(() => {
  if (isDetecting.value) return '检测中'
  if (errorMessage.value) return '检测失败'
  return result.value ? '检测完成' : '等待检测'
})

async function runProbe() {
  if (isDetecting.value) return

  isDetecting.value = true
  errorMessage.value = ''
  result.value = null
  await nextTick()

  try {
    const probeResult = await detectPerformanceTier()
    result.value = probeResult
    await nextTick()
    renderPerformanceReport(probeResult)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '设备性能检测失败'
  } finally {
    isDetecting.value = false
  }
}

onMounted(runProbe)
</script>

<template>
  <article class="playground-content device-probe" data-page="device-performance-probe">
    <p class="eyebrow">BROWSER</p>
    <h2>{{ project.title }}</h2>
    <p class="playground-description">{{ project.description }}</p>
    <div class="project-meta">
      <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
      <span>更新于 {{ project.updatedAt }}</span>
    </div>

    <div class="demo-stage probe-stage">
      <div class="demo-stage__header">
        <div>
          <span class="status-dot" aria-hidden="true"></span>
          <span>DEVICE PROBE · {{ statusLabel }}</span>
        </div>
        <button class="probe-action" type="button" :disabled="isDetecting" @click="runProbe">
          {{ isDetecting ? '正在检测…' : '重新检测' }}
        </button>
      </div>

      <div class="probe-stage__body" :aria-busy="isDetecting">
        <div v-if="isDetecting" class="probe-placeholder">
          <span class="probe-spinner" aria-hidden="true"></span>
          <strong>正在采集设备指标并运行动态基准测试</strong>
          <small>基准测试设置了 150ms 时间预算，超时会自动熔断。</small>
        </div>
        <div v-else-if="errorMessage" class="probe-error" role="alert">
          <strong>探针运行失败</strong>
          <span>{{ errorMessage }}</span>
        </div>
        <div v-show="!isDetecting && !errorMessage" id="test-ua" class="probe-report"></div>
      </div>
    </div>

    <nav class="content-tabs" aria-label="技术内容" role="tablist">
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'demo' }"
        @click="activeTab = 'demo'"
      >
        Demo
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'principle' }"
        @click="activeTab = 'principle'"
      >
        实现原理
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'source' }"
        @click="activeTab = 'source'"
      >
        源码
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'compatibility' }"
        @click="activeTab = 'compatibility'"
      >
        兼容性
      </button>
    </nav>

    <section v-if="activeTab === 'source'" class="tab-panel tab-panel--source" role="tabpanel">
      <CodeBlock
        :code="project.sources[0].content"
        :language="project.sources[0].language"
        :filename="project.sources[0].label"
      />
    </section>
    <section v-else-if="activeTab === 'principle'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">HOW IT WORKS</p>
      <h3>静态能力决定基线，动态基准补充真实执行表现。</h3>
      <p>
        探针先采集核心数、内存和像素比，再运行带时间预算的计算基准。静态得分过低或动态测试超时会触发熔断，避免检测本身长时间阻塞主线程。
      </p>
    </section>
    <section v-else-if="activeTab === 'compatibility'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">COMPATIBILITY</p>
      <h3>能力检测优先，缺失字段按未知或不支持降级。</h3>
      <p>
        User-Agent Client Hints、电池、网络和设备内存 API
        并非所有浏览器都开放；这些字段不会阻止核心性能分级完成。
      </p>
    </section>
    <section v-else class="tab-panel tab-panel--demo" role="tabpanel">
      <p class="eyebrow">DEMO OVERVIEW</p>
      <h3>每次检测都是当前设备的一次即时快照。</h3>
      <p>
        评分用于演示前端按设备能力调整首屏渲染规模，不应替代真实用户监控数据，也不适合作为永久设备身份标识。
      </p>
    </section>
  </article>
</template>

<style scoped lang="scss">
.probe-stage__body {
  min-height: 320px;
  padding: 16px;
}

.probe-action {
  background: #173e34;
  border: 1px solid #2b8b6d;
  border-radius: 6px;
  color: #8ff0ca;
  cursor: pointer;
  font: inherit;
  padding: 7px 14px;
}

.probe-action:disabled {
  cursor: wait;
  opacity: 0.55;
}

.probe-placeholder,
.probe-error {
  align-items: center;
  color: #9aa7c0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
  min-height: 288px;
  text-align: center;
}

.probe-placeholder small {
  color: #667794;
}

.probe-spinner {
  animation: spin 0.8s linear infinite;
  border: 2px solid #263453;
  border-radius: 50%;
  border-top-color: #62e6b5;
  height: 28px;
  width: 28px;
}

.probe-error strong {
  color: #ff7b72;
}

.probe-report {
  margin: 0 auto !important;
  max-width: none !important;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
