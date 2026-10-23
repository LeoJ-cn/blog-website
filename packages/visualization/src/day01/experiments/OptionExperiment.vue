<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { echarts, type ECharts, type EChartsCoreOption } from '../echarts'
import { useExperimentLog } from '../use-experiment-log'
import ExperimentFrame from '../components/ExperimentFrame.vue'
import JsonPanel from '../components/JsonPanel.vue'

type AxisMode = 'category' | 'value' | 'time'

const chartElement = ref<HTMLDivElement | null>(null)
const chart = shallowRef<ECharts | null>(null)
const title = ref('区域事件对比')
const axisMode = ref<AxisMode>('category')
const showLegend = ref(true)
const showTooltip = ref(true)
const showDataZoom = ref(false)
const showGridBoundary = ref(false)
const { logs, addLog } = useExperimentLog()

const option = computed<EChartsCoreOption>(() => {
  const values = [88, 123, 96, 142, 117, 75]
  const categoryData = ['浦东', '徐汇', '静安', '杨浦', '闵行', '嘉定']
  const timeData = values.map((value, index) => [Date.UTC(2026, 9, 10 + index), value])
  const isHorizontalValueAxis = axisMode.value === 'value'
  return {
    title: { text: title.value, left: 16, textStyle: { color: '#dce7ff', fontSize: 14 } },
    legend: { show: showLegend.value, top: 34, textStyle: { color: '#9fb0cf' } },
    tooltip: { show: showTooltip.value, trigger: 'axis' },
    grid: {
      left: 54,
      right: 28,
      top: 76,
      bottom: showDataZoom.value ? 64 : 38,
      show: showGridBoundary.value,
      borderColor: '#ffb454',
      backgroundColor: showGridBoundary.value ? 'rgba(255,180,84,.05)' : 'transparent',
    },
    xAxis: isHorizontalValueAxis
      ? { type: 'value' }
      : axisMode.value === 'time'
        ? { type: 'time' }
        : { type: 'category', data: categoryData },
    yAxis: isHorizontalValueAxis ? { type: 'category', data: categoryData } : { type: 'value' },
    dataZoom: showDataZoom.value ? [{ type: 'slider', xAxisIndex: 0, bottom: 8 }] : [],
    series: [
      {
        id: 'axis-demo',
        name: '事件数',
        type: 'bar',
        data: axisMode.value === 'time' ? timeData : values,
        encode: axisMode.value === 'time' ? { x: 0, y: 1 } : undefined,
        itemStyle: { color: '#5b8cff' },
      },
    ],
  }
})

function updateChart() {
  chart.value?.setOption(option.value, { notMerge: true })
  addLog(`Option 已更新：${axisMode.value} 轴`)
}

watch(option, updateChart, { deep: true })
onMounted(() => {
  if (!chartElement.value) return
  chart.value = echarts.init(chartElement.value)
  updateChart()
})
onBeforeUnmount(() => {
  chart.value?.dispose()
  chart.value = null
})
</script>

<template>
  <ExperimentFrame
    title="实验 02 · Option 与坐标系"
    description="切换坐标轴时同步改变数据结构"
    :logs="logs"
    :api-notes="[
      'category 轴使用类目数组。',
      'value 横轴需要把类目放到 yAxis。',
      'time 轴数据使用 [时间戳, 数值]。',
      'grid.show 用于观察绘图区真实边界。',
    ]"
  >
    <template #controls>
      <h4>Option 控制</h4>
      <label>
        标题
        <input v-model="title" />
      </label>
      <label>
        坐标轴
        <select v-model="axisMode">
          <option value="category">category</option>
          <option value="value">value</option>
          <option value="time">time</option>
        </select>
      </label>
      <label class="ec-check">
        <input v-model="showLegend" type="checkbox" />
        legend
      </label>
      <label class="ec-check">
        <input v-model="showTooltip" type="checkbox" />
        tooltip
      </label>
      <label class="ec-check">
        <input v-model="showDataZoom" type="checkbox" />
        dataZoom
      </label>
      <label class="ec-check">
        <input v-model="showGridBoundary" type="checkbox" />
        Grid 边界
      </label>
    </template>
    <div ref="chartElement" class="ec-chart" />
    <template #inspector><JsonPanel title="Option JSON" :value="option" /></template>
  </ExperimentFrame>
</template>
