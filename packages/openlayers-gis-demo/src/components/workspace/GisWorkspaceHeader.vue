<script setup lang="ts">
import { GIS_DATASET_SCALES, type GisDatasetScale } from '../../persistence/dataset-scale'
import { WORKSPACE_SCENE_META, type WorkspaceScene } from './workspace-types'
import type { WorkspaceInitializationState } from '../../composables/useGisWorkspace'

defineProps<{
  datasetScale: GisDatasetScale
  scene: WorkspaceScene
  initializationState: WorkspaceInitializationState
  initializationError: string
  persistenceFeedback: string
  memoryStorage: boolean
}>()

const emit = defineEmits<{
  changeScale: [scale: GisDatasetScale]
  changeScene: [scene: WorkspaceScene]
  retry: []
  closeFeedback: []
}>()
</script>

<template>
  <header class="gis-header">
    <div class="gis-brand">
      <small>URBAN INSPECTION CENTER</small>
      <div class="gis-title-row">
        <h2>城市巡检运营工作台</h2>
        <label class="dataset-scale-select">
          <span>数据量级</span>
          <select :value="datasetScale" :disabled="initializationState !== 'ready'" @change="emit('changeScale', ($event.target as HTMLSelectElement).value as GisDatasetScale)">
            <option v-for="scale in GIS_DATASET_SCALES" :key="scale" :value="scale">{{ scale }}</option>
          </select>
        </label>
      </div>
    </div>
    <nav class="gis-primary-nav" aria-label="GIS 工作台导航">
      <button v-for="(meta, value) in WORKSPACE_SCENE_META" :key="value" type="button" :class="{ active: scene === value }" @click="emit('changeScene', value)">{{ meta.label }}</button>
    </nav>
    <label class="gis-mobile-scene-select">
      <span>当前场景</span>
      <select :value="scene" @change="emit('changeScene', ($event.target as HTMLSelectElement).value as WorkspaceScene)">
        <option v-for="(meta, value) in WORKSPACE_SCENE_META" :key="value" :value="value">{{ meta.label }}</option>
      </select>
    </label>
    <span v-if="memoryStorage" class="storage-warning">内存模式 · 刷新后数据丢失</span>
    <span v-else class="online">● 系统在线</span>
  </header>
  <div v-if="initializationState !== 'ready'" class="initialization-status" role="status">
    <span v-if="initializationState === 'loading'">正在恢复本地数据…</span>
    <template v-else><span>初始化失败：{{ initializationError || '无法打开本地数据' }}</span><button type="button" @click="emit('retry')">重试</button></template>
  </div>
  <div v-if="persistenceFeedback" class="persistence-feedback" role="alert">
    <span>{{ persistenceFeedback }}</span><button type="button" @click="emit('closeFeedback')">关闭</button>
  </div>
</template>

<style scoped>
.gis-header { height: 66px; padding: 0 22px; display: flex; align-items: center; justify-content: space-between; background: #0d1729; border-bottom: 1px solid #20314c; }
.gis-brand { flex: 0 1 auto; min-width: 0; }
.gis-brand h2 { font-size: 20px; margin: 3px 0 0; }
.gis-brand small { color: #38bdf8; letter-spacing: .12em; }
.gis-title-row, .dataset-scale-select, .gis-mobile-scene-select { display: flex; align-items: center; }
.gis-title-row { gap: 14px; }
.dataset-scale-select { gap: 7px; color: #71809a; font-size: 11px; }
.dataset-scale-select select, .gis-mobile-scene-select select { padding: 4px 24px 4px 8px; border: 1px solid #2a3d5c; border-radius: 5px; background: #111e32; color: #7dd3fc; }
.dataset-scale-select select:disabled { cursor: wait; opacity: .6; }
.gis-primary-nav { align-self: stretch; display: flex; gap: 8px; }
.gis-primary-nav button { position: relative; padding: 0 18px; color: #71809a; background: transparent; border: 0; cursor: pointer; font-size: 13px; }
.gis-primary-nav button.active { color: #e0f2fe; }
.gis-primary-nav button.active::after { position: absolute; right: 12px; bottom: 0; left: 12px; height: 2px; background: #38bdf8; box-shadow: 0 0 10px #38bdf8; content: ''; }
.gis-mobile-scene-select { display: none; }
.storage-warning { color: #fbbf24; font-size: 12px; }
.online { color: #34d399; font-size: 13px; }
.initialization-status, .persistence-feedback { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 16px; font-size: 12px; }
.initialization-status { min-height: 42px; border-bottom: 1px solid #20314c; background: #111827; color: #fbbf24; }
.initialization-status button { padding: 5px 10px; border: 1px solid #38bdf8; border-radius: 5px; background: #0c2d46; color: #bae6fd; cursor: pointer; }
.persistence-feedback { border-bottom: 1px solid #7f1d1d; background: #451a1a; color: #fecaca; }
.persistence-feedback button { padding: 3px 8px; border: 1px solid #f87171; border-radius: 4px; background: transparent; color: inherit; cursor: pointer; }
@media (max-width: 720px) {
  .gis-primary-nav { display: none; }
  .gis-mobile-scene-select { display: flex; flex: 0 0 auto; gap: 6px; color: #71809a; font-size: 11px; }
  .gis-mobile-scene-select select { max-width: 96px; padding: 4px 20px 4px 7px; }
  .gis-brand h2 { font-size: 16px; }
}
</style>
