<script setup lang="ts">
defineProps<{
  eventCount: number
  filteredCount: number
  renderModeLabel: string
  zoom: number
  /** 已格式化为“经度, 纬度”的 WGS84 坐标；无指针位置时传入占位符。 */
  coordinate: string
  featureCount: number
  regionEventCount: number
}>()
</script>

<template>
  <footer class="gis-status">
    <span>数据量：{{ eventCount.toLocaleString() }}</span><span>筛选结果：{{ filteredCount.toLocaleString() }}</span><span>渲染模式：{{ renderModeLabel }}</span><span>Zoom：{{ zoom }}</span><span>经纬度：{{ coordinate }}</span><span>当前 Feature：{{ featureCount.toLocaleString() }}</span><span>框选事件：{{ regionEventCount.toLocaleString() }}</span>
  </footer>
</template>

<style scoped>
.gis-status { height: 48px; display: flex; gap: 28px; align-items: center; padding: 0 18px; border-top: 1px solid #20314c; color: #8ba0bd; font-size: 12px; }
</style>
