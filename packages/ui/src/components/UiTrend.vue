<script setup lang="ts">
import { computed } from 'vue'
import type { UiTrendDirection, UiTrendFormat } from '../types/trend'

const props = withDefaults(
  defineProps<{
    value: number
    /** 显式方向优先于数值符号，用于表达“数值下降但业务表现改善”等业务语义。 */
    direction?: UiTrendDirection
    /** percent 自动附加百分号，number 只格式化数值；函数接收未经转换的原始 value。 */
    format?: UiTrendFormat
    label?: string
  }>(),
  { format: 'percent' },
)

const resolvedDirection = computed<UiTrendDirection>(() => {
  if (props.direction) return props.direction
  if (props.value > 0) return 'up'
  if (props.value < 0) return 'down'
  return 'flat'
})

const formattedValue = computed(() => {
  if (typeof props.format === 'function') return props.format(props.value)

  const number = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(props.value)
  const signedNumber = props.value > 0 ? `+${number}` : number
  return props.format === 'percent' ? `${signedNumber}%` : signedNumber
})

const directionLabel = computed(() => ({ up: '上升', down: '下降', flat: '持平' })[resolvedDirection.value])
const indicator = computed(() => ({ up: '↗', down: '↘', flat: '→' })[resolvedDirection.value])
const accessibleLabel = computed(() => props.label ?? `${directionLabel.value} ${formattedValue.value}`)
</script>

<template>
  <span
    class="ui-trend"
    :class="`ui-trend--${resolvedDirection}`"
    :aria-label="accessibleLabel"
  >
    <span class="ui-trend__value">{{ formattedValue }}</span>
    <span class="ui-trend__indicator" aria-hidden="true">{{ indicator }}</span>
    <span class="ui-trend__direction">{{ directionLabel }}</span>
  </span>
</template>
