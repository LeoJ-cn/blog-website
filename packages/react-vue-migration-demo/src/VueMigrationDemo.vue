<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { mountReactMigrationDemo } from './demo/mount-react-migration-demo'

const container = ref<HTMLElement | null>(null)
const startupError = ref<string | null>(null)
let dispose: (() => void) | null = null

onMounted(() => {
  if (!container.value) {
    startupError.value = 'React migration demo container is unavailable.'
    return
  }

  try {
    dispose = mountReactMigrationDemo(container.value, {
      onError(reason) {
        startupError.value =
          reason instanceof Error ? reason.message : 'React migration demo failed to render.'
      },
    })
  } catch (reason) {
    startupError.value = reason instanceof Error ? reason.message : 'React migration demo failed to start.'
  }
})

onBeforeUnmount(() => {
  dispose?.()
  dispose = null
})
</script>

<template>
  <div class="react-vue-migration-demo-adapter">
    <p v-if="startupError" class="react-vue-migration-demo-adapter__error" role="alert">
      {{ startupError }}
    </p>
    <div ref="container" class="react-vue-migration-demo-adapter__root" />
  </div>
</template>

<style scoped>
.react-vue-migration-demo-adapter__error {
  margin: 0 0 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid rgb(248 113 113 / 45%);
  border-radius: 10px;
  color: #fecaca;
  background: rgb(127 29 29 / 25%);
}
</style>
