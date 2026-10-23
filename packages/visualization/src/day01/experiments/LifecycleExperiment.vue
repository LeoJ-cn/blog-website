<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { EChartsCoreOption } from '../echarts'
import { echarts, type ECharts } from '../echarts'
import { lifecycleData } from '../mock-data'
import { useExperimentLog } from '../use-experiment-log'
import ExperimentFrame from '../components/ExperimentFrame.vue'
import JsonPanel from '../components/JsonPanel.vue'

const chartElement = ref<HTMLDivElement | null>(null)
// ECharts 是带有内部状态的第三方实例，必须避免 Vue 深度代理其对象图。
const chart = shallowRef<ECharts | null>(null)
const disposed = ref(false)
const chartSize = ref({ width: 0, height: 0 })
const seriesCount = ref(0)
const optionSnapshot = shallowRef<EChartsCoreOption>({})
const { logs, addLog } = useExperimentLog()

const baseOption: EChartsCoreOption = {
  title: { text: '巡检处理趋势', left: 16, textStyle: { color: '#dce7ff', fontSize: 14 } },
  tooltip: { trigger: 'axis' },
  grid: { left: 44, right: 24, top: 58, bottom: 36 },
  xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
  yAxis: { type: 'value' },
  series: [
    { id: 'inspection-line', name: '处理量', type: 'line', smooth: true, data: lifecycleData },
  ],
}

const status = computed(() => ({
  instanceExists: Boolean(chart.value),
  disposed: disposed.value,
  width: chartSize.value.width,
  height: chartSize.value.height,
  seriesCount: seriesCount.value,
}))

function syncInstanceState() {
  if (!chart.value || chart.value.isDisposed()) return
  const option = chart.value.getOption() as EChartsCoreOption
  chartSize.value = { width: chart.value.getWidth(), height: chart.value.getHeight() }
  seriesCount.value = Array.isArray(option.series) ? option.series.length : 0
  optionSnapshot.value = option
}

function initChart() {
  if (!chartElement.value || chart.value) return
  chart.value = echarts.init(chartElement.value, undefined, { renderer: 'canvas' })
  disposed.value = false
  chart.value.setOption(baseOption)
  syncInstanceState()
  addLog('init → setOption：Canvas 实例已创建')
}

function updateChart() {
  if (!chart.value || chart.value.isDisposed()) {
    addLog('已阻止更新：当前没有有效实例')
    return
  }
  const nextData = lifecycleData.map((value) => value + Math.round(Math.random() * 20 - 5))
  chart.value.setOption({ series: [{ id: 'inspection-line', data: nextData }] })
  syncInstanceState()
  addLog('setOption：以稳定 id 合并更新数据')
}

function resizeChart() {
  if (!chart.value || chart.value.isDisposed()) {
    addLog('已阻止 resize：当前没有有效实例')
    return
  }
  chart.value.resize()
  syncInstanceState()
  addLog(`resize：${chartSize.value.width} × ${chartSize.value.height}`)
}

function disposeChart() {
  if (!chart.value) return
  chart.value.dispose()
  chart.value = null
  disposed.value = true
  chartSize.value = { width: 0, height: 0 }
  seriesCount.value = 0
  addLog('dispose：实例已销毁并清空引用')
}

async function reinitializeChart() {
  disposeChart()
  await nextTick()
  initChart()
  addLog('重新初始化完成')
}

onMounted(initChart)
onBeforeUnmount(disposeChart)
</script>

<template>
  <ExperimentFrame
    title="实验 01 · 实例生命周期"
    description="观察实例从 init 到 dispose 的完整状态"
    :logs="logs"
    :api-notes="[
      'init 绑定一个已有尺寸的 DOM。',
      'dispose 后必须丢弃旧引用。',
      'resize 用于容器尺寸变化，不会自动监听布局。',
    ]"
  >
    <template #controls>
      <h4>生命周期操作</h4>
      <button type="button" :disabled="Boolean(chart)" @click="initChart">init</button>
      <button type="button" :disabled="!chart" @click="updateChart">setOption</button>
      <button type="button" :disabled="!chart" @click="resizeChart">resize</button>
      <button type="button" :disabled="!chart" @click="disposeChart">dispose</button>
      <button type="button" @click="reinitializeChart">重新初始化</button>
    </template>
    <div ref="chartElement" class="ec-chart" />
    <template #inspector>
      <JsonPanel title="实例状态" :value="status" />
      <JsonPanel title="getOption()" :value="optionSnapshot" />
    </template>
  </ExperimentFrame>
</template>
