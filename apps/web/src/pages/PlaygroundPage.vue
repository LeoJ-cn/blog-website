<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { categoryMetadata, getProjectsByCategory } from '../data/projects'
import type { ProjectCategory } from '../types/project'

const categories = (Object.keys(categoryMetadata) as ProjectCategory[]).map((slug) => ({
  name: categoryMetadata[slug].title,
  slug,
  hint: categoryMetadata[slug].hint,
  projects: getProjectsByCategory(slug),
}))

function getProjectPath(category: ProjectCategory, projectSlug: string) {
  if (category === 'performance') return '/playground/performance'
  return `/playground/browser/${projectSlug}`
}
</script>

<template>
  <section class="playground-toolbar">
    <div>
      <p class="eyebrow">DEVELOPER PLAYGROUND</p>
      <h1>技术 Playground</h1>
    </div>
    <p>探索可交互 Demo、实现原理、源码入口与性能数据。</p>
  </section>

  <section class="playground-layout">
    <aside class="playground-sidebar" aria-label="技术点导航">
      <nav class="playground-nav">
        <div v-for="category in categories" :key="category.slug" class="playground-nav__group">
          <RouterLink :to="`/playground/${category.slug}`">
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
</template>
