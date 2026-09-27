<script setup lang="ts">
import type { FramePerformanceSnapshot } from '@blog/monitoring'

interface Props {
  snapshot: FramePerformanceSnapshot
  status?: 'running' | 'idle'
  recordingDuration?: number
  recordedFps?: readonly number[]
  recordedDroppedFrames?: number | null
  recording?: boolean
  recordingSecondsLeft?: number
  pressureOptions?: readonly number[]
  activePressure?: number
}

const props = withDefaults(defineProps<Props>(), {
  status: 'idle',
  recordingDuration: 5,
  recordedFps: () => [],
  recordedDroppedFrames: null,
  recording: false,
  recordingSecondsLeft: 0,
  pressureOptions: () => [],
  activePressure: undefined,
})

const emit = defineEmits<{
  'add-animation': []
  'clear-animations': []
  record: []
  'change-pressure': [duration: number]
}>()

function getFpsLevel(fps: number) {
  if (fps > 55) {
    return 'is-good'
  }

  if (fps >= 30) {
    return 'is-warning'
  }

  return 'is-danger'
}
</script>

<template>
  <aside class="performance-panel" aria-label="动画性能监控">
    <div class="performance-panel__header">
      <span>PERFORMANCE</span>
      <strong :class="{ 'is-running': props.status === 'running' }">
        {{ props.status === 'running' ? 'RUNNING' : 'IDLE' }}
      </strong>
    </div>

    <dl class="performance-panel__metrics" aria-live="polite">
      <div>
        <dt>实时 FPS</dt>
        <dd :class="getFpsLevel(props.snapshot.fps)">{{ props.snapshot.fps }}</dd>
      </div>
    </dl>

    <div class="performance-panel__animation-actions" aria-label="动画控制">
      <button type="button" @click="emit('add-animation')">增加动画</button>
      <button type="button" @click="emit('clear-animations')">取消所有动画</button>
    </div>

    <div class="performance-panel__history">
      <div class="performance-panel__history-header">
        <span>触发后 {{ props.recordingDuration }} 秒 FPS</span>
        <button type="button" :disabled="props.recording" @click="emit('record')">
          {{ props.recording ? `记录中 ${props.recordingSecondsLeft}s` : '记录' }}
        </button>
      </div>
      <div v-if="props.recordedFps.length === 0" class="performance-panel__history-empty">
        {{
          props.recording
            ? '正在采集触发后的 FPS…'
            : `点击“记录”后采集 ${props.recordingDuration} 秒`
        }}
      </div>
      <div v-else class="performance-panel__history-list" aria-live="polite">
        <div v-for="(fps, index) in props.recordedFps" :key="index">
          <span>第 {{ index + 1 }} 秒</span>
          <i>
            <b :class="getFpsLevel(fps)" :style="{ width: `${(Math.min(fps, 60) / 60) * 100}%` }" />
          </i>
          <strong :class="getFpsLevel(fps)">{{ fps }} FPS</strong>
        </div>
        <div class="performance-panel__recorded-drops">
          <span>{{ props.recordingDuration }} 秒累计掉帧</span>
          <strong>{{ props.recordedDroppedFrames ?? 0 }} 帧</strong>
        </div>
      </div>
    </div>

    <div v-if="props.pressureOptions.length > 0" class="performance-panel__pressure">
      <span>循环宏附加任务</span>
      <div>
        <button
          v-for="duration in props.pressureOptions"
          :key="duration"
          type="button"
          :class="{ 'is-active': props.activePressure === duration }"
          @click="emit('change-pressure', duration)"
        >
          {{ duration }}ms
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.performance-panel {
  backdrop-filter: blur(12px);
  background: rgb(5 24 17 / 94%);
  border: 1px solid #17653f;
  border-radius: 8px;
  box-shadow:
    0 16px 40px rgb(0 0 0 / 35%),
    inset 0 1px rgb(83 255 162 / 10%);
  color: #d8ffe8;
  padding: 10px 12px;
  position: fixed;
  right: 18px;
  top: 76px;
  width: 220px;
  z-index: 1200;
}

.performance-panel__header {
  align-items: center;
  display: flex;
  font-family: monospace;
  justify-content: space-between;
  letter-spacing: 0.08em;
}

