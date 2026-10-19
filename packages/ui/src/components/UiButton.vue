<script setup lang="ts">
import { ElButton } from 'element-plus'

defineOptions({ inheritAttrs: false })

defineProps<{
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
  size?: 'large' | 'default' | 'small'
  disabled?: boolean
  loading?: boolean
  nativeType?: 'button' | 'submit' | 'reset'
}>()
</script>

<template>
  <ElButton
    class="ui-button"
    :type="type"
    :size="size"
    :disabled="disabled"
    :loading="loading"
    :native-type="nativeType ?? 'button'"
    v-bind="$attrs"
  >
    <slot />
    <template v-if="$slots.icon" #icon><slot name="icon" /></template>
    <template v-if="$slots.loading" #loading><slot name="loading" /></template>
  </ElButton>
</template>
