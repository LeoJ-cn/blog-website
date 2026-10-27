<script setup lang="ts">
import { ElCheckbox } from 'element-plus'

defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue?: boolean
  disabled?: boolean
  /** 仅控制半选视觉状态，不改变 modelValue；调用方需在业务状态变化时主动清除。 */
  indeterminate?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

type CheckboxValue = string | number | boolean

function emitModelValue(value: CheckboxValue): void {
  // Element Plus 兼容自定义选中值；当前组件公开协议只接受布尔值，避免模型类型被透传属性隐式改变。
  if (typeof value === 'boolean') {
    emit('update:modelValue', value)
  }
}

function emitChange(value: CheckboxValue): void {
  if (typeof value === 'boolean') {
    emit('change', value)
  }
}
</script>

<template>
  <ElCheckbox
    class="ui-checkbox"
    :model-value="modelValue"
    :disabled="disabled"
    :indeterminate="indeterminate"
    v-bind="$attrs"
    @update:model-value="emitModelValue"
    @change="emitChange"
  >
    <slot />
  </ElCheckbox>
</template>
