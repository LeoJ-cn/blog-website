<script setup lang="ts">
import { ElTabs } from 'element-plus'

defineOptions({ inheritAttrs: false })

type TabPaneName = string | number

defineProps<{
  modelValue?: TabPaneName
  type?: 'card' | 'border-card'
  tabPosition?: 'top' | 'right' | 'bottom' | 'left'
  stretch?: boolean
  closable?: boolean
  addable?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TabPaneName]
}>()
</script>

<template>
  <ElTabs
    class="ui-tabs"
    :model-value="modelValue"
    :type="type"
    :tab-position="tabPosition"
    :stretch="stretch"
    :closable="closable"
    :addable="addable"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <slot />
    <template v-if="$slots.addIcon" #add-icon><slot name="addIcon" /></template>
  </ElTabs>
</template>
