<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { categoryMetadata, getProjectPath, getProjectsByCategory } from '../data/projects'
import type { ProjectCategory } from '../types/project'

const route = useRoute()
const router = useRouter()
const isFullscreen = computed(() => route.query.display === 'fullscreen')

const categories = (Object.keys(categoryMetadata) as ProjectCategory[]).map((slug) => ({
  name: categoryMetadata[slug].title,
  slug,
  hint: categoryMetadata[slug].hint,
  projects: getProjectsByCategory(slug),
}))

function enterFullscreen() {
  // 使用 URL 保存展示模式，使刷新、分享链接和浏览器前进后退都能恢复相同布局。
  void router.replace({ query: { ...route.query, display: 'fullscreen' } })
}

function exitFullscreen() {
  const query = { ...route.query }
  delete query.display
  void router.replace({ query })
}

function handleFullscreenShortcut(event: KeyboardEvent) {
  if (event.key === 'Escape' && isFullscreen.value) exitFullscreen()
}

onMounted(() => window.addEventListener('keydown', handleFullscreenShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleFullscreenShortcut))
</script>

<template>
  <div class="playground-page" :class="{ 'playground-page--fullscreen': isFullscreen }">
    <section class="playground-toolbar">
      <div>
        <p class="eyebrow">DEVELOPER PLAYGROUND</p>
        <h1>技术 Playground</h1>
      </div>
      <div class="playground-toolbar__actions">
        <p>探索可交互 Demo、实现原理、源码入口与性能数据。</p>
        <button class="playground-fullscreen-button" type="button" @click="enterFullscreen">
          页面内全屏
        </button>
      </div>
    </section>

    <section class="playground-layout">
      <aside class="playground-sidebar" aria-label="技术点导航">
        <nav class="playground-nav">
          <div v-for="category in categories" :key="category.slug" class="playground-nav__group">
            <RouterLink :to="`/playground/${category.slug}`" class="playground-nav__category">
              <span>
                <strong>{{ category.name }}</strong>
                <small>{{ category.hint }}</small>
              </span>
              <span class="playground-nav__count">{{ category.projects.length }}</span>
            </RouterLink>
            <RouterLink
              v-for="project in category.projects"
              :key="project.slug"
              :to="getProjectPath(category.slug, project.slug)"
              class="playground-nav__project"
            >
              {{ project.title }}
            </RouterLink>
          </div>
        </nav>
      </aside>
      <main class="playground-content-area">
        <RouterView />
      </main>
    </section>
  </div>
</template>
