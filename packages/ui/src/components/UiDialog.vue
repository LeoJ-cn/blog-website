<script setup lang="ts">
import { ElDialog } from 'element-plus'

defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue?: boolean
  title?: string
  width?: string | number
  closeOnClickModal?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: []
  close: []
}>()
</script>

<template>
  <ElDialog
    class="ui-dialog"
    :model-value="modelValue"
    :title="title"
    :width="width"
    :close-on-click-modal="closeOnClickModal ?? false"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)"
    @open="emit('open')"
    @close="emit('close')"
  >
    <slot />
    <template v-if="$slots.header" #header="scope"><slot name="header" v-bind="scope" /></template>
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </ElDialog>
</template>
