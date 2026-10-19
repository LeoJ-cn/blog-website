<script setup lang="ts">
import { ElForm } from 'element-plus'

defineOptions({ inheritAttrs: false })

defineProps<{
  model: Record<string, unknown>
  labelPosition?: 'left' | 'right' | 'top'
  labelWidth?: string | number
  size?: 'large' | 'default' | 'small'
}>()
</script>

<template>
  <ElForm
    class="ui-form"
    :model="model"
    :label-position="labelPosition"
    :label-width="labelWidth"
    :size="size"
    v-bind="$attrs"
  >
    <slot />
  </ElForm>
</template>
