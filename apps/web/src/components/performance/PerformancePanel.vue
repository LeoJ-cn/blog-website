<script setup lang="ts">
import { createFramePerformanceMonitor } from '@blog/monitoring'
import { onUnmounted, ref } from 'vue'
import { usePerformancePanel } from '../../composables/use-performance-panel'
import {
  CPU_PRESSURE_OPTIONS,
  createPerformanceSimulationManager,
} from './performance-simulation-manager'

interface Props {
  recordingDuration?: number
}

const props = withDefaults(defineProps<Props>(), {
  recordingDuration: 5,
})
const framePerformanceMonitor = createFramePerformanceMonitor({ targetFps: 60 })
const simulationManager = createPerformanceSimulationManager()
const simulationState = ref(simulationManager.getState())
const minimized = ref(false)
const { snapshot, recordedSnapshots, recording, recordingSecondsLeft, startRecording } =
  usePerformancePanel(framePerformanceMonitor, {
    recordingDuration: props.recordingDuration,
  })
const unsubscribeSimulationState = simulationManager.subscribe((state) => {
  simulationState.value = state
})
defineExpose({ startRecording })

onUnmounted(() => {
  unsubscribeSimulationState()
  simulationManager.clear()
})

function getFpsLevel(fps: number) {
  if (fps > 55) {
    return 'is-good'
  }

  if (fps >= 30) {
    return 'is-warning'
  }

  return 'is-danger'
}

function getFrameIntervalLevel(interval: number) {
  if (interval <= 0) {
    return undefined
  }

  if (interval <= 16.7) {
    return 'is-good'
  }

  if (interval <= 33.3) {
    return 'is-warning'
  }

  return 'is-danger'
}
</script>

