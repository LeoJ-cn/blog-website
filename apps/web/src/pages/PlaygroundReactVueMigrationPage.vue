<script setup lang="ts">
import { ReactVueMigrationDemo } from '@blog/react-vue-migration-demo'
import { projects } from '../data/projects'

const project = projects.find((item) => item.slug === 'react-vue-migration')
</script>

<template>
  <template v-if="project">
    <p class="eyebrow">ENGINEERING / FRAMEWORK MIGRATION</p>
    <h2>{{ project.title }}</h2>
    <p class="page-lead">{{ project.description }}</p>
  </template>

  <div class="demo-stage react-vue-migration-stage">
    <ReactVueMigrationDemo />
  </div>
</template>

<style scoped>
.react-vue-migration-stage {
  padding: clamp(1rem, 2vw, 1.5rem);
}
</style>
