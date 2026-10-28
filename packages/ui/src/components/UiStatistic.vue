<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { ElStatistic } from 'element-plus'

defineOptions({ inheritAttrs: false })

defineProps<{
  value?: number
  decimalSeparator?: string
  groupSeparator?: string
  precision?: number
  prefix?: string
  suffix?: string
  title?: string
  valueStyle?: CSSProperties
  formatter?: (value: number) => string
}>()
</script>

<template>
  <ElStatistic
    class="ui-statistic"
    :value="value"
    :decimal-separator="decimalSeparator"
    :group-separator="groupSeparator"
    :precision="precision"
    :prefix="prefix"
    :suffix="suffix"
    :title="title"
    :value-style="valueStyle"
    :formatter="formatter"
    v-bind="$attrs"
  >
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
    <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
  </ElStatistic>
</template>
