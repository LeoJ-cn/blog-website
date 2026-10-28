<script setup lang="ts">
import { ElBreadcrumb } from 'element-plus'

defineOptions({ inheritAttrs: false })

type BreadcrumbProps = InstanceType<typeof ElBreadcrumb>['$props']

defineProps<{
  separator?: string
  separatorIcon?: BreadcrumbProps['separatorIcon']
}>()
</script>

<template>
  <ElBreadcrumb
    class="ui-breadcrumb"
    :separator="separator"
    :separator-icon="separatorIcon"
    v-bind="$attrs"
  >
    <slot />
  </ElBreadcrumb>
</template>
