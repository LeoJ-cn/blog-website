<script setup lang="ts">
import { shallowRef } from 'vue'
import { ElTooltip } from 'element-plus'
import { useUiFloatingTheme } from '../composables/useUiFloatingTheme'

defineOptions({ inheritAttrs: false })

type TooltipProps = InstanceType<typeof ElTooltip>['$props']

defineProps<{
  content?: string
  placement?: TooltipProps['placement']
  trigger?: TooltipProps['trigger']
  disabled?: boolean
  showAfter?: number
  hideAfter?: number
  teleported?: boolean
  effect?: 'dark' | 'light'
}>()

const themeAnchor = shallowRef<HTMLElement | null>(null)
const { popperClass, refreshTheme } = useUiFloatingTheme(themeAnchor)
</script>

<template>
  <span ref="themeAnchor" class="ui-floating-theme-anchor">
    <ElTooltip
      class="ui-tooltip"
      :content="content"
      :placement="placement"
      :trigger="trigger"
      :disabled="disabled"
      :show-after="showAfter"
      :hide-after="hideAfter"
      :teleported="teleported"
      :effect="effect"
      :popper-class="popperClass"
      v-bind="$attrs"
      @before-show="refreshTheme"
    >
      <slot />
      <template v-if="$slots.content" #content><slot name="content" /></template>
    </ElTooltip>
  </span>
</template>
