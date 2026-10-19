<script setup lang="ts">
import { UiLoading } from '@white55/ui/loading'
import '@white55/ui/loading.css'
</script>

<template>
  <section class="ui-playground-demo">
    <h2>Loading</h2>
    <p>局部异步等待状态。</p>
    <UiLoading label="正在加载数据…" />
  </section>
</template>