<template>
  <aside
    class="performance-panel"
    :class="{ 'performance-panel--minimized': minimized }"
    aria-label="动画性能监控"
  >
    <div class="performance-panel__header">
      <span>PERFORMANCE</span>
      <div class="performance-panel__header-actions">
        <b v-if="minimized" :class="getFpsLevel(snapshot.sample.fps)">
          {{ snapshot.sample.fps }} FPS
        </b>
        <strong :class="{ 'is-running': simulationState.runningBoxes > 0 }">
          {{ simulationState.runningBoxes > 0 ? 'RUNNING' : 'IDLE' }}
        </strong>
        <button
          type="button"
          :aria-expanded="!minimized"
          :aria-label="minimized ? '展开性能面板' : '最小化性能面板'"
          @click="minimized = !minimized"
        >
          {{ minimized ? '展开' : '最小化' }}
        </button>
      </div>
    </div>

    <div v-if="!minimized" class="performance-panel__body">
      <dl class="performance-panel__metrics" aria-live="polite">
      <div>
        <dt>实时 FPS</dt>
        <dd data-testid="performance-fps" :class="getFpsLevel(snapshot.sample.fps)">
          {{ snapshot.sample.fps }}
        </dd>
      </div>
      <div>
        <dt>P95 帧间隔</dt>
        <dd
          data-testid="performance-p95"
          :class="getFrameIntervalLevel(snapshot.sample.p95FrameInterval)"
        >
          {{ snapshot.sample.p95FrameInterval.toFixed(1) }}ms
        </dd>
      </div>
      <!-- <div>
        <dt>最大帧间隔</dt>
        <dd data-testid="performance-max-interval">
          {{ snapshot.sample.maxFrameInterval.toFixed(1) }}ms
        </dd>
      </div> -->
      <div v-if="snapshot.target">
        <dt>{{ snapshot.target.fps }} FPS 目标</dt>
        <dd data-testid="performance-target-rate">
          {{ Math.round(snapshot.target.achievementRate * 100) }}%
        </dd>
      </div>
      <div v-if="snapshot.target">
        <dt>未达目标帧</dt>
        <dd data-testid="performance-missed-frames">{{ snapshot.target.missedFrames }}</dd>
      </div>
      <div v-if="snapshot.longAnimationFrames">
        <dt>LoAF / 阻塞</dt>
        <dd data-testid="performance-loaf">
          {{ snapshot.longAnimationFrames.count }} /
          {{ snapshot.longAnimationFrames.totalBlockingDuration.toFixed(1) }}ms
        </dd>
      </div>
      </dl>

      <div class="performance-panel__history">
      <div class="performance-panel__history-header">
        <span>触发后 {{ props.recordingDuration }} 秒性能</span>
        <button type="button" :disabled="recording" @click="startRecording">
          {{ recording ? `记录中 ${recordingSecondsLeft}s` : '记录' }}
        </button>
      </div>
      <div v-if="recordedSnapshots.length === 0" class="performance-panel__history-empty">
        {{ recording ? '正在采集完整性能窗口…' : `点击“记录”后采集 ${props.recordingDuration} 秒` }}
      </div>
      <div v-else class="performance-panel__history-table-wrap" aria-live="polite">
        <table class="performance-panel__history-table">
          <thead>
            <tr>
              <th scope="col">秒</th>
              <th scope="col" title="平均 FPS">FPS</th>
              <th scope="col" title="P95 帧间隔">P95</th>
              <th scope="col" title="60 FPS 目标达成率">目标</th>
              <th scope="col" title="未达目标帧">未达</th>
              <th scope="col" title="LoAF 次数 / 阻塞时长">LoAF</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(recordedSnapshot, index) in recordedSnapshots" :key="index">
              <th scope="row">{{ index + 1 }}s</th>
              <td :class="getFpsLevel(recordedSnapshot.sample.fps)">
                {{ recordedSnapshot.sample.fps }}
              </td>
              <td :class="getFrameIntervalLevel(recordedSnapshot.sample.p95FrameInterval)">
                {{ recordedSnapshot.sample.p95FrameInterval.toFixed(1) }}
              </td>
              <td>
                {{
                  recordedSnapshot.target
                    ? `${Math.round(recordedSnapshot.target.achievementRate * 100)}%`
                    : '—'
                }}
              </td>
              <td>{{ recordedSnapshot.target?.missedFrames ?? '—' }}</td>
              <td
                :title="
                  recordedSnapshot.longAnimationFrames
                    ? `${recordedSnapshot.longAnimationFrames.count} 次 / ${recordedSnapshot.longAnimationFrames.totalBlockingDuration.toFixed(1)}ms`
                    : undefined
                "
              >
                {{
                  recordedSnapshot.longAnimationFrames
                    ? `${recordedSnapshot.longAnimationFrames.count}/${Math.round(recordedSnapshot.longAnimationFrames.totalBlockingDuration)}ms`
                    : '—'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>

      <div class="performance-panel__simulation">
      <span class="performance-panel__section-title">压力模拟</span>
      <div class="performance-panel__animation-actions" aria-label="动画控制">
        <button type="button" @click="simulationManager.create()">增加动画</button>
        <button type="button" @click="simulationManager.clear()">取消所有动画</button>
      </div>

      <div class="performance-panel__pressure">
        <div class="performance-panel__pressure-header">
          <span>动画附加任务</span>
          <button
            type="button"
            role="switch"
            :aria-checked="simulationState.cpuTaskEnabled"
            :disabled="simulationState.runningBoxes === 0"
            :class="{ 'is-active': simulationState.cpuTaskEnabled }"
            @click="simulationManager.setCpuTaskEnabled(!simulationState.cpuTaskEnabled)"
          >
            {{ simulationState.cpuTaskEnabled ? '开启' : '关闭' }}
          </button>
        </div>
        <small v-if="simulationState.runningBoxes === 0">请先增加动画</small>
        <div class="performance-panel__pressure-options">
          <button
            v-for="duration in CPU_PRESSURE_OPTIONS"
            :key="duration"
            type="button"
            :class="{ 'is-active': simulationState.cpuWorkMs === duration }"
            :disabled="simulationState.runningBoxes === 0 || !simulationState.cpuTaskEnabled"
            @click="simulationManager.setCpuWorkMs(duration)"
          >
            {{ duration }}ms
          </button>
        </div>
      </div>
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
  box-sizing: border-box;
  color: #d8ffe8;
  padding: 8px 10px;
  position: fixed;
  right: 18px;
  top: 76px;
  max-width: calc(100vw - 36px);
  width: 300px;
  z-index: 1200;
}

.performance-panel--minimized {
  width: 220px;
}

.performance-panel__header {
  align-items: center;
  display: flex;
  font-family: monospace;
  justify-content: space-between;
  letter-spacing: 0.08em;
}

.performance-panel__header-actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.performance-panel__header-actions b {
  font: 11px monospace;
  letter-spacing: 0;
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

.performance-panel__header button {
  background: transparent;
  border: 1px solid #257d50;
  border-radius: 3px;
  color: #75c999;
  cursor: pointer;
  font: 9px monospace;
  padding: 2px 5px;
}

.performance-panel__header button:hover {
  background: #123d29;
  color: #d8ffe8;
}

.performance-panel__metrics {
  display: grid;
  gap: 5px;
  margin: 7px 0;
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
  margin-bottom: 9px;
}

.performance-panel__animation-actions button {
  background: #102f3d;
  border: 1px solid #25758c;
  border-radius: 4px;
  color: #8de8ff;
  cursor: pointer;
  font: 10px monospace;
  padding: 6px 4px;
}

.performance-panel__animation-actions button:hover {
  background: #18566a;
  color: #effcff;
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

.performance-panel__history-table-wrap {
  overflow-x: auto;
}

.performance-panel__history-table {
  border-collapse: collapse;
  font: 9px monospace;
  min-width: 278px;
  width: 100%;
}

.performance-panel__history-table th,
.performance-panel__history-table td {
  border-bottom: 1px solid #174d34;
  padding: 4px 2px;
  text-align: center;
  white-space: nowrap;
}

.performance-panel__history-table thead th {
  color: #75c999;
  font-weight: 500;
}

.performance-panel__history-table th:first-child {
  color: #609879;
  padding-left: 0;
  text-align: left;
  width: 22px;
}

.performance-panel__history-table th:last-child,
.performance-panel__history-table td:last-child {
  padding-right: 0;
}

.performance-panel__history-table tbody tr:last-child th,
.performance-panel__history-table tbody tr:last-child td {
  border-bottom: 0;
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

.performance-panel__simulation {
  border-top: 1px solid #174d34;
  margin-top: 8px;
  padding-top: 8px;
}

.performance-panel__section-title {
  color: #75c999;
  display: block;
  font-size: 10px;
  letter-spacing: 0.08em;
  margin-bottom: 7px;
}

.performance-panel__pressure {
  border: 1px solid #6d4b1c;
  border-radius: 5px;
  padding: 7px;
}

.performance-panel__pressure-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.performance-panel__pressure-header > span {
  color: #e6a84d;
  font-size: 10px;
}

.performance-panel__pressure-header > button {
  background: #312510;
  border: 1px solid #8b6123;
  border-radius: 999px;
  color: #ba8b47;
  cursor: pointer;
  font: 9px monospace;
  min-width: 38px;
  padding: 3px 6px;
}

.performance-panel__pressure-header > button.is-active {
  background: #9a5c10;
  color: #fff2d5;
}

.performance-panel__pressure-header > button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.performance-panel__pressure small {
  color: #806b4b;
  display: block;
  font: 9px monospace;
  margin-top: 4px;
}

.performance-panel__pressure-options {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  margin-top: 6px;
}

.performance-panel__pressure-options button {
  background: transparent;
  border: 1px solid #8b6123;
  color: #d59b45;
  cursor: pointer;
  font: 9px monospace;
  padding: 5px 2px;
}

.performance-panel__pressure-options button + button {
  border-left: 0;
}

.performance-panel__pressure-options button:first-child {
  border-radius: 4px 0 0 4px;
}

.performance-panel__pressure-options button:last-child {
  border-radius: 0 4px 4px 0;
}

.performance-panel__pressure-options button.is-active {
  background: #9a5c10;
  color: #fff2d5;
}

.performance-panel__pressure-options button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

@media (max-width: 760px) {
  .performance-panel {
    right: 10px;
    top: 64px;
    width: 190px;
  }
}
</style>
