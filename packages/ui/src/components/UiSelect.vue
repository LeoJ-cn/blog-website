<script setup lang="ts">
import { ElSelect } from 'element-plus'

defineOptions({ inheritAttrs: false })

/** 选择值保留 Element Plus 的单选/多选形态，数组元素只允许可序列化的标量。 */
type UiSelectValue = string | number | boolean | Array<string | number | boolean>

defineProps<{
  modelValue?: UiSelectValue
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  multiple?: boolean
  filterable?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: UiSelectValue]
  change: [value: UiSelectValue]
}>()
</script>

<template>
  <ElSelect
    class="ui-select"
    :model-value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :multiple="multiple"
    :filterable="filterable"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)"
    @change="emit('change', $event)"
  >
    <slot />
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
  </ElSelect>
</template>
