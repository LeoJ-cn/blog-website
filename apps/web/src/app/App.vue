<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const isPlayground = computed(() => route.path.startsWith('/playground'))
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">&lt;/&gt;</span>
        <span>Engineering Showcase</span>
      </RouterLink>
      <nav class="app-nav" aria-label="主导航">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/playground">技术 Playground</RouterLink>
      </nav>
    </header>

    <main class="app-main" :class="{ 'app-main--wide': isPlayground }">
      <RouterView />
    </main>
  </div>
</template>
