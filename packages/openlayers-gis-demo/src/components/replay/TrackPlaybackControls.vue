<script setup lang="ts">
import type { TrackPlaybackSpeed, TrackPlaybackStatus } from '../../types/track'
import { formatTrackGridLabel } from '../../composables/useTrackPlayback'

defineProps<{
  speed: TrackPlaybackSpeed
  status: TrackPlaybackStatus
  formattedTime: string
  progressPercent: number
  activeSequence: number
  checkpointCount: number
}>()

const emit = defineEmits<{
  play: []
  pause: []
  reset: []
  changeSpeed: [speed: TrackPlaybackSpeed]
  /** progressPercent 是闭区间 [0, 100] 的百分比。 */
  seek: [progressPercent: number]
  /** sequence 是从 0 开始的轨迹节点序号。 */
  seekCheckpoint: [sequence: number]
}>()
</script>

<template>
  <div class="track-controls">
    <strong>轨迹回放</strong>
    <button type="button" @click="emit('play')">播放</button>
    <button type="button" @click="emit('pause')">暂停</button>
    <button type="button" @click="emit('reset')">重置</button>
    <div class="track-timeline">
      <input class="track-progress" type="range" min="0" max="100" step="0.1" :value="progressPercent" aria-label="巡检轨迹播放进度" @input="emit('seek', Number(($event.currentTarget as HTMLInputElement).value))" />
      <div class="track-checkpoints" aria-label="巡检网格节点快捷跳转">
        <button v-for="sequence in checkpointCount" :key="sequence - 1" type="button" :class="{ active: sequence - 1 === activeSequence, visited: sequence - 1 < activeSequence }" :aria-label="`跳转到 ${formatTrackGridLabel(sequence - 1)}，第 ${sequence} 个节点`" @click="emit('seekCheckpoint', sequence - 1)">{{ sequence }}</button>
      </div>
    </div>
    <button v-for="candidate in ([1, 2, 8] as const)" :key="candidate" type="button" :class="{ active: speed === candidate }" @click="emit('changeSpeed', candidate)">{{ candidate }}x</button>
    <div class="track-playback-meta" aria-live="off">
      <span>当前巡检时间： <b>{{ formattedTime }}</b></span>
      <span>状态： <b>{{ status }}</b></span>
    </div>
  </div>
</template>

<style scoped>
.track-controls { min-height: 46px; display: flex; gap: 8px; align-items: center; padding: 0 16px; border-top: 1px solid #20314c; background: #0a1322; font-size: 12px; }
.track-controls button { padding: 6px 10px; border: 1px solid #2a3d5c; border-radius: 5px; background: #111e32; color: #94a3b8; cursor: pointer; }
.track-controls button.active { border-color: #38bdf8; color: #7dd3fc; background: #0c2d46; }
.track-progress { width: 100%; margin: 0; accent-color: #38bdf8; }
.track-timeline { flex: 1 1 260px; display: flex; flex-direction: column; gap: 2px; min-width: 220px; padding: 4px 8px 2px; }
.track-checkpoints { display: flex; justify-content: space-between; }
.track-checkpoints button { width: 16px; height: 16px; padding: 0; color: #64748b; background: #111827; border: 1px solid #4c1d95; border-radius: 50%; font-size: 8px; line-height: 14px; }
.track-checkpoints button.visited { color: #ede9fe; background: #6d28d9; border-color: #a78bfa; }
.track-checkpoints button.active { color: #1c1917; background: #fbbf24; border-color: #fef3c7; box-shadow: 0 0 0 3px #fbbf2433; }
.track-playback-meta { flex: 0 0 250px; display: flex; justify-content: flex-end; gap: 18px; min-width: 0; color: #71809a; white-space: nowrap; }
.track-playback-meta span { margin-left: 0; }
.track-playback-meta b { display: inline-block; min-width: 54px; color: #94a3b8; font-weight: 500; font-variant-numeric: tabular-nums; }
.track-playback-meta span:last-child b { min-width: 48px; }
</style>
