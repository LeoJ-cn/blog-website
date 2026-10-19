<script setup lang="ts">
import { UiButton } from '@white55/ui/button'
import { UiEmptyState } from '@white55/ui/empty-state'
import '@white55/ui/button.css'
import '@white55/ui/empty-state.css'
</script>

<template>
  <section class="ui-playground-demo">
    <h2>EmptyState</h2>
    <UiEmptyState title="暂无结果" description="调整筛选条件后再试。">
      <UiButton type="primary">清空筛选</UiButton>
    </UiEmptyState>
  </section>
</template>
