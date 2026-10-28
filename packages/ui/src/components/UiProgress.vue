<script setup lang="ts">
import { ElProgress } from 'element-plus'

defineOptions({ inheritAttrs: false })

defineProps<{
  percentage: number
  type?: 'line' | 'circle' | 'dashboard'
  status?: 'success' | 'exception' | 'warning'
  strokeWidth?: number
  textInside?: boolean
  showText?: boolean
  indeterminate?: boolean
  duration?: number
  format?: (percentage: number) => string
}>()
</script>

<template>
  <ElProgress
    class="ui-progress"
    :percentage="percentage"
    :type="type"
    :status="status"
    :stroke-width="strokeWidth"
    :text-inside="textInside"
    :show-text="showText"
    :indeterminate="indeterminate"
    :duration="duration"
    :format="format"
    v-bind="$attrs"
  >
    <template v-if="$slots.default" #default="scope"><slot v-bind="scope" /></template>
  </ElProgress>
</template>