.performance-panel__header span {
  color: #75c999;
  font-size: 10px;
}

.performance-panel__header strong {
  color: #609879;
  font-size: 9px;
}

.performance-panel__header strong.is-running {
  color: #43f58d;
}

.performance-panel__metrics {
  display: grid;
  gap: 5px;
  margin: 9px 0;
}

.performance-panel__metrics div {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
}

.performance-panel__metrics dt {
  color: #75c999;
  font-size: 11px;
}

.performance-panel__metrics dd {
  font-family: monospace;
  font-size: 13px;
  margin: 0;
}

.performance-panel__animation-actions {
  display: grid;
  gap: 6px;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 8px;
}

.performance-panel__animation-actions button {
  background: #123d29;
  border: 1px solid #257d50;
  border-radius: 4px;
  color: #8dffbd;
  cursor: pointer;
  font: 10px monospace;
  padding: 6px 4px;
}

.performance-panel__animation-actions button:hover {
  background: #17653f;
  color: #e7fff1;
}

.performance-panel__history {
  border-top: 1px solid #174d34;
  padding-top: 8px;
}

.performance-panel__history-header {
  align-items: center;
  color: #75c999;
  display: flex;
  font-size: 10px;
  justify-content: space-between;
  margin-bottom: 5px;
}

.performance-panel__history-header button {
  background: #123d29;
  border: 1px solid #257d50;
  border-radius: 4px;
  color: #8dffbd;
  cursor: pointer;
  font: 10px monospace;
  min-width: 58px;
  padding: 3px 5px;
}

.performance-panel__history-header button:disabled {
  cursor: default;
  opacity: 0.65;
}

.performance-panel__history-empty {
  align-items: center;
  background: #071d14;
  border: 1px solid #174d34;
  color: #4f8768;
  display: grid;
  font-size: 10px;
  min-height: 36px;
  place-items: center;
}

.performance-panel__history-list {
  display: grid;
  gap: 2px;
}

.performance-panel__history-list > div {
  align-items: center;
  display: grid;
  font: 9px monospace;
  gap: 4px;
  grid-template-columns: 34px minmax(0, 1fr) 42px;
  min-height: 17px;
}

.performance-panel__history-list span {
  color: #609879;
}

.performance-panel__history-list i {
  background: #0b2c1d;
  height: 5px;
  overflow: hidden;
}

.performance-panel__history-list b {
  display: block;
  height: 100%;
}

.performance-panel__history-list strong {
  font-weight: 500;
  text-align: right;
}

.performance-panel__history-list .performance-panel__recorded-drops {
  border-top: 1px solid #174d34;
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
  padding-top: 5px;
}

.performance-panel__recorded-drops span {
  color: #75c999;
}

.performance-panel__recorded-drops strong {
  color: #d8ffe8;
}

.is-good {
  color: #43f58d;
}

.is-warning {
  color: #ffd65a;
}

.is-danger {
  color: #ff5d68;
}

.performance-panel__history-list b.is-good {
  background: linear-gradient(90deg, #1cb867, #63ffab);
}

.performance-panel__history-list b.is-warning {
  background: linear-gradient(90deg, #c68b13, #ffd65a);
}

.performance-panel__history-list b.is-danger {
  background: linear-gradient(90deg, #b52f3a, #ff5d68);
}

.performance-panel__pressure {
  border-top: 1px solid #174d34;
  margin-top: 8px;
  padding-top: 8px;
}

.performance-panel__pressure > span {
  color: #75c999;
  display: block;
  font-size: 10px;
  margin-bottom: 5px;
}

.performance-panel__pressure > div {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}

.performance-panel__pressure button {
  background: transparent;
  border: 1px solid #17653f;
  color: #75c999;
  cursor: pointer;
  font: 9px monospace;
  padding: 5px 2px;
}

.performance-panel__pressure button + button {
  border-left: 0;
}

.performance-panel__pressure button:first-child {
  border-radius: 4px 0 0 4px;
}

.performance-panel__pressure button:last-child {
  border-radius: 0 4px 4px 0;
}

.performance-panel__pressure button.is-active {
  background: #17653f;
  color: #e7fff1;
}

@media (max-width: 760px) {
  .performance-panel {
    right: 10px;
    top: 64px;
    width: 190px;
  }
}
</style>
