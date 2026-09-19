<script setup lang="ts">
import type { MetricSnapshot } from '../types/project'

defineProps<{ metrics: MetricSnapshot[] }>()
</script>

<template>
  <div class="metrics-panel">
    <div v-for="metric in metrics" :key="metric.label" class="metric-card" :data-tone="metric.tone">
      <span>{{ metric.label }}</span>
      <strong
        >{{ metric.value }} <small v-if="metric.unit">{{ metric.unit }}</small></strong
      >
    </div>
  </div>
</template>
