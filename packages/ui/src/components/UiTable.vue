<script setup lang="ts">
import { ElTable } from 'element-plus'

defineOptions({ inheritAttrs: false })

defineProps<{
  data: Array<Record<string, unknown>>
  stripe?: boolean
  border?: boolean
  height?: string | number
}>()
</script>

<template>
  <ElTable class="ui-table" :data="data" :stripe="stripe" :border="border" :height="height" v-bind="$attrs">
    <slot />
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
    <template v-if="$slots.append" #append><slot name="append" /></template>
  </ElTable>
</template>
