<script setup lang="ts" generic="T extends UiListItem">
import type { UiListDensity, UiListItem } from '../types/list'

const props = withDefaults(
  defineProps<{
    items: readonly T[]
    density?: UiListDensity
    /** 默认显示行间分隔线；关闭后仍保留列表项自身间距。 */
    divided?: boolean
    emptyText?: string
  }>(),
  { density: 'default', divided: true, emptyText: '暂无数据' },
)

defineSlots<{
  default(props: { item: T; index: number }): unknown
  empty(): unknown
}>()
</script>

<template>
  <ul
    v-if="props.items.length"
    class="ui-list"
    :class="[`ui-list--${props.density}`, { 'ui-list--divided': props.divided }]"
  >
    <li v-for="(item, index) in props.items" :key="item.key" class="ui-list__item">
      <slot :item="item" :index="index" />
    </li>
  </ul>
  <div v-else class="ui-list__empty" role="status">
    <slot name="empty">{{ props.emptyText }}</slot>
  </div>
</template>
