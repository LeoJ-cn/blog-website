import type { FramePerformanceMonitor, FramePerformanceSnapshot } from '@blog/monitoring'
import { onUnmounted, readonly, ref, type Ref } from 'vue'

const DEFAULT_RECORDING_DURATION = 5

export interface UsePerformancePanelOptions {
  recordingDuration?: number
}

export interface UsePerformancePanelResult {
  snapshot: Readonly<Ref<FramePerformanceSnapshot>>
  recordedSnapshots: Readonly<Ref<readonly FramePerformanceSnapshot[]>>
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
  const recordedSnapshots = ref<FramePerformanceSnapshot[]>([])
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

    const pendingSnapshots: FramePerformanceSnapshot[] = []

    recordedSnapshots.value = []
    recording.value = true
    recordingSecondsLeft.value = recordingDuration

    recordingTimer = window.setInterval(() => {
      pendingSnapshots.push({
        ...snapshot.value,
        sample: { ...snapshot.value.sample },
        target: snapshot.value.target ? { ...snapshot.value.target } : null,
        longAnimationFrames: snapshot.value.longAnimationFrames
          ? { ...snapshot.value.longAnimationFrames }
          : null,
      })
      recordingSecondsLeft.value -= 1

      if (recordingSecondsLeft.value > 0) {
        return
      }

      recordedSnapshots.value = pendingSnapshots
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
    recordedSnapshots: readonly(recordedSnapshots),
    recording: readonly(recording),
    recordingSecondsLeft: readonly(recordingSecondsLeft),
    startRecording,
  }
}
