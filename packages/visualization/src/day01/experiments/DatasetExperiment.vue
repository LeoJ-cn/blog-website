<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { echarts, type ECharts, type EChartsCoreOption } from '../echarts'
import { inspectionData } from '../mock-data'
import { useExperimentLog } from '../use-experiment-log'
import ExperimentFrame from '../components/ExperimentFrame.vue'
import JsonPanel from '../components/JsonPanel.vue'

const chartElement = ref<HTMLDivElement | null>(null)
const chart = shallowRef<ECharts | null>(null)
const barField = ref<'today' | 'yesterday'>('today')
const transformMode = ref<'none' | 'filter' | 'sort'>('none')
const { logs, addLog } = useExperimentLog()
const dimensions = ['district', 'today', 'yesterday']

const dataset = computed(() => {
  const items: Record<string, unknown>[] = [{ id: 'raw', dimensions, source: inspectionData }]
  if (transformMode.value === 'filter') {
    items.push({
      id: 'view',
      fromDatasetId: 'raw',
      transform: { type: 'filter', config: { dimension: barField.value, gte: 100 } },
    })
  } else if (transformMode.value === 'sort') {
    items.push({
      id: 'view',
      fromDatasetId: 'raw',
      transform: { type: 'sort', config: { dimension: barField.value, order: 'desc' } },
    })
  }
  return items
})

const option = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 8, textStyle: { color: '#9fb0cf' } },
  grid: { left: 48, right: 24, top: 48, bottom: 36 },
  dataset: dataset.value,
  xAxis: { type: 'category' },
  yAxis: { type: 'value' },
  series: [
    {
      id: 'today-bar',
      name: `柱状 · ${barField.value}`,
      type: 'bar',
      datasetId: transformMode.value === 'none' ? 'raw' : 'view',
      encode: { x: 'district', y: barField.value },
      itemStyle: { color: '#5b8cff' },
    },
    {
      id: 'yesterday-line',
      name: '昨日折线',
      type: 'line',
      datasetId: transformMode.value === 'none' ? 'raw' : 'view',
      encode: { x: 'district', y: 'yesterday' },
      smooth: true,
      itemStyle: { color: '#62e6b5' },
    },
  ],
}))

function updateDataset() {
  chart.value?.setOption(option.value, { notMerge: true })
  addLog(`Dataset 更新：encode=${barField.value}，transform=${transformMode.value}`)
}

watch(option, updateDataset, { deep: true })
onMounted(() => {
  if (!chartElement.value) return
  chart.value = echarts.init(chartElement.value)
  updateDataset()
})
onBeforeUnmount(() => chart.value?.dispose())
</script>

<template>
  <ExperimentFrame
    title="实验 03 · Dataset + Encode"
    description="同一份巡检数据驱动多个 Series"
    :logs="logs"
    :api-notes="[
      'dimensions 定义稳定字段顺序。',
      'encode 显式声明字段到视觉通道的映射。',
      'transform 生成派生 Dataset，不修改原始 source。',
    ]"
  >
    <template #controls>
      <h4>字段映射</h4>
      <label>
        柱状字段
        <select v-model="barField">
          <option value="today">today</option>
          <option value="yesterday">yesterday</option>
        </select>
      </label>
      <label>
        Transform
        <select v-model="transformMode">
          <option value="none">不转换</option>
          <option value="filter">过滤 ≥ 100</option>
          <option value="sort">降序排序</option>
        </select>
      </label>
    </template>
    <div ref="chartElement" class="ec-chart" />
    <template #inspector>
      <JsonPanel title="dimensions" :value="dimensions" />
      <JsonPanel title="dataset.source" :value="inspectionData" />
      <JsonPanel title="encode" :value="option.series" />
    </template>
  </ExperimentFrame>
</template>
