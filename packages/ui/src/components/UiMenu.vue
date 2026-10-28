<script setup lang="ts">
import { ElMenu } from 'element-plus'

defineOptions({ inheritAttrs: false })

defineProps<{
  defaultActive?: string
  defaultOpeneds?: string[]
  mode?: 'horizontal' | 'vertical'
  collapse?: boolean
  uniqueOpened?: boolean
  router?: boolean
  ellipsis?: boolean
}>()
</script>

<template>
  <ElMenu
    class="ui-menu"
    :default-active="defaultActive"
    :default-openeds="defaultOpeneds"
    :mode="mode"
    :collapse="collapse"
    :unique-opened="uniqueOpened"
    :router="router"
    :ellipsis="ellipsis"
    v-bind="$attrs"
  >
    <slot />
  </ElMenu>
</template>
