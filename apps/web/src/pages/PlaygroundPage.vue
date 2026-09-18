<script setup lang="ts">
const categories = ['Performance', 'Engineering', 'Architecture', 'Network', 'Browser']
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">DEVELOPER PLAYGROUND</p>
    <h1>技术 Playground</h1>
    <p>选择一个方向，后续将逐步加入可运行的技术 Demo。</p>
  </section>

  <section class="category-grid" aria-label="技术分类">
    <article v-for="category in categories" :key="category" class="category-card">
      <span class="status-dot" aria-hidden="true"></span>
      <h2>{{ category }}</h2>
      <p>功能待开发</p>
    </article>
  </section>
</template>
