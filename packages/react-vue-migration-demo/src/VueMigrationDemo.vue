<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { mountReactMigrationDemo } from './demo/mount-react-migration-demo'

const container = ref<HTMLElement | null>(null)
const startupError = ref<string | null>(null)
let dispose: (() => void) | null = null

onMounted(() => {
  if (!container.value) {
    startupError.value = 'React 迁移演示容器不可用。'
    return
  }

  try {
    dispose = mountReactMigrationDemo(container.value, {
      onError(reason) {
        startupError.value = reason instanceof Error ? reason.message : 'React 迁移演示渲染失败。'
      },
    })
  } catch (reason) {
    startupError.value = reason instanceof Error ? reason.message : 'React 迁移演示启动失败。'
  }
})

onBeforeUnmount(() => {
  dispose?.()
  dispose = null
})
</script>

<template>
  <div class="react-vue-migration-demo-adapter">
    <div class="react-vue-migration-demo-adapter__boundary-label">
      <span>Vue 宿主组件</span>
      <code>VueMigrationDemo.vue</code>
    </div>
    <p v-if="startupError" class="react-vue-migration-demo-adapter__error" role="alert">
      {{ startupError }}
    </p>
    <div ref="container" class="react-vue-migration-demo-adapter__root" />
  </div>
</template>

<style scoped>
.react-vue-migration-demo-adapter {
  --vue-boundary: #42d392;
  background: rgb(15 35 35 / 26%);
  border: 1px solid rgb(66 211 146 / 68%);
  border-radius: 14px;
  padding: 0.9rem;
}

.react-vue-migration-demo-adapter__boundary-label {
  align-items: center;
  color: var(--vue-boundary);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.75rem;
  font-weight: 700;
  gap: 0.55rem;
  margin-bottom: 0.75rem;
}

.react-vue-migration-demo-adapter__boundary-label code {
  background: rgb(66 211 146 / 10%);
  border: 1px solid rgb(66 211 146 / 22%);
  border-radius: 999px;
  color: #a7f3d0;
  font-size: 0.68rem;
  font-weight: 500;
  padding: 0.2rem 0.5rem;
}

.react-vue-migration-demo-adapter__root {
  min-width: 0;
}

.react-vue-migration-demo-adapter__error {
  margin: 0 0 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid rgb(248 113 113 / 45%);
  border-radius: 10px;
  color: #fecaca;
  background: rgb(127 29 29 / 25%);
}

@media (max-width: 640px) {
  .react-vue-migration-demo-adapter {
    padding: 0.6rem;
  }
}
</style>
