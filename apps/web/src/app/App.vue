<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const isPlayground = computed(() => route.path.startsWith('/playground'))
const isPlaygroundFullscreen = computed(
  () => isPlayground.value && route.query.display === 'fullscreen',
)

function exitPlaygroundFullscreen() {
  const query = { ...route.query }
  delete query.display
  void router.replace({ query })
}
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--playground-fullscreen': isPlaygroundFullscreen }">
    <header class="app-header">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">&lt;/&gt;</span>
        <span>Engineering Showcase</span>
      </RouterLink>
      <nav class="app-nav" aria-label="主导航">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/playground">技术 Playground</RouterLink>
        <button
          v-if="isPlaygroundFullscreen"
          class="app-nav__fullscreen-exit"
          type="button"
          @click="exitPlaygroundFullscreen"
        >
          退出全屏
        </button>
      </nav>
    </header>

    <main
      class="app-main"
      :class="{
        'app-main--wide': isPlayground,
        'app-main--playground-fullscreen': isPlaygroundFullscreen,
      }"
    >
      <RouterView />
    </main>
  </div>
</template>
