<script setup lang="ts">
import type { EventStatus } from '../../types/inspection-event'

defineProps<{
  activeStatus: EventStatus | ''
  overdueOnly: boolean
  todayNewCount: number
  statusCounts: Record<EventStatus, number>
  overdueCount: number
  onlinePersonnelCount: number
  completionRate: number
}>()

const emit = defineEmits<{ filterStatus: [status: EventStatus | null, overdueOnly?: boolean] }>()
</script>

<template>
  <section class="operations-summary" aria-label="今日巡检态势">
    <button type="button" :class="{ active: activeStatus === '' && !overdueOnly }" @click="emit('filterStatus', null)"><span>今日新增</span><strong>{{ todayNewCount.toLocaleString() }}</strong><small>点击查看全部</small></button>
    <button class="pending" type="button" :class="{ active: activeStatus === 'PENDING' && !overdueOnly }" @click="emit('filterStatus', 'PENDING')"><span>待处置</span><strong>{{ statusCounts.PENDING.toLocaleString() }}</strong><small>点击筛选</small></button>
    <button class="processing" type="button" :class="{ active: activeStatus === 'PROCESSING' && !overdueOnly }" @click="emit('filterStatus', 'PROCESSING')"><span>处理中</span><strong>{{ statusCounts.PROCESSING.toLocaleString() }}</strong><small>点击筛选</small></button>
    <button class="overdue" type="button" :class="{ active: overdueOnly }" @click="emit('filterStatus', null, true)"><span>已超时</span><strong>{{ overdueCount.toLocaleString() }}</strong><small>点击优先处置</small></button>
    <article><span>在线人员</span><strong>{{ onlinePersonnelCount.toLocaleString() }}</strong><small>模拟值守</small></article>
    <button class="completed" type="button" :class="{ active: activeStatus === 'DONE' && !overdueOnly }" @click="emit('filterStatus', 'DONE')"><span>今日闭环率</span><strong>{{ completionRate }}%</strong><small>点击查看已完成</small></button>
  </section>
</template>

<style scoped>
.operations-summary { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px; background: #07101e; border-bottom: 1px solid #20314c; }
.operations-summary article, .operations-summary button { flex: 1 1 150px; display: flex; flex-wrap: wrap; align-items: center; gap: 5px 10px; min-width: 0; padding: 11px 13px; background: linear-gradient(135deg, #101d31, #0b1627); border: 1px solid #20314c; border-radius: 8px; }
.operations-summary button { color: inherit; cursor: pointer; font: inherit; text-align: left; }
.operations-summary button:hover, .operations-summary button.active { border-color: #38bdf899; background: linear-gradient(135deg, #122b43, #0b1c30); }
.operations-summary span { flex: 1 1 auto; color: #71809a; font-size: 10px; }
.operations-summary small { flex: 1 1 100%; color: #71809a; font-size: 10px; }
.operations-summary strong { flex: 0 0 auto; margin-left: auto; color: #e0f2fe; font-size: 22px; font-variant-numeric: tabular-nums; }
.operations-summary .pending strong, .operations-summary .processing strong { color: #fbbf24; }
.operations-summary .overdue strong { color: #fb7185; }
.operations-summary .completed strong { color: #2dd4bf; }
@media (max-width: 1000px) { .operations-summary > * { flex-basis: calc(33.333% - 7px); } }
@media (max-width: 720px) { .operations-summary > * { flex-basis: calc(50% - 5px); } }
</style>
