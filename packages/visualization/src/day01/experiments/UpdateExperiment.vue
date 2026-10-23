<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { echarts, type ECharts, type EChartsCoreOption, type SetOptionOpts } from '../echarts'
import type { UpdateMode } from '../types'
import { useExperimentLog } from '../use-experiment-log'
import ExperimentFrame from '../components/ExperimentFrame.vue'
import JsonPanel from '../components/JsonPanel.vue'

interface SeriesState {
  id: string
  name: string
  data: number[]
}

const chartElement = ref<HTMLDivElement | null>(null)
const chart = shallowRef<ECharts | null>(null)
const mode = ref<UpdateMode>('merge')
const lazyUpdate = ref(false)
const series = ref<SeriesState[]>([
  { id: 'pending', name: '待处理', data: [42, 38, 51, 46, 57] },
  { id: 'processing', name: '处理中', data: [28, 35, 31, 40, 36] },
  { id: 'done', name: '已完成', data: [65, 71, 68, 82, 89] },
])
const optionSnapshot = shallowRef<EChartsCoreOption>({})
const { logs, addLog } = useExperimentLog()
const option = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 8, textStyle: { color: '#9fb0cf' } },
  grid: { left: 44, right: 24, top: 48, bottom: 36 },
  xAxis: { type: 'category', data: ['一', '二', '三', '四', '五'] },
  yAxis: { type: 'value' },
  series: series.value.map((item) => ({ ...item, type: 'line', smooth: true })),
}))

function getSetOptionOptions(): SetOptionOpts {
  return {
    notMerge: mode.value === 'notMerge',
    replaceMerge: mode.value === 'replaceMerge' ? ['series'] : undefined,
    lazyUpdate: lazyUpdate.value,
  }
}

function updateChart(action: string) {
  chart.value?.setOption(option.value, getSetOptionOptions())
  optionSnapshot.value = (chart.value?.getOption() ?? {}) as EChartsCoreOption
  addLog(`${action} · ${mode.value}${lazyUpdate.value ? ' · lazyUpdate' : ''}`)
}

function randomizeData() {
  series.value = series.value.map((item) => ({
    ...item,
    data: item.data.map(() => Math.round(20 + Math.random() * 80)),
  }))
  updateChart('更新三个稳定 id Series')
}

function addSeries() {
  if (series.value.some((item) => item.id === 'overdue')) return
  series.value.push({ id: 'overdue', name: '已超时', data: [12, 18, 14, 21, 16] })
  updateChart('新增 overdue Series')
}

function removeSeries() {
  series.value = series.value.filter((item) => item.id !== 'done')
  updateChart('从新 Option 删除 done Series')
}

function resetChart() {
  series.value = [
    { id: 'pending', name: '待处理', data: [42, 38, 51, 46, 57] },
    { id: 'processing', name: '处理中', data: [28, 35, 31, 40, 36] },
    { id: 'done', name: '已完成', data: [65, 71, 68, 82, 89] },
  ]
  chart.value?.clear()
  updateChart('clear 后恢复初始状态')
}

onMounted(() => {
  if (chartElement.value) {
    chart.value = echarts.init(chartElement.value)
    updateChart('初始化')
  }
})
onBeforeUnmount(() => chart.value?.dispose())
</script>

<template>
  <ExperimentFrame
    title="实验 04 · setOption 更新机制"
    description="删除 Series 后切换模式观察 getOption 残留"
    :logs="logs"
    :api-notes="[
      '默认合并会保留未被新 Option 覆盖的旧组件。',
      'notMerge 丢弃全部旧 Option。',
      'replaceMerge: series 只替换 Series 主类型。',
      'lazyUpdate 延后一次渲染，不是连续事件的节流器。',
    ]"
  >
    <template #controls>
      <h4>合并策略</h4>
      <label>
        模式
        <select v-model="mode">
          <option value="merge">默认合并</option>
          <option value="notMerge">notMerge</option>
          <option value="replaceMerge">replaceMerge</option>
        </select>
      </label>
      <label class="ec-check">
        <input v-model="lazyUpdate" type="checkbox" />
        lazyUpdate
      </label>
      <button type="button" @click="randomizeData">更新数据</button>
      <button type="button" @click="addSeries">新增 Series</button>
      <button type="button" @click="removeSeries">删除 done</button>
      <button type="button" @click="resetChart">重置</button>
    </template>
    <div ref="chartElement" class="ec-chart" />
    <template #inspector><JsonPanel title="getOption()" :value="optionSnapshot" /></template>
  </ExperimentFrame>
</template>
