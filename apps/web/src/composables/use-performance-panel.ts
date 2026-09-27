import type { FramePerformanceMonitor, FramePerformanceSnapshot } from '@blog/monitoring'
import { onUnmounted, readonly, ref, type Ref } from 'vue'

const DEFAULT_RECORDING_DURATION = 5

export interface UsePerformancePanelOptions {
  recordingDuration?: number
}

export interface UsePerformancePanelResult {
  snapshot: Readonly<Ref<FramePerformanceSnapshot>>
  recordedFps: Readonly<Ref<readonly number[]>>
  recordedDroppedFrames: Readonly<Ref<number | null>>
  recording: Readonly<Ref<boolean>>
  recordingSecondsLeft: Readonly<Ref<number>>
  startRecording: () => void
}

export function usePerformancePanel(
  monitor: FramePerformanceMonitor,
  options: UsePerformancePanelOptions = {},
): UsePerformancePanelResult {
  const recordingDuration = Math.max(
    1,
    Math.floor(options.recordingDuration ?? DEFAULT_RECORDING_DURATION),
  )
  const snapshot = ref<FramePerformanceSnapshot>(monitor.getSnapshot())
  const recordedFps = ref<number[]>([])
  const recordedDroppedFrames = ref<number | null>(null)
  const recording = ref(false)
  const recordingSecondsLeft = ref(0)
  let recordingTimer: number | null = null

  const unsubscribe = monitor.subscribe((nextSnapshot) => {
    snapshot.value = nextSnapshot
  })

  function clearRecordingTimer() {
    if (recordingTimer === null) {
      return
    }

    window.clearInterval(recordingTimer)
    recordingTimer = null
  }

  function startRecording() {
    clearRecordingTimer()

    const pendingFps: number[] = []
    const droppedFramesStart = snapshot.value.droppedFrames

    recordedFps.value = []
    recordedDroppedFrames.value = null
    recording.value = true
    recordingSecondsLeft.value = recordingDuration

    recordingTimer = window.setInterval(() => {
      pendingFps.push(snapshot.value.fps)
      recordingSecondsLeft.value -= 1

      if (recordingSecondsLeft.value > 0) {
        return
      }

      recordedFps.value = pendingFps
      recordedDroppedFrames.value = Math.max(
        0,
        snapshot.value.droppedFrames - droppedFramesStart,
      )
      recording.value = false
      clearRecordingTimer()
    }, 1000)
  }

  onUnmounted(() => {
    unsubscribe()
    clearRecordingTimer()
  })

  return {
    snapshot: readonly(snapshot),
    recordedFps: readonly(recordedFps),
    recordedDroppedFrames: readonly(recordedDroppedFrames),
    recording: readonly(recording),
    recordingSecondsLeft: readonly(recordingSecondsLeft),
    startRecording,
  }
}
