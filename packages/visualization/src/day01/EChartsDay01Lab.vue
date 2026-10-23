<script setup lang="ts">
import { computed, markRaw, ref } from 'vue'
import DatasetExperiment from './experiments/DatasetExperiment.vue'
import EventExperiment from './experiments/EventExperiment.vue'
import LifecycleExperiment from './experiments/LifecycleExperiment.vue'
import OptionExperiment from './experiments/OptionExperiment.vue'
import RendererExperiment from './experiments/RendererExperiment.vue'
import UpdateExperiment from './experiments/UpdateExperiment.vue'

const experiments = [
  {
    id: 'lifecycle',
    order: '01',
    title: '实例生命周期',
    component: markRaw(LifecycleExperiment),
  },
  {
    id: 'option',
    order: '02',
    title: 'Option 与坐标系',
    component: markRaw(OptionExperiment),
  },
  {
    id: 'dataset',
    order: '03',
    title: 'Dataset + Encode',
    component: markRaw(DatasetExperiment),
  },
  {
    id: 'update',
    order: '04',
    title: 'setOption 更新',
    component: markRaw(UpdateExperiment),
  },
  {
    id: 'renderer',
    order: '05',
    title: 'Canvas 与 SVG',
    component: markRaw(RendererExperiment),
  },
  {
    id: 'events',
    order: '06',
    title: '事件机制',
    component: markRaw(EventExperiment),
  },
] as const

const activeId = ref<(typeof experiments)[number]['id']>('lifecycle')
const activeExperiment = computed(
  () => experiments.find((item) => item.id === activeId.value) ?? experiments[0],
)
</script>

<template>
  <section class="ec-day01">
    <header class="ec-day01__hero">
      <div>
        <p>ECHARTS COURSE · DAY 01</p>
        <h2>核心体系可视化实验室</h2>
      </div>
      <span>Vue 3 · TypeScript · ECharts 6.1</span>
    </header>
    <div class="ec-day01__layout">
      <nav class="ec-day01__nav" aria-label="Day01 实验导航">
        <button
          v-for="item in experiments"
          :key="item.id"
          type="button"
          :class="{ 'is-active': activeId === item.id }"
          @click="activeId = item.id"
        >
          <span>{{ item.order }}</span>
          <strong>{{ item.title }}</strong>
        </button>
      </nav>
      <div class="ec-day01__content">
        <component :is="activeExperiment.component" :key="activeExperiment.id" />
      </div>
    </div>
  </section>
</template>
