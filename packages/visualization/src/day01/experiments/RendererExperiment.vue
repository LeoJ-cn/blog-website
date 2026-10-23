<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { echarts, type ECharts, type EChartsCoreOption } from '../echarts'
import type { RendererKind } from '../types'
import { useExperimentLog } from '../use-experiment-log'
import ExperimentFrame from '../components/ExperimentFrame.vue'
import JsonPanel from '../components/JsonPanel.vue'

const chartElement = ref<HTMLDivElement | null>(null)
const chart = shallowRef<ECharts | null>(null)
const renderer = ref<RendererKind>('canvas')
const initDurationMs = ref(0)
const actualDom = ref('—')
const { logs, addLog } = useExperimentLog()
const option: EChartsCoreOption = {
  tooltip: { trigger: 'axis' },
  grid: { left: 46, right: 24, top: 32, bottom: 36 },
  xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E', 'F'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [82, 61, 93, 74, 105, 88], itemStyle: { color: '#62e6b5' } }],
}

function disposeChart() {
  chart.value?.dispose()
  chart.value = null
}

function switchRenderer(nextRenderer: RendererKind = renderer.value) {
  disposeChart()
  renderer.value = nextRenderer
  if (!chartElement.value) return
  const start = performance.now()
  chart.value = echarts.init(chartElement.value, undefined, { renderer: renderer.value })
  chart.value.setOption(option)
  // 等待 ECharts 完成本次同步初始化后，读取真实渲染根节点与耗时。
  initDurationMs.value = Number((performance.now() - start).toFixed(3))
  actualDom.value =
    chartElement.value.querySelector('canvas, svg')?.tagName.toLowerCase() ?? 'unknown'
  addLog(`${renderer.value} 初始化 ${initDurationMs.value} ms，DOM=<${actualDom.value}>`)
}

onMounted(() => switchRenderer())
onBeforeUnmount(disposeChart)
</script>

<template>
  <ExperimentFrame
    title="实验 05 · Canvas 与 SVG"
    description="同一 Option 销毁后用另一 Renderer 初始化"
    :logs="logs"
    :api-notes="[
      'renderer 必须在 init 时决定，切换前需要 dispose。',
      '耗时来自 performance.now() 的本机单次测量。',
      '该结果仅供实验观察，不代表标准性能基准。',
    ]"
  >
    <template #controls>
      <h4>Renderer</h4>
      <button
        type="button"
        :class="{ 'is-active': renderer === 'canvas' }"
        @click="switchRenderer('canvas')"
      >
        Canvas
      </button>
      <button
        type="button"
        :class="{ 'is-active': renderer === 'svg' }"
        @click="switchRenderer('svg')"
      >
        SVG
      </button>
      <button type="button" @click="switchRenderer(renderer)">销毁并重建</button>
    </template>
    <div ref="chartElement" class="ec-chart" />
    <template #inspector>
      <JsonPanel
        title="实际测量"
        :value="{
          renderer,
          actualDom,
          initDurationMs,
          disclaimer: '仅供实验观察，不代表标准性能基准',
        }"
      />
    </template>
  </ExperimentFrame>
</template>
