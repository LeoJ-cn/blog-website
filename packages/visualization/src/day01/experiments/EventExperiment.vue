<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { echarts, type ECharts, type EChartsCoreOption } from '../echarts'
import { eventData } from '../mock-data'
import { useExperimentLog } from '../use-experiment-log'
import ExperimentFrame from '../components/ExperimentFrame.vue'
import JsonPanel from '../components/JsonPanel.vue'

const chartElement = ref<HTMLDivElement | null>(null)
const chart = shallowRef<ECharts | null>(null)
const selectedIndex = ref(0)
const eventDetail = shallowRef<unknown>({ waiting: true })
const conversion = shallowRef<unknown>({ waiting: true })
const { logs, addLog } = useExperimentLog()
const selectedItem = computed(() => eventData[selectedIndex.value])
const option: EChartsCoreOption = {
  tooltip: { trigger: 'item' },
  legend: { top: 8, textStyle: { color: '#9fb0cf' } },
  grid: { left: 48, right: 24, top: 46, bottom: 58 },
  dataZoom: [{ type: 'slider', bottom: 8 }],
  xAxis: { type: 'category', data: eventData.map((item) => item.name) },
  yAxis: { type: 'value' },
  series: [
    {
      id: 'events',
      name: '事件数',
      type: 'bar',
      data: eventData.map((item) => item.value),
      itemStyle: { color: '#5b8cff' },
    },
  ],
}

function captureEvent(name: string, params: unknown) {
  const detail = params as {
    componentType?: string
    seriesType?: string
    seriesName?: string
    name?: string
    dataIndex?: number
    value?: unknown
    selected?: Record<string, boolean>
    start?: number
    end?: number
  }
  // 事件参数可能携带 ZRender 原生事件和 DOM 引用；面板只保存稳定的可序列化字段。
  eventDetail.value = {
    event: name,
    componentType: detail.componentType,
    seriesType: detail.seriesType,
    seriesName: detail.seriesName,
    name: detail.name,
    dataIndex: detail.dataIndex,
    value: detail.value,
    selected: detail.selected,
    start: detail.start,
    end: detail.end,
  }
  addLog(`${name} 事件已捕获`)
}
function handleClick(params: { dataIndex?: number }) {
  if (typeof params.dataIndex === 'number') selectedIndex.value = params.dataIndex
  captureEvent('click', params)
}
function handleMouseover(params: unknown) {
  captureEvent('mouseover', params)
}
function handleLegend(params: unknown) {
  captureEvent('legendselectchanged', params)
}
function handleDataZoom(params: unknown) {
  captureEvent('datazoom', params)
}

function bindChartEvents() {
  if (!chart.value) return
  chart.value.on('click', handleClick)
  chart.value.on('mouseover', handleMouseover)
  chart.value.on('legendselectchanged', handleLegend)
  chart.value.on('datazoom', handleDataZoom)
}

function unbindChartEvents() {
  if (!chart.value) return
  chart.value.off('click', handleClick)
  chart.value.off('mouseover', handleMouseover)
  chart.value.off('legendselectchanged', handleLegend)
  chart.value.off('datazoom', handleDataZoom)
}

function highlightNext() {
  if (!chart.value) return
  selectedIndex.value = (selectedIndex.value + 1) % eventData.length
  chart.value.dispatchAction({ type: 'downplay', seriesId: 'events' })
  chart.value.dispatchAction({
    type: 'highlight',
    seriesId: 'events',
    dataIndex: selectedIndex.value,
  })
  addLog(`dispatchAction：高亮 ${selectedItem.value.name}`)
}

function showTooltip() {
  chart.value?.dispatchAction({
    type: 'showTip',
    seriesId: 'events',
    dataIndex: selectedIndex.value,
  })
  addLog('dispatchAction：主动显示 Tooltip')
}

function convertCoordinates() {
  if (!chart.value) return
  const dataPoint: [number, number] = [selectedIndex.value, selectedItem.value.value]
  const pixel = chart.value.convertToPixel({ seriesId: 'events' }, dataPoint)
  if (!Array.isArray(pixel) || pixel.some((value) => !Number.isFinite(value))) {
    conversion.value = { error: '当前坐标系尚未返回有效像素坐标', dataPoint }
    addLog('坐标转换失败：像素坐标无效')
    return
  }
  const restored = chart.value.convertFromPixel({ seriesId: 'events' }, pixel)
  if (!Array.isArray(restored) || restored.some((value) => !Number.isFinite(value))) {
    conversion.value = { error: '像素坐标无法还原为有效数据坐标', dataPoint, pixel }
    addLog('坐标转换失败：还原坐标无效')
    return
  }
  conversion.value = {
    dataPoint,
    pixel: pixel.map((value) => Number(value.toFixed(2))),
    restored: restored.map((value) => Number(value.toFixed(2))),
  }
  addLog('完成 data ↔ pixel 坐标转换')
}

onMounted(() => {
  if (chartElement.value) {
    chart.value = echarts.init(chartElement.value)
    chart.value.setOption(option)
    bindChartEvents()
  }
})
onBeforeUnmount(() => {
  unbindChartEvents()
  chart.value?.dispose()
  chart.value = null
})
</script>

<template>
  <ExperimentFrame
    title="实验 06 · 事件机制"
    description="点击图形并观察事件参数与坐标转换"
    :logs="logs"
    :api-notes="[
      'on 与 off 应传入同一函数引用。',
      'dispatchAction 可触发高亮、Tooltip 等内置行为。',
      'convertToPixel / convertFromPixel 依赖当前坐标系。',
    ]"
  >
    <template #controls>
      <h4>主动操作</h4>
      <button type="button" @click="highlightNext">高亮下一项</button>
      <button type="button" @click="showTooltip">显示 Tooltip</button>
      <button type="button" @click="convertCoordinates">转换坐标</button>
      <p class="ec-selection">
        当前：
        <strong>{{ selectedItem.name }}</strong>
        / {{ selectedItem.value }}
      </p>
    </template>
    <div ref="chartElement" class="ec-chart" />
    <template #inspector>
      <JsonPanel title="实时事件参数" :value="eventDetail" />
      <JsonPanel title="坐标转换" :value="conversion" />
    </template>
  </ExperimentFrame>
</template>
