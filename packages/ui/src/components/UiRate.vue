<script setup lang="ts">
import { ElRate } from 'element-plus'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 当前评分，取值范围为闭区间 [0, max]。 */
    modelValue?: number
    /** 星级总数，必须为正整数，默认 5。 */
    max?: number
    disabled?: boolean
    /** 只读状态复用 Element Plus 的 disabled 展示，使组件不可通过鼠标或键盘修改。 */
    readonly?: boolean
    /** 允许以 0.5 为步长选择半星。 */
    allowHalf?: boolean
    /** 允许再次选择当前评分时清空，并将模型值更新为 0。 */
    clearable?: boolean
  }>(),
  {
    max: 5,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
  change: [value: number]
}>()
</script>

<template>
  <ElRate
    class="ui-rate"
    :model-value="modelValue"
    :max="props.max"
    :disabled="disabled || readonly"
    :allow-half="allowHalf"
    :clearable="clearable"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)"
    @change="emit('change', $event)"
  />
</template>
