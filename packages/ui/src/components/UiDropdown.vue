<script setup lang="ts">
import { shallowRef } from 'vue'
import { ElDropdown } from 'element-plus'
import { useUiFloatingTheme } from '../composables/useUiFloatingTheme'

defineOptions({ inheritAttrs: false })

type DropdownProps = InstanceType<typeof ElDropdown>['$props']

defineProps<{
  trigger?: DropdownProps['trigger']
  placement?: DropdownProps['placement']
  hideOnClick?: boolean
  showTimeout?: number
  hideTimeout?: number
  disabled?: boolean
  teleported?: boolean
}>()

const themeAnchor = shallowRef<HTMLElement | null>(null)
const { popperClass, refreshTheme } = useUiFloatingTheme(themeAnchor)

function handleVisibleChange(visible: boolean): void {
  if (visible) refreshTheme()
}
</script>

<template>
  <span ref="themeAnchor" class="ui-floating-theme-anchor">
    <ElDropdown
      class="ui-dropdown"
      :trigger="trigger"
      :placement="placement"
      :hide-on-click="hideOnClick"
      :show-timeout="showTimeout"
      :hide-timeout="hideTimeout"
      :disabled="disabled"
      :teleported="teleported"
      :popper-class="popperClass"
      v-bind="$attrs"
      @visible-change="handleVisibleChange"
    >
      <slot />
      <template #dropdown><slot name="dropdown" /></template>
    </ElDropdown>
  </span>
</template>
